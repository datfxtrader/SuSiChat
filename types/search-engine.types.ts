
// types/search-engine.types.ts
export interface SearchEngineConfig {
  id: string;
  name: string;
  priority: number;
  timeout: number;
  maxRetries: number;
  rateLimit: RateLimitConfig;
  endpoints: SearchEndpoints;
  features: SearchEngineFeatures;
  authentication: AuthConfig;
  headers?: Record<string, string>;
  queryParams?: QueryParamConfig;
  responseParser?: ResponseParserConfig;
  errorHandling?: ErrorHandlingConfig;
  performance?: PerformanceConfig;
  metadata?: SearchEngineMetadata;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // in ms
  burst?: number; // max burst requests
  retryAfter?: number; // ms to wait after rate limit
  strategy?: 'fixed' | 'sliding' | 'token-bucket';
}

export interface SearchEndpoints {
  base: string;
  search: string;
  suggest?: string;
  batch?: string;
  health?: string;
}

export interface SearchEngineFeatures {
  supportsFilters: boolean;
  supportsDateRange: boolean;
  supportsLanguage: boolean;
  supportsCountry: boolean;
  supportsSafeSearch: boolean;
  supportsPagination: boolean;
  supportsSpellCheck: boolean;
  maxResultsPerQuery: number;
  supportedLanguages?: string[];
  supportedCountries?: string[];
  supportedSearchTypes?: SearchType[];
}

export enum SearchType {
  WEB = 'web',
  NEWS = 'news',
  IMAGES = 'images',
  VIDEOS = 'videos',
  MAPS = 'maps',
  SHOPPING = 'shopping'
}

export interface AuthConfig {
  type: 'api-key' | 'bearer' | 'basic' | 'oauth2' | 'none';
  headerName?: string;
  paramName?: string;
  tokenPrefix?: string;
  refreshEndpoint?: string;
}

export interface QueryParamConfig {
  query: string;
  limit: string;
  offset?: string;
  language?: string;
  country?: string;
  dateRange?: string;
  safeSearch?: string;
  customParams?: Record<string, string>;
}

export interface ResponseParserConfig {
  resultsPath: string; // JSONPath to results array
  totalPath?: string;
  nextPagePath?: string;
  errorPath?: string;
  transformResult?: (result: any) => any;
}

export interface ErrorHandlingConfig {
  retryableCodes: number[];
  fatalCodes: number[];
  fallbackBehavior: 'skip' | 'throw' | 'return-empty';
  customErrorMessages?: Record<number, string>;
}

export interface PerformanceConfig {
  connectionTimeout: number;
  keepAlive: boolean;
  compression: boolean;
  cacheResults: boolean;
  cacheTTL?: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface SearchEngineMetadata {
  description?: string;
  documentation?: string;
  termsOfService?: string;
  pricingTier?: 'free' | 'basic' | 'pro' | 'enterprise';
  quotaLimit?: number;
  quotaPeriod?: 'day' | 'month';
  supportEmail?: string;
  lastUpdated?: string;
}

export interface SearchEngineStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUsed: Date;
  quotaUsed: number;
  errorRate: number;
}

export interface SearchEngineSelection {
  primary: SearchEngineConfig;
  fallbacks: SearchEngineConfig[];
  reason: string;
}
