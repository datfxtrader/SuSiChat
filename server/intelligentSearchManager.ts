
import axios from 'axios';
import { performance } from 'perf_hooks';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  source: string;
  publishedDate?: string;
  domain?: string;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  queryNormalized: string;
}

interface RateLimitInfo {
  lastCall: number;
  callCount: number;
  backoffDelay: number;
  isBlocked: boolean;
  blockUntil: number;
  consecutiveErrors: number;
}

class IntelligentSearchManager {
  private cache = new Map<string, CacheEntry>();
  private rateLimits = new Map<string, RateLimitInfo>();
  private requestQueue = new Map<string, Promise<any>>();
  
  // Configuration - RATE LIMITING DISABLED FOR 15 DAYS
  private readonly BASE_DELAY = 0; // DISABLED
  private readonly MAX_DELAY = 0; // DISABLED
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes (reduced for fresher results)
  private readonly BLOCK_DURATION = 0; // DISABLED
  private readonly MAX_CONCURRENT_REQUESTS = 10; // INCREASED
  private readonly FALLBACK_SOURCES = ['duckduckgo', 'serp', 'newsdata'];
  
  // API Keys with validation
  private readonly TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  private readonly BRAVE_API_KEY = process.env.BRAVE_API_KEY;
  private readonly NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;

  constructor() {
    // Log available API keys for debugging (without exposing actual keys)
    console.log('Search API Status:', {
      tavily: !!this.TAVILY_API_KEY,
      brave: !!this.BRAVE_API_KEY,
      newsdata: !!this.NEWSDATA_API_KEY
    });
  }

  /**
   * Normalize query for consistent caching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate cache key
   */
  private getCacheKey(query: string, source: string): string {
    const normalized = this.normalizeQuery(query);
    return `${source}:${normalized}`;
  }

  /**
   * Check if should delay API call - DISABLED FOR 15 DAYS
   */
  private shouldDelay(apiName: string): number {
    // RATE LIMITING COMPLETELY DISABLED
    console.log(`Rate limiting DISABLED for ${apiName} - no delays applied`);
    return 0;
  }

  /**
   * Record successful API call
   */
  private recordSuccess(apiName: string): void {
    const rateInfo = this.rateLimits.get(apiName) || {
      lastCall: 0,
      callCount: 0,
      backoffDelay: this.BASE_DELAY,
      isBlocked: false,
      blockUntil: 0,
      consecutiveErrors: 0
    };

    rateInfo.lastCall = Date.now();
    rateInfo.callCount++;
    rateInfo.consecutiveErrors = 0;
    
    // Gradually reduce delay on success
    rateInfo.backoffDelay = Math.max(
      this.BASE_DELAY,
      rateInfo.backoffDelay * 0.9
    );

    this.rateLimits.set(apiName, rateInfo);
  }

  /**
   * Record rate limit or error
   */
  private recordError(apiName: string, isRateLimit: boolean = false): void {
    const rateInfo = this.rateLimits.get(apiName) || {
      lastCall: 0,
      callCount: 0,
      backoffDelay: this.BASE_DELAY,
      isBlocked: false,
      blockUntil: 0,
      consecutiveErrors: 0
    };

    rateInfo.consecutiveErrors++;
    
    if (isRateLimit) {
      // Aggressive backoff for rate limits
      rateInfo.backoffDelay = Math.min(
        this.MAX_DELAY,
        rateInfo.backoffDelay * 3
      );
      rateInfo.isBlocked = true;
      rateInfo.blockUntil = Date.now() + this.BLOCK_DURATION;
      
      console.log(`Rate limit hit for ${apiName}. Blocked until ${new Date(rateInfo.blockUntil)}`);
    } else {
      // Moderate backoff for other errors
      rateInfo.backoffDelay = Math.min(
        this.MAX_DELAY,
        rateInfo.backoffDelay * 1.5
      );
    }

    this.rateLimits.set(apiName, rateInfo);
  }

