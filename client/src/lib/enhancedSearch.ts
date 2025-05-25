import { optimizedSearchClient } from './optimizedSearch';

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

export const enhancedSearch = {
  async search(
    query: string, 
    maxResults: number = 10, 
    searchType: 'web' | 'news' | 'all' = 'all',
    freshness: 'day' | 'week' | 'month' | 'year' = 'week'
  ): Promise<SearchResponse> {
    try {
      return await optimizedSearchClient.search(query, {
        maxResults,
        searchType,
        freshness,
        useCache: true
      });
    } catch (error) {
      console.error('Enhanced search error:', error);
      // Return empty results instead of throwing to prevent app crashes
      return {
        results: [],
        totalResults: 0,
        searchEnginesUsed: [],
        query,
        searchType,
        timestamp: new Date().toISOString(),
        performance: {
          searchTime: 0,
          cacheHits: 0,
          apiCalls: 0
        }
      };
    }
  },

  async getStatus() {
    try {
      return await optimizedSearchClient.getStatus();
    } catch (error) {
      console.error('Failed to get search status:', error);
      throw error;
    }
  },

  clearCache() {
    optimizedSearchClient.clearCache();
  },

  getCacheStats() {
    return optimizedSearchClient.getCacheStats();
  }
};