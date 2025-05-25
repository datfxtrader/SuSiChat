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
      throw error;
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