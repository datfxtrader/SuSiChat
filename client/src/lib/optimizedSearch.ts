
import axios from 'axios';

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  source: string;
  publishedDate?: string;
  domain?: string;
}

interface SearchResponse {
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
}

interface SearchStatus {
  [engine: string]: {
    isBlocked: boolean;
    blockUntil: Date | null;
    backoffDelay: number;
    lastCall: Date;
    consecutiveErrors: number;
    callCount: number;
  };
  cache: {
    size: number;
    maxSize: number;
  };
}

class OptimizedSearchClient {
  private baseURL: string;
  private cache = new Map<string, { data: SearchResponse; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Normalize query for consistent caching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Get cache key
   */
  private getCacheKey(query: string, searchType: string, maxResults: number): string {
    const normalized = this.normalizeQuery(query);
    return `${normalized}:${searchType}:${maxResults}`;
  }

  /**
   * Perform optimized search with client-side caching
   */
  async search(
    query: string,
    options: {
      maxResults?: number;
      searchType?: 'web' | 'news' | 'all';
      freshness?: 'day' | 'week' | 'month' | 'year';
      useCache?: boolean;
    } = {}
  ): Promise<SearchResponse> {
    const {
      maxResults = 10,
      searchType = 'all',
      freshness = 'week',
      useCache = true
    } = options;

    // Check client-side cache first
    if (useCache) {
      const cacheKey = this.getCacheKey(query, searchType, maxResults);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('Using client-side cache for search:', query);
        return cached.data;
      }
    }

    try {
      console.log(`Performing optimized search: "${query}" (${searchType})`);
      
      const response = await axios.post(`${this.baseURL}/api/enhanced-web-search/search`, {
        query,
        maxResults,
        searchType,
        freshness
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data: SearchResponse = response.data;

      // Cache successful results
      if (useCache && data.results.length > 0) {
        const cacheKey = this.getCacheKey(query, searchType, maxResults);
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        // Cleanup old cache entries
        this.cleanupCache();
      }

      console.log(`Search completed: ${data.results.length} results in ${data.performance.searchTime}ms`);
      return data;

    } catch (error) {
      console.error('Search error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Search rate limit exceeded. Please wait a moment and try again.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Search request timed out. Please try again.');
        }
      }
      
      throw new Error('Search failed. Please try again.');
    }
  }

  /**
   * Get search system status
   */
  async getStatus(): Promise<SearchStatus> {
    try {
      const response = await axios.get(`${this.baseURL}/api/enhanced-web-search/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get search status:', error);
      throw new Error('Failed to get search status');
    }
  }

  /**
   * Clear client-side cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Client-side search cache cleared');
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`Client cache cleanup: removed ${removedCount} expired entries`);
    }

    // Limit cache size
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - 100);
      toRemove.forEach(([key]) => this.cache.delete(key));
      
      console.log(`Client cache size limited: removed ${toRemove.length} old entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxAge: number } {
    const now = Date.now();
    let maxAge = 0;

    this.cache.forEach(entry => {
      const age = now - entry.timestamp;
      if (age > maxAge) maxAge = age;
    });

    return {
      size: this.cache.size,
      maxAge: Math.round(maxAge / 1000) // in seconds
    };
  }
}

// Global instance
export const optimizedSearchClient = new OptimizedSearchClient();

export default optimizedSearchClient;
