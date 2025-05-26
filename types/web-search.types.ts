
export interface WebSearchRequest {
  query: string;
  maxResults?: number;
  options?: SearchOptions;
}

export interface SearchOptions {
  searchEngines?: string[];
  includeDomains?: string[];
  excludeDomains?: string[];
  searchDepth?: 'basic' | 'advanced';
  country?: string;
  language?: string;
  freshness?: 'day' | 'week' | 'month' | 'year';
  safeSearch?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  description: string;
  snippet: string;
  score?: number;
  publishedDate?: string;
  source: string;
  domain?: string;
}

export interface WebSearchResponse {
  results: SearchResult[];
  query: string;
  totalResults: number;
  searchEnginesUsed: string[];
  processingTime: number;
  timestamp: string;
  cached?: boolean;
}

export interface SearchEngineConfig {
  name: string;
  priority: number;
  timeout: number;
  maxRetries: number;
  rateLimit: {
    requests: number;
    window: number; // in ms
  };
}
