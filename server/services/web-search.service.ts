
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import pLimit from 'p-limit';
import { BaseSearchEngine } from './search-engines/base-search-engine';
import { TavilySearchEngine } from './search-engines/tavily-search';
import { BraveSearchEngine } from './search-engines/brave-search';
import { SearchOptions, SearchResult, WebSearchResponse } from '../../types/web-search.types';

export class WebSearchService {
  private searchEngines: BaseSearchEngine[] = [];
  private cache: LRUCache<string, WebSearchResponse>;
  private concurrencyLimit = pLimit(2);
  private metrics = {
    totalSearches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    engineUsage: new Map<string, number>(),
    engineSuccesses: new Map<string, number>(),
    errors: new Map<string, number>(),
    averageResponseTime: 0,
    responseTimes: [] as number[]
  };

  constructor() {
    this.initializeSearchEngines();
    this.cache = new LRUCache<string, WebSearchResponse>({
      max: 200,
      ttl: 10 * 60 * 1000, // 10 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
  }

  private initializeSearchEngines() {
    const tavilyKey = process.env.TAVILY_API_KEY;
    const braveKey = process.env.BRAVE_API_KEY;

    if (tavilyKey) {
      this.searchEngines.push(new TavilySearchEngine(tavilyKey));
      console.log('✓ Tavily search engine initialized');
    } else {
      console.warn('⚠ Tavily API key not found');
    }

    if (braveKey) {
      this.searchEngines.push(new BraveSearchEngine(braveKey));
      console.log('✓ Brave search engine initialized');
    } else {
      console.warn('⚠ Brave API key not found');
    }

    // Sort by priority
    this.searchEngines.sort((a, b) => a.getPriority() - b.getPriority());
    
    if (this.searchEngines.length === 0) {
      console.error('❌ No search engines available. Please configure API keys.');
    } else {
      console.log(`✓ Web search service initialized with ${this.searchEngines.length} engines`);
    }
  }

  async search(
    query: string,
    maxResults = 10,
    options: SearchOptions = {}
  ): Promise<WebSearchResponse> {
    const startTime = Date.now();
    this.metrics.totalSearches++;

    // Validate inputs
    if (!query?.trim()) {
      throw new Error('Query cannot be empty');
    }

    if (maxResults < 1 || maxResults > 50) {
      throw new Error('maxResults must be between 1 and 50');
    }

    // Check cache
    const cacheKey = this.getCacheKey(query, maxResults, options);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      console.log(`🎯 Cache hit for query: "${query}"`);
      return { ...cached, cached: true };
    }
    this.metrics.cacheMisses++;

    // Select search engines
    const selectedEngines = this.selectEngines(options.searchEngines);
    if (selectedEngines.length === 0) {
      throw new Error('No search engines available');
    }

    console.log(`🔍 Searching "${query}" with engines: ${selectedEngines.map(e => e.getName()).join(', ')}`);

    // Perform searches
    const searchPromises = selectedEngines.map(engine =>
      this.concurrencyLimit(() => 
        this.searchWithEngine(engine, query, { ...options, maxResults })
      )
    );

    const searchResults = await Promise.allSettled(searchPromises);
    
    // Collect and merge results
    const allResults: SearchResult[] = [];
    const usedEngines: string[] = [];

    searchResults.forEach((result, index) => {
      const engine = selectedEngines[index];
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allResults.push(...result.value);
        usedEngines.push(engine.getName());
        this.updateEngineMetrics(engine.getName(), true, result.value.length);
      } else {
        this.updateEngineMetrics(engine.getName(), false, 0);
        if (result.status === 'rejected') {
          console.error(`❌ [${engine.getName()}] Search failed:`, result.reason);
        }
      }
    });

    // Process results
    const processedResults = this.processResults(allResults, maxResults);
    const processingTime = Date.now() - startTime;

    // Update metrics
    this.updateResponseTimeMetrics(processingTime);

    const response: WebSearchResponse = {
      results: processedResults,
      query,
      totalResults: processedResults.length,
      searchEnginesUsed: usedEngines,
      processingTime,
      timestamp: new Date().toISOString()
    };

    // Cache the response
    this.cache.set(cacheKey, response);

    console.log(`✅ Search completed: ${processedResults.length} results in ${processingTime}ms`);
    return response;
  }

