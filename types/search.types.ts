
// types/search.types.ts
export interface EnhancedSearchRequest {
  query: string;
  maxResults?: number;
  searchType?: 'web' | 'news' | 'all';
  freshness?: 'day' | 'week' | 'month' | 'year';
  sources?: string[];
  filters?: SearchFilters;
}

export interface SearchFilters {
  domains?: string[];
  excludeDomains?: string[];
  language?: string;
  country?: string;
  safeSearch?: 'strict' | 'moderate' | 'off';
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  source: string;
  publishedDate?: string;
  domain?: string;
  thumbnail?: string;
  author?: string;
  relevanceScore?: number;
}

export interface EnhancedSearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchEnginesUsed: string[];
  query: string;
  searchType: string;
  timestamp: string;
  processingTime: number;
  cached?: boolean;
}

export interface SearchOptions {
  maxResults: number;
  freshness?: string;
  filters?: SearchFilters;
}
