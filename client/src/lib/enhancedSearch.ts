
export interface EnhancedSearchOptions {
  query: string;
  maxResults?: number;
  searchType?: 'web' | 'news' | 'all';
  freshness?: 'day' | 'week' | 'month' | 'year';
  sources?: string[];
}

export interface SearchResult {
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
  performance?: {
    searchTime: number;
    timestamp: string;
  };
}

class EnhancedSearchClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/enhanced-search') {
    this.baseUrl = baseUrl;
  }

  async search(options: EnhancedSearchOptions): Promise<EnhancedSearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Search failed' }));
      throw new Error(error.error || `Search failed with status ${response.status}`);
    }

    return response.json();
  }

  async webSearch(query: string, maxResults = 10): Promise<EnhancedSearchResponse> {
    return this.search({
      query,
      maxResults,
      searchType: 'web',
      freshness: 'week'
    });
  }

  async newsSearch(query: string, maxResults = 5): Promise<EnhancedSearchResponse> {
    return this.search({
      query,
      maxResults,
      searchType: 'news',
      freshness: 'day'
    });
  }

  async comprehensiveSearch(query: string, maxResults = 15): Promise<EnhancedSearchResponse> {
    return this.search({
      query,
      maxResults,
      searchType: 'all',
      freshness: 'week'
    });
  }

  async searchWithSources(query: string, sources: string[], maxResults = 10): Promise<EnhancedSearchResponse> {
    return this.search({
      query,
      maxResults,
      searchType: 'all',
      sources,
      freshness: 'week'
    });
  }
}

export const enhancedSearchClient = new EnhancedSearchClient();
export default enhancedSearchClient;