  private async searchWithEngine(
    engine: BaseSearchEngine,
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      const results = await engine.search(query, options);
      console.log(`📊 [${engine.getName()}] Found ${results.length} results`);
      return results;
    } catch (error) {
      this.metrics.errors.set(
        engine.getName(),
        (this.metrics.errors.get(engine.getName()) || 0) + 1
      );
      console.error(`❌ [${engine.getName()}] Search error:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private selectEngines(requestedEngines?: string[]): BaseSearchEngine[] {
    if (!requestedEngines || requestedEngines.length === 0) {
      return this.searchEngines.filter(engine => engine.isAvailable());
    }

    const requested = new Set(requestedEngines.map(e => e.toLowerCase()));
    return this.searchEngines.filter(engine =>
      engine.isAvailable() && requested.has(engine.getName().toLowerCase())
    );
  }

  private processResults(results: SearchResult[], maxResults: number): SearchResult[] {
    // Remove duplicates
    const uniqueResults = this.removeDuplicates(results);
    
    // Score and rank results
    const scoredResults = this.scoreResults(uniqueResults);
    
    // Sort by score (descending)
    scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return scoredResults.slice(0, maxResults);
  }

  private removeDuplicates(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();
    
    results.forEach(result => {
      const key = this.normalizeUrl(result.url);
      const existing = seen.get(key);
      
      // Keep the result with the highest score
      if (!existing || (result.score || 0) > (existing.score || 0)) {
        seen.set(key, result);
      }
    });
    
    return Array.from(seen.values());
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase();
    }
  }

  private scoreResults(results: SearchResult[]): SearchResult[] {
    const engineBoost: Record<string, number> = {
      'Tavily': 1.1,
      'Brave': 1.0
    };

    return results.map(result => ({
      ...result,
      score: (result.score || 0.5) * (engineBoost[result.source] || 1.0)
    }));
  }

  private getCacheKey(query: string, maxResults: number, options: SearchOptions): string {
    const data = `${query.toLowerCase().trim()}:${maxResults}:${JSON.stringify(options)}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private updateEngineMetrics(engineName: string, success: boolean, resultCount: number) {
    this.metrics.engineUsage.set(
      engineName,
      (this.metrics.engineUsage.get(engineName) || 0) + 1
    );

    if (success) {
      this.metrics.engineSuccesses.set(
        engineName,
        (this.metrics.engineSuccesses.get(engineName) || 0) + 1
      );
    }
  }

  private updateResponseTimeMetrics(responseTime: number) {
    this.metrics.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }
    
    // Calculate average
    this.metrics.averageResponseTime = 
      this.metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
      this.metrics.responseTimes.length;
  }

  getMetrics() {
    const engineUsage = Object.fromEntries(this.metrics.engineUsage);
    const engineSuccesses = Object.fromEntries(this.metrics.engineSuccesses);
    const errors = Object.fromEntries(this.metrics.errors);

    // Calculate success rates
    const engineSuccessRates: Record<string, number> = {};
    for (const [engine, total] of this.metrics.engineUsage) {
      const successes = this.metrics.engineSuccesses.get(engine) || 0;
      engineSuccessRates[engine] = total > 0 ? successes / total : 0;
    }

    return {
      totalSearches: this.metrics.totalSearches,
      cacheHitRate: this.metrics.totalSearches > 0
        ? this.metrics.cacheHits / this.metrics.totalSearches
        : 0,
      cacheSize: this.cache.size,
      maxCacheSize: this.cache.max,
      engineUsage,
      engineSuccessRates,
      errors,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      availableEngines: this.searchEngines
        .filter(e => e.isAvailable())
        .map(e => e.getName()),
      totalAvailableEngines: this.searchEngines.filter(e => e.isAvailable()).length
    };
  }

  clearCache() {
    const previousSize = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared search cache (${previousSize} items)`);
    return previousSize;
  }

  getEngineStatus() {
    return this.searchEngines.map(engine => ({
      name: engine.getName(),
      available: engine.isAvailable(),
      priority: engine.getPriority(),
      rateLimitStatus: engine.getRateLimitStatus()
    }));
  }
}

// Export singleton instance
export const webSearchService = new WebSearchService();
