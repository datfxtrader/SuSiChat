
/**
 * Optimized Yahoo Finance Integration with Caching, Circuit Breaking, and Rate Limiting
 */

import axios, { AxiosInstance } from 'axios';
import { LRUCache } from 'lru-cache';
import CircuitBreaker from 'opossum';
import pRetry from 'p-retry';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { EventEmitter } from 'events';
import http from 'http';
import https from 'https';

// Interfaces
interface YahooFinanceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  volume?: number;
  marketCap?: number;
}

interface BitcoinMarketData {
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
  source: string;
  cached?: boolean;
}

interface MarketDataMetrics {
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
  circuitBreakerOpens: number;
  rateLimitHits: number;
  averageResponseTime: number;
}

/**
 * Optimized Yahoo Finance Service with enterprise-grade features
 */
class OptimizedYahooFinanceService extends EventEmitter {
  private axiosInstance: AxiosInstance;
  private priceCache: LRUCache<string, BitcoinMarketData>;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiterMemory;
  private metrics: MarketDataMetrics;
  private lastSuccessfulFetch: Date | null = null;
  
  // Fallback data for when all sources fail
  private fallbackData: BitcoinMarketData | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    // Initialize metrics
    this.metrics = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      circuitBreakerOpens: 0,
      rateLimitHits: 0,
      averageResponseTime: 0
    };
    
    // Initialize axios with optimized settings
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      // Connection pooling
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 10
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 10
      })
    });
    
    // Initialize cache with 5-minute TTL
    this.priceCache = new LRUCache<string, BitcoinMarketData>({
      max: 100,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
    
    // Initialize rate limiter (10 requests per minute to be safe)
    this.rateLimiter = new RateLimiterMemory({
      points: 10,
      duration: 60,
      blockDuration: 60
    });
    
    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(
      this.fetchFromYahooFinance.bind(this),
      {
        timeout: 15000, // 15 seconds
        errorThresholdPercentage: 50,
        resetTimeout: 30000, // 30 seconds
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10,
        name: 'YahooFinanceAPI',
        volumeThreshold: 5,
        fallback: this.getFallbackData.bind(this)
      }
    );
    
    // Circuit breaker events
    this.circuitBreaker.on('open', () => {
      this.metrics.circuitBreakerOpens++;
      console.log('⚡ Yahoo Finance circuit breaker opened');
      this.emit('circuitBreakerOpen');
    });
    
    this.circuitBreaker.on('halfOpen', () => {
      console.log('⚡ Yahoo Finance circuit breaker half-open, testing...');
    });
    
    // Background refresh for popular symbols
    this.startBackgroundRefresh();
  }

  /**
   * Get current Bitcoin price with caching and circuit breaking
   */
  async getCurrentBitcoinPrice(): Promise<BitcoinMarketData | null> {
    const startTime = Date.now();
    const cacheKey = 'BTC-USD';
    
    try {
      // Check cache first
      const cached = this.priceCache.get(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        this.emit('cacheHit', { symbol: cacheKey });
        return { ...cached, cached: true };
      }
      
      this.metrics.cacheMisses++;
      
      // Check rate limit
      try {
        await this.rateLimiter.consume('yahoo-finance');
      } catch (rateLimitError) {
        this.metrics.rateLimitHits++;
        console.warn('⚠️ Rate limit reached for Yahoo Finance');
        
        // Return stale cache if available
        const staleCache = this.priceCache.get(cacheKey);
        if (staleCache) {
          return { ...staleCache, cached: true };
        }
        
        // Return fallback data
        return this.getFallbackData();
      }
      
      // Use circuit breaker to fetch data
      this.metrics.apiCalls++;
      const data = await this.circuitBreaker.fire();
      
      if (data) {
        // Cache the successful result
        this.priceCache.set(cacheKey, data);
        this.fallbackData = data; // Update fallback data
        this.lastSuccessfulFetch = new Date();
        
        // Update average response time
        const responseTime = Date.now() - startTime;
        this.updateAverageResponseTime(responseTime);
        
        this.emit('priceUpdate', data);
        return data;
      }
      
      return null;
      
    } catch (error) {
      console.error('Error getting Bitcoin price:', error);
      return this.getFallbackData();
    }
  }

  /**
   * Fetch data from Yahoo Finance API
   */
  private async fetchFromYahooFinance(): Promise<BitcoinMarketData | null> {
    console.log('📊 Fetching Bitcoin data from Yahoo Finance...');
    
    const response = await pRetry(
      async () => {
        const res = await this.axiosInstance.get(
          'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD'
        );
        
        if (!res.data?.chart?.result?.[0]) {
          throw new Error('Invalid response format from Yahoo Finance');
        }
        
        return res.data;
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onFailedAttempt: (error) => {
          console.warn(`Yahoo Finance attempt ${error.attemptNumber} failed:`, error.message);
        }
      }
    );
    
    // Parse response
    const result = response.chart.result[0];
    const meta = result.meta;
    
    if (!meta) {
      throw new Error('No metadata in Yahoo Finance response');
    }
    
    const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
    const previousClose = meta.previousClose || currentPrice;
    const priceChange = currentPrice - previousClose;
    const priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;
    
    const bitcoinData: BitcoinMarketData = {
      currentPrice: this.roundToTwoDecimals(currentPrice),
      priceChange24h: this.roundToTwoDecimals(priceChange),
      priceChangePercent24h: this.roundToTwoDecimals(priceChangePercent),
      marketCap: meta.marketCap || 0,
      volume24h: meta.regularMarketVolume || 0,
      lastUpdated: new Date().toISOString(),
      source: 'Yahoo Finance'
    };
    
    console.log(`✅ Bitcoin: $${bitcoinData.currentPrice} (${bitcoinData.priceChangePercent24h > 0 ? '+' : ''}${bitcoinData.priceChangePercent24h}%)`);
    
    return bitcoinData;
  }

  /**
   * Get fallback data when API is unavailable
   */
  private getFallbackData(): BitcoinMarketData | null {
    if (this.fallbackData) {
      console.log('📦 Using fallback Bitcoin data');
      return {
        ...this.fallbackData,
        lastUpdated: this.fallbackData.lastUpdated,
        source: 'Yahoo Finance (Cached Fallback)'
      };
    }
    
    // Ultimate fallback with approximate data
    console.log('📦 Using static fallback Bitcoin data');
    return {
      currentPrice: 65000, // Approximate value
      priceChange24h: 0,
      priceChangePercent24h: 0,
      marketCap: 1200000000000, // ~1.2T
      volume24h: 20000000000, // ~20B
      lastUpdated: new Date().toISOString(),
      source: 'Static Fallback'
    };
  }

  /**
   * Get formatted market context
   */
  async getBitcoinMarketContext(): Promise<string> {
    const bitcoinData = await this.getCurrentBitcoinPrice();
    
    if (!bitcoinData) {
      return "Unable to retrieve current Bitcoin pricing data.";
    }
    
    const direction = bitcoinData.priceChangePercent24h >= 0 ? '📈' : '📉';
    const changeText = bitcoinData.priceChangePercent24h >= 0 ? 'up' : 'down';
    const cachedIndicator = bitcoinData.cached ? ' (Cached)' : '';
    
    return `
🪙 **CURRENT BITCOIN MARKET DATA** (${bitcoinData.lastUpdated.split('T')[0]})${cachedIndicator}
${direction} **Price**: $${bitcoinData.currentPrice.toLocaleString()}
📊 **24h Change**: ${bitcoinData.priceChangePercent24h > 0 ? '+' : ''}$${bitcoinData.priceChange24h.toLocaleString()} (${bitcoinData.priceChangePercent24h > 0 ? '+' : ''}${bitcoinData.priceChangePercent24h}%)
📈 **Market Cap**: $${(bitcoinData.marketCap / 1e9).toFixed(1)}B
💰 **24h Volume**: $${(bitcoinData.volume24h / 1e9).toFixed(1)}B
🔄 **Trend**: Bitcoin is ${changeText} ${Math.abs(bitcoinData.priceChangePercent24h).toFixed(2)}% over the last 24 hours

*Data Source: ${bitcoinData.source}*
`;
  }

  /**
   * Enhanced search query with current Bitcoin context
   */
  async enhanceBitcoinQuery(originalQuery: string): Promise<string> {
    const bitcoinData = await this.getCurrentBitcoinPrice();
    
    if (!bitcoinData) {
      return originalQuery;
    }
    
    const currentPrice = bitcoinData.currentPrice;
    const trend = bitcoinData.priceChangePercent24h >= 0 ? 'rising' : 'declining';
    const priceLevel = currentPrice > 60000 ? 'high' : currentPrice > 40000 ? 'moderate' : 'low';
    
    return `${originalQuery} Bitcoin current price $${currentPrice} ${trend} trend ${priceLevel} price level May 2025 analysis forecast market conditions`;
  }

  /**
   * Batch fetch multiple cryptocurrency prices
   */
  async getCryptoPrices(symbols: string[]): Promise<Map<string, BitcoinMarketData | null>> {
    const results = new Map<string, BitcoinMarketData | null>();
    
    // Check cache first
    const uncachedSymbols: string[] = [];
    
    for (const symbol of symbols) {
      const cached = this.priceCache.get(symbol);
      if (cached) {
        this.metrics.cacheHits++;
        results.set(symbol, { ...cached, cached: true });
      } else {
        uncachedSymbols.push(symbol);
      }
    }
    
    // Batch fetch uncached symbols
    if (uncachedSymbols.length > 0) {
      const fetchPromises = uncachedSymbols.map(symbol => 
        this.fetchCryptoPrice(symbol).catch(() => null)
      );
      
      const fetchedData = await Promise.all(fetchPromises);
      
      uncachedSymbols.forEach((symbol, index) => {
        const data = fetchedData[index];
        if (data) {
          this.priceCache.set(symbol, data);
          results.set(symbol, data);
        } else {
          results.set(symbol, null);
        }
      });
    }
    
    return results;
  }

  /**
   * Fetch price for a specific cryptocurrency
   */
  private async fetchCryptoPrice(symbol: string): Promise<BitcoinMarketData | null> {
    try {
      await this.rateLimiter.consume('yahoo-finance');
      
      const response = await this.axiosInstance.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
      );
      
      if (!response.data?.chart?.result?.[0]) {
        return null;
      }
      
      const result = response.data.chart.result[0];
      const meta = result.meta;
      
      if (!meta) return null;
      
      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || currentPrice;
      const priceChange = currentPrice - previousClose;
      const priceChangePercent = previousClose > 0 ? (priceChange / previousClose) * 100 : 0;
      
      return {
        currentPrice: this.roundToTwoDecimals(currentPrice),
        priceChange24h: this.roundToTwoDecimals(priceChange),
        priceChangePercent24h: this.roundToTwoDecimals(priceChangePercent),
        marketCap: meta.marketCap || 0,
        volume24h: meta.regularMarketVolume || 0,
        lastUpdated: new Date().toISOString(),
        source: 'Yahoo Finance'
      };
      
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Start background refresh for popular symbols
   */
  private startBackgroundRefresh(): void {
    // Refresh Bitcoin price every 2 minutes during market hours
    this.refreshInterval = setInterval(() => {
      const now = new Date();
      const hour = now.getUTCHours();
      
      // More frequent updates during active trading hours (UTC)
      const isActiveHours = hour >= 12 && hour <= 22; // 12 PM - 10 PM UTC
      const refreshInterval = isActiveHours ? 2 : 5; // 2 or 5 minutes
      
      if (now.getMinutes() % refreshInterval === 0) {
        this.getCurrentBitcoinPrice().catch(console.error);
      }
    }, 60000); // Check every minute
  }

  /**
   * Utility functions
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
  
  private updateAverageResponseTime(responseTime: number): void {
    const total = this.metrics.averageResponseTime * (this.metrics.apiCalls - 1);
    this.metrics.averageResponseTime = (total + responseTime) / this.metrics.apiCalls;
  }

  /**
   * Get service metrics
   */
  getMetrics(): MarketDataMetrics & { 
    cacheSize: number; 
    hitRate: number;
    lastSuccessfulFetch: string | null;
  } {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    
    return {
      ...this.metrics,
      cacheSize: this.priceCache.size,
      hitRate: total > 0 ? this.metrics.cacheHits / total : 0,
      lastSuccessfulFetch: this.lastSuccessfulFetch?.toISOString() || null
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.priceCache.clear();
    console.log('Yahoo Finance cache cleared');
  }

  /**
   * Shutdown service
   */
  shutdown(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.circuitBreaker.shutdown();
    this.clearCache();
    console.log('Yahoo Finance service shutdown');
  }
}

// Create singleton instance
const yahooFinanceService = new OptimizedYahooFinanceService();

// Export functions for backward compatibility
export async function getCurrentBitcoinPrice(): Promise<BitcoinMarketData | null> {
  return yahooFinanceService.getCurrentBitcoinPrice();
}

export async function getBitcoinMarketContext(): Promise<string> {
  return yahooFinanceService.getBitcoinMarketContext();
}

export function enhanceBitcoinQuery(originalQuery: string, bitcoinData?: BitcoinMarketData): string {
  // For backward compatibility, if bitcoinData is provided, use it
  if (bitcoinData) {
    const currentPrice = bitcoinData.currentPrice;
    const trend = bitcoinData.priceChangePercent24h >= 0 ? 'rising' : 'declining';
    return `${originalQuery} current price $${currentPrice} ${trend} trend May 2025 analysis forecast`;
  }
  
  // Otherwise use the service method (async, returns Promise)
  return originalQuery; // Simplified for backward compatibility
}

// Export service for advanced usage
export { yahooFinanceService };

// Graceful shutdown handler
process.on('SIGINT', () => {
  yahooFinanceService.shutdown();
});

process.on('SIGTERM', () => {
  yahooFinanceService.shutdown();
});
