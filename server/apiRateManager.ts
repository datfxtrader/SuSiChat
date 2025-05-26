
interface RateLimitInfo {
  lastCall: number;
  callCount: number;
  backoffDelay: number;
  isBlocked: boolean;
  blockUntil: number;
  consecutiveErrors: number;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface RateLimitConfig {
  baseDelay: number;
  maxDelay: number;
  cacheTTL: number;
  blockDuration: number;
  maxCacheSize: number;
  cleanupInterval: number;
}

export class ApiRateManager {
  private rateLimits = new Map<string, RateLimitInfo>();
  private cache = new Map<string, CacheEntry>();
  private readonly config: RateLimitConfig;
  private cleanupTimer?: NodeJS.Timeout;
  
  // LRU tracking for cache eviction
  private cacheAccessOrder: string[] = [];
  
  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      baseDelay: 0, // Disabled for 15 days
      maxDelay: 0,  // Disabled for 15 days
      cacheTTL: 3 * 60 * 1000, // 3 minutes
      blockDuration: 0, // Disabled
      maxCacheSize: 1000,
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
      ...config
    };
    
    // Start cleanup timer
    this.startCleanup();
  }
  
  shouldDelay(apiName: string): number {
    if (this.config.baseDelay === 0) {
      console.log(`⚡ Rate limiting DISABLED for ${apiName}`);
      return 0;
    }
    
    const rateInfo = this.rateLimits.get(apiName);
    if (!rateInfo) return 0;
    
    // Check if blocked
    if (rateInfo.isBlocked && Date.now() < rateInfo.blockUntil) {
      return rateInfo.blockUntil - Date.now();
    }
    
    // Calculate delay based on last call
    const timeSinceLastCall = Date.now() - rateInfo.lastCall;
    const requiredDelay = rateInfo.backoffDelay - timeSinceLastCall;
    
    return Math.max(0, requiredDelay);
  }
  
  recordSuccess(apiName: string): void {
    const rateInfo = this.rateLimits.get(apiName) || this.createRateLimitInfo();
    
    rateInfo.lastCall = Date.now();
    rateInfo.callCount++;
    rateInfo.consecutiveErrors = 0;
    
    // Reduce delay on success (but not below base)
    rateInfo.backoffDelay = Math.max(
      this.config.baseDelay,
      rateInfo.backoffDelay * 0.8
    );
    
    // Unblock if was blocked
    if (rateInfo.isBlocked && Date.now() >= rateInfo.blockUntil) {
      rateInfo.isBlocked = false;
    }
    
    this.rateLimits.set(apiName, rateInfo);
  }
  
  recordError(apiName: string, isRateLimit: boolean = false): void {
    const rateInfo = this.rateLimits.get(apiName) || this.createRateLimitInfo();
    
    rateInfo.consecutiveErrors++;
    
    if (isRateLimit || rateInfo.consecutiveErrors >= 3) {
      // Exponential backoff
      rateInfo.backoffDelay = Math.min(
        this.config.maxDelay,
        rateInfo.backoffDelay * 2 || this.config.baseDelay * 2
      );
      
      // Block if rate limited
      if (isRateLimit) {
        rateInfo.isBlocked = true;
        rateInfo.blockUntil = Date.now() + this.config.blockDuration;
      }
    }
    
    this.rateLimits.set(apiName, rateInfo);
  }
  
  cacheResponse<T>(key: string, data: T, ttl?: number): void {
    // Enforce cache size limit with LRU eviction
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL,
      hits: 0
    });
    
    // Update access order
    this.updateAccessOrder(key);
  }
  
  getCachedResponse<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check expiry
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }
    
    // Update hit count and access order
    entry.hits++;
    this.updateAccessOrder(key);
    
    return entry.data as T;
  }
  
  async executeWithRateLimit<T>(
    apiName: string,
    cacheKey: string,
    apiCall: () => Promise<T>,
    options?: { ttl?: number; retries?: number }
  ): Promise<T | null> {
    // Check cache first
    const cached = this.getCachedResponse<T>(cacheKey);
    if (cached !== null) return cached;
    
    // Check rate limit
    const delay = this.shouldDelay(apiName);
    if (delay > 0) {
      console.log(`⏳ Rate limit delay for ${apiName}: ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Retry logic
    const maxRetries = options?.retries ?? 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await apiCall();
        this.recordSuccess(apiName);
        this.cacheResponse(cacheKey, result, options?.ttl);
        return result;
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error.response?.status === 429;
        
        this.recordError(apiName, isRateLimit);
        
        if (isRateLimit || attempt === maxRetries - 1) {
          console.error(`API call failed for ${apiName}:`, error.message);
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
    
    return null;
  }
  
  generateCacheKey(query: string, apiName: string): string {
    // Simple hash function for consistent keys
    const hash = query.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    return `${apiName}:${Math.abs(hash)}`;
  }
  
  getStatus(): Record<string, any> {
    const status: Record<string, any> = {
      cache: {
        size: this.cache.size,
        maxSize: this.config.maxCacheSize,
        hitRate: this.calculateHitRate()
      },
      apis: {}
    };
    
    this.rateLimits.forEach((rateInfo, apiName) => {
      status.apis[apiName] = {
        isBlocked: rateInfo.isBlocked,
        blockUntil: rateInfo.isBlocked ? new Date(rateInfo.blockUntil) : null,
        backoffDelay: rateInfo.backoffDelay,
        lastCall: new Date(rateInfo.lastCall),
        callCount: rateInfo.callCount,
        consecutiveErrors: rateInfo.consecutiveErrors
      };
    });
    
    return status;
  }
  
  private createRateLimitInfo(): RateLimitInfo {
    return {
      lastCall: 0,
      callCount: 0,
      backoffDelay: this.config.baseDelay,
      isBlocked: false,
      blockUntil: 0,
      consecutiveErrors: 0
    };
  }
  
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.cacheAccessOrder.push(key);
  }
  
  private removeFromAccessOrder(key: string): void {
    const index = this.cacheAccessOrder.indexOf(key);
    if (index > -1) {
      this.cacheAccessOrder.splice(index, 1);
    }
  }
  
  private evictLRU(): void {
    if (this.cacheAccessOrder.length > 0) {
      const lruKey = this.cacheAccessOrder.shift()!;
      this.cache.delete(lruKey);
    }
  }
  
  private calculateHitRate(): number {
    let totalHits = 0;
    let totalRequests = 0;
    
    this.cache.forEach(entry => {
      totalHits += entry.hits;
      totalRequests += entry.hits + 1;
    });
    
    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
  
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCache();
    }, this.config.cleanupInterval);
  }
  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Export singleton
export const apiRateManager = new ApiRateManager();
