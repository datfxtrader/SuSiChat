
import { 
  SearchEngineConfig, 
  SearchType, 
  SearchEngineStats,
  SearchEngineSelection
} from '../../types/search-engine.types';
import { 
  SearchEngineConfigManager,
  getSearchEngineConfig 
} from '../config/search-engines.config';
import { RateLimiter } from './rate-limiter.service';

export class SearchEngineManagerService {
  private static instance: SearchEngineManagerService;
  private engineStats: Map<string, SearchEngineStats> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  private constructor() {
    this.initializeEngines();
  }

  static getInstance(): SearchEngineManagerService {
    if (!SearchEngineManagerService.instance) {
      SearchEngineManagerService.instance = new SearchEngineManagerService();
    }
    return SearchEngineManagerService.instance;
  }

  /**
   * Initialize all configured search engines
   */
  private initializeEngines(): void {
    const configs = SearchEngineConfigManager.getAllConfigs();
    
    for (const config of configs) {
      // Initialize statistics
      this.engineStats.set(config.id, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastUsed: new Date(),
        quotaUsed: 0,
        errorRate: 0
      });

      // Initialize rate limiter
      this.rateLimiters.set(config.id, new RateLimiter(config.rateLimit));
    }
  }

  /**
   * Select optimal search engine for request
   */
  selectEngine(requirements: {
    searchType?: SearchType;
    needsDateRange?: boolean;
    needsCountryFilter?: boolean;
    maxLatency?: number;
    excludeEngines?: string[];
    preferFree?: boolean;
  }): SearchEngineSelection | null {
    let availableEngines = SearchEngineConfigManager.getAllConfigs();

    // Filter by requirements
    if (requirements.searchType) {
      availableEngines = availableEngines.filter(e => 
        e.features.supportedSearchTypes?.includes(requirements.searchType!)
      );
    }

    if (requirements.needsDateRange) {
      availableEngines = availableEngines.filter(e => e.features.supportsDateRange);
    }

    if (requirements.needsCountryFilter) {
      availableEngines = availableEngines.filter(e => e.features.supportsCountry);
    }

    if (requirements.maxLatency) {
      availableEngines = availableEngines.filter(e => e.timeout <= requirements.maxLatency!);
    }

    if (requirements.excludeEngines) {
      availableEngines = availableEngines.filter(e => 
        !requirements.excludeEngines!.includes(e.id)
      );
    }

    if (requirements.preferFree) {
      const freeEngines = availableEngines.filter(e => 
        e.metadata?.pricingTier === 'free'
      );
      if (freeEngines.length > 0) {
        availableEngines = freeEngines;
      }
    }

    // Filter by availability and rate limits
    availableEngines = availableEngines.filter(engine => {
      const rateLimiter = this.rateLimiters.get(engine.id);
      const stats = this.engineStats.get(engine.id);
      
      return rateLimiter?.canMakeRequest() && 
             stats?.errorRate < 0.5; // Exclude engines with >50% error rate
    });

    if (availableEngines.length === 0) {
      return null;
    }

    // Sort by priority and performance
    availableEngines.sort((a, b) => {
      const statsA = this.engineStats.get(a.id)!;
      const statsB = this.engineStats.get(b.id)!;
      
      // Primary sort: priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Secondary sort: error rate (lower is better)
      if (statsA.errorRate !== statsB.errorRate) {
        return statsA.errorRate - statsB.errorRate;
      }
      
      // Tertiary sort: response time (faster is better)
      return statsA.averageResponseTime - statsB.averageResponseTime;
    });

    const primary = availableEngines[0];
    const fallbacks = availableEngines.slice(1, 3); // Up to 2 fallbacks

    return {
      primary,
      fallbacks,
      reason: this.getSelectionReason(primary, requirements)
    };
  }

  /**
   * Get selection reason for logging/debugging
   */
  private getSelectionReason(engine: SearchEngineConfig, requirements: any): string {
    const reasons: string[] = [];
    
    reasons.push(`Priority: ${engine.priority}`);
    
    if (requirements.searchType) {
      reasons.push(`Supports ${requirements.searchType}`);
    }
    
    const stats = this.engineStats.get(engine.id);
    if (stats) {
      reasons.push(`Error rate: ${(stats.errorRate * 100).toFixed(1)}%`);
      reasons.push(`Avg response: ${stats.averageResponseTime}ms`);
    }
    
    return reasons.join(', ');
  }

  /**
   * Record engine usage and performance
   */
  recordUsage(engineId: string, responseTime: number, success: boolean): void {
    const stats = this.engineStats.get(engineId);
    if (!stats) return;

    stats.totalRequests++;
    stats.lastUsed = new Date();

    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // Update average response time (moving average)
    const alpha = 0.1; // Smoothing factor
    stats.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * stats.averageResponseTime;

    // Update error rate
    stats.errorRate = stats.failedRequests / stats.totalRequests;

    // Update rate limiter
    const rateLimiter = this.rateLimiters.get(engineId);
    if (rateLimiter) {
      rateLimiter.recordRequest();
    }
  }

  /**
   * Get engine health status
   */
  getEngineHealth(engineId: string): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: SearchEngineStats;
    rateLimitStatus: any;
  } {
    const stats = this.engineStats.get(engineId);
    const rateLimiter = this.rateLimiters.get(engineId);

    if (!stats || !rateLimiter) {
      return {
        status: 'unhealthy',
        metrics: {} as SearchEngineStats,
        rateLimitStatus: {}
      };
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (stats.errorRate > 0.5) {
      status = 'unhealthy';
    } else if (stats.errorRate > 0.2 || stats.averageResponseTime > 10000) {
      status = 'degraded';
    }

    return {
      status,
      metrics: stats,
      rateLimitStatus: rateLimiter.getStatus()
    };
  }

  /**
   * Get all engine health statuses
   */
  getAllEngineHealth(): Record<string, any> {
    const health: Record<string, any> = {};
    
    for (const engineId of this.engineStats.keys()) {
      health[engineId] = this.getEngineHealth(engineId);
    }
    
    return health;
  }

  /**
   * Reset engine statistics
   */
  resetEngineStats(engineId: string): void {
    const stats = this.engineStats.get(engineId);
    if (stats) {
      stats.totalRequests = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
      stats.averageResponseTime = 0;
      stats.quotaUsed = 0;
      stats.errorRate = 0;
    }
  }

  /**
   * Get engine configuration with current stats
   */
  getEngineInfo(engineId: string): {
    config: SearchEngineConfig | undefined;
    stats: SearchEngineStats | undefined;
    health: any;
  } {
    return {
      config: getSearchEngineConfig(engineId),
      stats: this.engineStats.get(engineId),
      health: this.getEngineHealth(engineId)
    };
  }

  /**
   * Check if engine can handle request based on quota
   */
  canUseEngine(engineId: string): boolean {
    const config = getSearchEngineConfig(engineId);
    const stats = this.engineStats.get(engineId);
    const rateLimiter = this.rateLimiters.get(engineId);

    if (!config || !stats || !rateLimiter) {
      return false;
    }

    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
      return false;
    }

    // Check quota if configured
    if (config.metadata?.quotaLimit) {
      if (stats.quotaUsed >= config.metadata.quotaLimit) {
        return false;
      }
    }

    // Check error rate threshold
    if (stats.errorRate > 0.8) {
      return false;
    }

    return true;
  }
}
