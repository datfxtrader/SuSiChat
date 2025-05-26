
// types/yahoo-finance.types.ts
export interface CryptoPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  timestamp: string;
  cached?: boolean;
}

export interface MarketContext {
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  correlations: {
    sp500: number;
    nasdaq: number;
    gold: number;
  };
  volatilityIndex: number;
  fearGreedIndex?: number;
  dominance?: number;
}

export interface ServiceMetrics {
  cache: {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    memoryUsage: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalRequests: number;
    requestsPerMinute: number;
  };
  reliability: {
    uptime: number;
    lastSuccessfulFetch: string;
    consecutiveFailures: number;
    circuitBreakerStatus: 'closed' | 'open' | 'half-open';
    circuitBreakerOpens: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
    lastError?: {
      type: string;
      message: string;
      timestamp: string;
    };
  };
}

export interface BatchCryptoRequest {
  symbols: string[];
  options?: {
    includeExtended?: boolean;
    includeTechnicals?: boolean;
  };
}

export interface BatchCryptoResponse {
  success: boolean;
  data?: Record<string, CryptoPrice | { error: string }>;
  performance: {
    responseTime: number;
    symbolCount: number;
    successCount: number;
    failureCount: number;
  };
  timestamp: string;
}
