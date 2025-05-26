
// types/metrics.types.ts
export interface SearchMetrics {
  cache: CacheMetrics;
  performance: PerformanceMetrics;
  usage: UsageMetrics;
  errors: ErrorMetrics;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  evictions: number;
  memoryUsage?: number;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  totalRequests: number;
  requestsPerMinute: number;
  activeRequests: number;
}

export interface UsageMetrics {
  topQueries: QueryStat[];
  searchEngineUsage: Record<string, number>;
  queryCategories: Record<string, number>;
  peakHour: number;
  totalSearches: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  lastError?: {
    timestamp: string;
    type: string;
    message: string;
  };
}

export interface QueryStat {
  query: string;
  count: number;
  avgResponseTime: number;
  lastSearched: string;
}

export interface MetricsResponse {
  success: boolean;
  metrics?: SearchMetrics;
  summary?: MetricsSummary;
  timestamp: string;
  uptimeSeconds?: number;
  error?: string;
}

export interface MetricsSummary {
  health: 'healthy' | 'degraded' | 'unhealthy';
  alerts: Alert[];
  recommendations: string[];
}

export interface Alert {
  level: 'info' | 'warning' | 'error';
  message: string;
  metric: string;
  value: number;
  threshold: number;
}