  /**
   * Get cached response if valid
   */
  private getCachedResponse(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache hit for: ${key}`);
    return entry.data;
  }

  /**
   * Cache response
   */
  private cacheResponse(key: string, data: any, ttl?: number): void {
    const normalized = this.normalizeQuery(key.split(':')[1] || key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL,
      queryNormalized: normalized
    });
  }

  /**
   * Execute API call with intelligent rate limiting and deduplication
   */
  private async executeWithRateLimit<T>(
    apiName: string,
    cacheKey: string,
    apiCall: () => Promise<T>
  ): Promise<T | null> {
    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    // Check if same request is already in progress
    const existingRequest = this.requestQueue.get(cacheKey);
    if (existingRequest) {
      console.log(`Deduplicating request for: ${cacheKey}`);
      return existingRequest;
    }

    // Check rate limit
    const delay = this.shouldDelay(apiName);
    if (delay > 0) {
      console.log(`Rate limiting ${apiName}: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Create and queue the request
    const requestPromise = (async () => {
      try {
        const result = await apiCall();
        this.recordSuccess(apiName);
        this.cacheResponse(cacheKey, result);
        return result;
      } catch (error: any) {
        const isRateLimit = error.response?.status === 429;
        this.recordError(apiName, isRateLimit);
        
        if (isRateLimit) {
          console.log(`Rate limit exceeded for ${apiName}`);
          return null;
        }
        
        console.error(`API error for ${apiName}:`, error.message);
        return null;
      } finally {
        this.requestQueue.delete(cacheKey);
      }
    })();

    this.requestQueue.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Search using Tavily
   */
  private async searchTavily(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.TAVILY_API_KEY) return [];

    const cacheKey = this.getCacheKey(query, 'tavily');
    const result = await this.executeWithRateLimit(
      'tavily',
      cacheKey,
      () => axios.post('https://api.tavily.com/search', {
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: maxResults,
        include_raw_content: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.TAVILY_API_KEY
        },
        timeout: 15000
      })
    );

    if (!result?.data?.results) return [];

