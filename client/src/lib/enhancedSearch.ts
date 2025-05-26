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

export interface EnhancedSearchResponse {
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

interface SearchOptions {
    maxResults?: number;
    category?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://0.0.0.0:3000';

export const enhancedWebSearch = async (query: string, options: SearchOptions = {}): Promise<SearchResult[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/enhanced-web-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        maxResults: options.maxResults || 10,
        category: options.category || 'general'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Search failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Enhanced web search error:', error);
    // Return empty results instead of throwing to prevent unhandled rejections
    return [];
  }
};

// Export enhancedSearchClient for compatibility with useSuna hook
export const enhancedSearchClient = {
  search: async (options: {
    query: string;
    searchType?: 'web' | 'news' | 'all';
    maxResults?: number;
    freshness?: 'day' | 'week' | 'month' | 'year';
  }) => {
    return enhancedSearch.search(
      options.query,
      options.maxResults || 10,
      options.searchType || 'all',
      options.freshness || 'week'
    );
  }
};