/**
 * Intelligent API Rate Limiting Manager
 * Handles queue management, exponential backoff, and smart caching
 */

interface RateLimitInfo {
  lastCall: number;
  callCount: number;
  backoffDelay: number;
  isBlocked: boolean;
  blockUntil: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class ApiRateManager {
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  
  // Rate limiting configuration - DISABLED FOR 15 DAYS
  private readonly BASE_DELAY = 0; // DISABLED
  private readonly MAX_DELAY = 0; // DISABLED  
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache (reduced)
  private readonly BLOCK_DURATION = 0; // DISABLED

  /**
   * Check if we should delay API call - ALWAYS RETURNS 0 (DISABLED)
   */
  shouldDelay(apiName: string): number {
    console.log(`⚡ Rate limiting DISABLED for ${apiName} - proceeding immediately`);
    return 0; // NO DELAYS FOR 15 DAYS
  }

  /**
   * Record successful API call
   */
  recordSuccess(apiName: string): void {
    const rateInfo = this.rateLimits.get(apiName) || {
      lastCall: 0,
      callCount: 0,
      backoffDelay: this.BASE_DELAY,
      isBlocked: false,
      blockUntil: 0
    };

    rateInfo.lastCall = Date.now();
    rateInfo.callCount++;
    
    // Gradually reduce delay on success
    rateInfo.backoffDelay = Math.max(
      this.BASE_DELAY,
      rateInfo.backoffDelay * 0.8
    );

    this.rateLimits.set(apiName, rateInfo);
  }

  /**
   * Record rate limit hit (429 error)
   */
  recordRateLimit(apiName: string): void {
    const rateInfo = this.rateLimits.get(apiName) || {
      lastCall: 0,
      callCount: 0,
      backoffDelay: this.BASE_DELAY,
      isBlocked: false,
      blockUntil: 0
    };

    // Exponential backoff
    rateInfo.backoffDelay = Math.min(
      this.MAX_DELAY,
      rateInfo.backoffDelay * 2
    );

    // Block for a period
    rateInfo.isBlocked = true;
    rateInfo.blockUntil = Date.now() + this.BLOCK_DURATION;

    this.rateLimits.set(apiName, rateInfo);
    console.log(`Rate limit hit for ${apiName}. Blocked until ${new Date(rateInfo.blockUntil)}`);
  }

  /**
   * Cache API response
   */
  cacheResponse(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL
    });
  }

  /**
   * Get cached response if valid
   */
  getCachedResponse(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`Cache hit for key: ${key}`);
    return entry.data;
  }

  /**
   * Generate cache key for search query
   */
  generateCacheKey(query: string, apiName: string): string {
    return `${apiName}:${query.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Execute API call with intelligent rate limiting
   */
  async executeWithRateLimit<T>(
    apiName: string,
    cacheKey: string,
    apiCall: () => Promise<T>
  ): Promise<T | null> {
    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;

    // Check rate limit
    const delay = this.shouldDelay(apiName);
    if (delay > 0) {
      console.log(`Rate limiting ${apiName}: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const result = await apiCall();
      this.recordSuccess(apiName);
      this.cacheResponse(cacheKey, result);
      return result;
    } catch (error: any) {
      if (error.response?.status === 429) {
        this.recordRateLimit(apiName);
        console.log(`Rate limit exceeded for ${apiName}`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Get status of all APIs
   */
  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.rateLimits.forEach((rateInfo, apiName) => {
      status[apiName] = {
        isBlocked: rateInfo.isBlocked,
        blockUntil: rateInfo.isBlocked ? new Date(rateInfo.blockUntil) : null,
        backoffDelay: rateInfo.backoffDelay,
        lastCall: new Date(rateInfo.lastCall)
      };
    });

    return status;
  }

  /**
   * Clear old cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    });
  }
}

// Global singleton instance
export const apiRateManager = new ApiRateManager();

// Cleanup cache every 10 minutes
setInterval(() => {
  apiRateManager.cleanupCache();
}, 10 * 60 * 1000);