    return result.data.results.map((item: any, index: number) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      content: item.content || '',
      score: item.relevance_score || (1.0 - index * 0.1),
      source: 'Tavily',
      publishedDate: item.published_date,
      domain: this.extractDomain(item.url)
    }));
  }

  /**
   * Search using Brave
   */
  private async searchBrave(query: string, maxResults: number, freshness: string = 'week'): Promise<SearchResult[]> {
    if (!this.BRAVE_API_KEY) return [];

    const freshnessMap: { [key: string]: string } = {
      'day': 'pd',
      'week': 'pw',
      'month': 'pm',
      'year': 'py'
    };

    const cacheKey = this.getCacheKey(query, `brave_${freshness}`);
    const result = await this.executeWithRateLimit(
      'brave',
      cacheKey,
      () => axios.get('https://api.search.brave.com/res/v1/web/search', {
        params: {
          q: query,
          count: maxResults,
          search_lang: 'en',
          freshness: freshnessMap[freshness] || 'pw',
          safesearch: 'moderate'
        },
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.BRAVE_API_KEY
        },
        timeout: 12000
      })
    );

    if (!result?.data?.web?.results) return [];

    return result.data.web.results.map((item: any, index: number) => ({
      title: item.title || 'Untitled',
      url: item.url || '',
      content: item.description || '',
      score: 1.0 - (index * 0.1),
      source: 'Brave',
      domain: this.extractDomain(item.url)
    }));
  }

  /**
   * Search using NewsData
   */
  private async searchNewsData(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.NEWSDATA_API_KEY) return [];

    const cacheKey = this.getCacheKey(query, 'newsdata');
    const result = await this.executeWithRateLimit(
      'newsdata',
      cacheKey,
      () => axios.get('https://newsdata.io/api/1/news', {
        params: {
          apikey: this.NEWSDATA_API_KEY,
          q: query,
          language: 'en',
          size: maxResults
        },
        timeout: 10000
      })
    );

    if (!result?.data?.results) return [];

    return result.data.results.map((item: any) => ({
      title: item.title || 'Untitled',
      url: item.link || '',
      content: item.description || '',
      score: 1.0,
      source: 'NewsData',
      publishedDate: item.pubDate,
      domain: this.extractDomain(item.link)
    })).filter((result: SearchResult) => result.url);
  }

  /**
   * Fallback search using DuckDuckGo
   */
  private async searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
    const cacheKey = this.getCacheKey(query, 'duckduckgo');
    
    try {
      const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
        timeout: 8000
      });

      const topics = response.data.RelatedTopics || [];
      return topics.slice(0, maxResults).map((topic: any) => ({
        title: topic.Text?.substring(0, 100) + '...' || 'DuckDuckGo Result',
        url: topic.FirstURL || '',
        content: topic.Text || '',
        score: 0.7,
        source: 'DuckDuckGo',
        domain: this.extractDomain(topic.FirstURL)
      })).filter((result: SearchResult) => result.url);
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return [];
    }
  }

  /**
   * Intelligent multi-source search with automatic fallbacks
   */
  async performIntelligentSearch(
    query: string,
    maxResults: number = 10,
    searchType: string = 'all',
    freshness: string = 'week'
  ): Promise<{
    results: SearchResult[];
    totalResults: number;
    searchEnginesUsed: string[];
    query: string;
    searchType: string;
    timestamp: string;
    performance: {
      searchTime: number;
      cacheHits: number;
      apiCalls: number;
    };
  }> {
    const startTime = performance.now();
    const allResults: SearchResult[] = [];
    const searchEnginesUsed: string[] = [];
    let cacheHits = 0;
    let apiCalls = 0;

    console.log(`Intelligent search: "${query}" (type: ${searchType}, max: ${maxResults})`);

    // Determine search strategy based on query type
    const isNewsQuery = /\b(news|breaking|latest|recent|today|yesterday)\b/i.test(query);
    const isFactQuery = /\b(what is|who is|when|where|how|define)\b/i.test(query);

    // Primary search sources based on query type
    const searchPromises: Promise<SearchResult[]>[] = [];

    if (searchType === 'news' || searchType === 'all' || isNewsQuery) {
      searchPromises.push(this.searchNewsData(query, Math.ceil(maxResults / 3)));
    }

    if (searchType === 'web' || searchType === 'all') {
      // For factual queries, prioritize Tavily
      if (isFactQuery || !isNewsQuery) {
        searchPromises.push(this.searchTavily(query, Math.ceil(maxResults / 2)));
      }
      
      // For recent queries, prioritize Brave
      if (isNewsQuery || freshness === 'day') {
        searchPromises.push(this.searchBrave(query, Math.ceil(maxResults / 2), freshness));
      } else {
        searchPromises.push(this.searchBrave(query, Math.ceil(maxResults / 3), freshness));
      }
    }

    // Execute primary searches in parallel
    const results = await Promise.allSettled(searchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allResults.push(...result.value);
        const sources = ['NewsData', 'Tavily', 'Brave'];
        if (sources[index]) searchEnginesUsed.push(sources[index]);
      }
    });

    // Add fallback if we don't have enough results
    if (allResults.length < Math.ceil(maxResults / 2)) {
      console.log('Adding DuckDuckGo fallback search...');
      const fallbackResults = await this.searchDuckDuckGo(query, maxResults - allResults.length);
      if (fallbackResults.length > 0) {
        allResults.push(...fallbackResults);
        searchEnginesUsed.push('DuckDuckGo');
      }
    }

    // Remove duplicates and rank results
    const uniqueResults = this.removeDuplicatesAndRank(allResults, maxResults);

    const endTime = performance.now();
    const searchTime = Math.round(endTime - startTime);

    console.log(`Search completed in ${searchTime}ms with ${uniqueResults.length} results from ${searchEnginesUsed.length} sources`);

    return {
      results: uniqueResults,
      totalResults: uniqueResults.length,
      searchEnginesUsed,
      query,
      searchType,
      timestamp: new Date().toISOString(),
      performance: {
        searchTime,
        cacheHits,
        apiCalls
      }
    };
  }

  /**
   * Remove duplicates and rank results
   */
  private removeDuplicatesAndRank(results: SearchResult[], maxResults: number): SearchResult[] {
    const seen = new Set<string>();
    const sourcePriority: { [key: string]: number } = {
      'NewsData': 5,
      'Tavily': 4,
      'Brave': 3,
      'DuckDuckGo': 2
    };

    const unique = results.filter(result => {
      if (!result.url || seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });

    // Sort by source priority and score
    unique.sort((a, b) => {
      const priorityDiff = (sourcePriority[b.source] || 1) - (sourcePriority[a.source] || 1);
      if (priorityDiff !== 0) return priorityDiff;
      return b.score - a.score;
    });

    return unique.slice(0, maxResults);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Cleanup old cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    let removedCount = 0;
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} expired entries`);
    }
  }

  /**
   * Get status of all search engines
   */
  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.rateLimits.forEach((rateInfo, apiName) => {
      status[apiName] = {
        isBlocked: rateInfo.isBlocked,
        blockUntil: rateInfo.isBlocked ? new Date(rateInfo.blockUntil) : null,
        backoffDelay: rateInfo.backoffDelay,
        lastCall: new Date(rateInfo.lastCall),
        consecutiveErrors: rateInfo.consecutiveErrors,
        callCount: rateInfo.callCount
      };
    });

    status.cache = {
      size: this.cache.size,
      maxSize: 1000
    };

    return status;
  }
}

// Global singleton instance
export const intelligentSearchManager = new IntelligentSearchManager();

// Cleanup cache every 15 minutes
setInterval(() => {
  intelligentSearchManager.cleanupCache();
}, 15 * 60 * 1000);

export default intelligentSearchManager;
