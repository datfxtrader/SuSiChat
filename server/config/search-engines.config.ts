
import { 
  SearchEngineConfig, 
  SearchType, 
  AuthConfig 
} from '../../types/search-engine.types';

/**
 * Comprehensive search engine configurations
 */
export const SEARCH_ENGINE_CONFIGS: Readonly<Record<string, SearchEngineConfig>> = Object.freeze({
  tavily: {
    id: 'tavily',
    name: 'Tavily',
    priority: 1,
    timeout: 10000,
    maxRetries: 2,
    rateLimit: {
      requests: 100,
      window: 60000, // 1 minute
      burst: 10,
      retryAfter: 5000,
      strategy: 'sliding'
    },
    endpoints: {
      base: 'https://api.tavily.com',
      search: '/search',
      health: '/health'
    },
    features: {
      supportsFilters: true,
      supportsDateRange: true,
      supportsLanguage: true,
      supportsCountry: true,
      supportsSafeSearch: true,
      supportsPagination: true,
      supportsSpellCheck: false,
      maxResultsPerQuery: 100,
      supportedSearchTypes: [SearchType.WEB, SearchType.NEWS],
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      supportedCountries: ['us', 'uk', 'ca', 'au', 'de', 'fr', 'es', 'it', 'jp', 'kr', 'cn']
    },
    authentication: {
      type: 'api-key',
      paramName: 'api_key'
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    queryParams: {
      query: 'query',
      limit: 'max_results',
      language: 'search_lang',
      country: 'country',
      dateRange: 'time_range',
      safeSearch: 'safe_search'
    },
    responseParser: {
      resultsPath: 'results',
      totalPath: 'total_results',
      transformResult: (result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content || result.snippet,
        score: result.score,
        publishedDate: result.published_date
      })
    },
    errorHandling: {
      retryableCodes: [429, 500, 502, 503, 504],
      fatalCodes: [401, 403],
      fallbackBehavior: 'skip',
      customErrorMessages: {
        401: 'Invalid API key',
        403: 'Access forbidden - check your plan limits',
        429: 'Rate limit exceeded'
      }
    },
    performance: {
      connectionTimeout: 5000,
      keepAlive: true,
      compression: true,
      cacheResults: true,
      cacheTTL: 300000, // 5 minutes
      priority: 'high'
    },
    metadata: {
      description: 'AI-powered search API with advanced filtering',
      documentation: 'https://docs.tavily.com',
      pricingTier: 'pro',
      quotaLimit: 3000,
      quotaPeriod: 'month',
      supportEmail: 'support@tavily.com',
      lastUpdated: '2024-01-15'
    }
  },

  brave: {
    id: 'brave',
    name: 'Brave Search',
    priority: 2,
    timeout: 8000,
    maxRetries: 2,
    rateLimit: {
      requests: 50,
      window: 60000,
      burst: 5,
      retryAfter: 3000,
      strategy: 'fixed'
    },
    endpoints: {
      base: 'https://api.search.brave.com',
      search: '/res/v1/web/search',
      suggest: '/res/v1/suggest/search',
      health: '/health'
    },
    features: {
      supportsFilters: true,
      supportsDateRange: true,
      supportsLanguage: true,
      supportsCountry: true,
      supportsSafeSearch: true,
      supportsPagination: true,
      supportsSpellCheck: true,
      maxResultsPerQuery: 50,
      supportedSearchTypes: [SearchType.WEB, SearchType.NEWS, SearchType.IMAGES, SearchType.VIDEOS],
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko'],
      supportedCountries: ['us', 'uk', 'ca', 'au', 'nz', 'ie', 'de', 'fr', 'es', 'it', 'nl']
    },
    authentication: {
      type: 'api-key',
      headerName: 'X-Subscription-Token'
    },
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate'
    },
    queryParams: {
      query: 'q',
      limit: 'count',
      offset: 'offset',
      language: 'search_lang',
      country: 'country',
      dateRange: 'freshness',
      safeSearch: 'safesearch',
      customParams: {
        spellcheck: 'spellcheck',
        result_filter: 'result_filter'
      }
    },
    responseParser: {
      resultsPath: 'web.results',
      totalPath: 'web.total',
      nextPagePath: 'web.next_offset',
      transformResult: (result: any) => ({
        title: result.title,
        url: result.url,
        content: result.description,
        thumbnail: result.thumbnail?.src,
        age: result.age,
        domain: result.meta_url?.hostname
      })
    },
    errorHandling: {
      retryableCodes: [429, 500, 502, 503],
      fatalCodes: [401, 402, 403],
      fallbackBehavior: 'return-empty',
      customErrorMessages: {
        401: 'Invalid subscription token',
        402: 'Payment required - upgrade your plan',
        429: 'Rate limit exceeded - wait before retrying'
      }
    },
    performance: {
      connectionTimeout: 4000,
      keepAlive: true,
      compression: true,
      cacheResults: true,
      cacheTTL: 600000, // 10 minutes
      priority: 'normal'
    },
    metadata: {
      description: 'Privacy-focused search engine with independent index',
      documentation: 'https://brave.com/search/api/',
      pricingTier: 'basic',
      quotaLimit: 2000,
      quotaPeriod: 'month',
      supportEmail: 'support@brave.com',
      lastUpdated: '2024-02-01'
    }
  },

  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    priority: 3,
    timeout: 6000,
    maxRetries: 1,
    rateLimit: {
      requests: 30,
      window: 60000,
      strategy: 'fixed'
    },
    endpoints: {
      base: 'https://api.duckduckgo.com',
      search: '/',
      suggest: '/ac/'
    },
    features: {
      supportsFilters: false,
      supportsDateRange: false,
      supportsLanguage: true,
      supportsCountry: true,
      supportsSafeSearch: true,
      supportsPagination: false,
      supportsSpellCheck: false,
      maxResultsPerQuery: 25,
      supportedSearchTypes: [SearchType.WEB]
    },
    authentication: {
      type: 'none'
    },
    headers: {
      'Accept': 'application/json'
    },
    queryParams: {
      query: 'q',
      limit: 'limit',
      language: 'kl',
      safeSearch: 'safe'
    },
    responseParser: {
      resultsPath: 'RelatedTopics',
      transformResult: (result: any) => ({
        title: result.Text?.split(' - ')[0],
        url: result.FirstURL,
        content: result.Text
      })
    },
    errorHandling: {
      retryableCodes: [500, 503],
      fatalCodes: [],
      fallbackBehavior: 'return-empty'
    },
    performance: {
      connectionTimeout: 3000,
      keepAlive: false,
      compression: true,
      cacheResults: true,
      cacheTTL: 900000, // 15 minutes
      priority: 'low'
    },
    metadata: {
      description: 'Privacy-focused search engine with instant answers',
      documentation: 'https://duckduckgo.com/api',
      pricingTier: 'free',
      lastUpdated: '2024-01-01'
    }
  }
});

// Helper class for search engine configuration management
export class SearchEngineConfigManager {
  private static stats: Map<string, any> = new Map();

  /**
   * Get all configured search engines
   */
  static getAllConfigs(): SearchEngineConfig[] {
    return Object.values(SEARCH_ENGINE_CONFIGS);
  }

  /**
   * Get config by ID
   */
  static getConfig(engineId: string): SearchEngineConfig | undefined {
    return SEARCH_ENGINE_CONFIGS[engineId];
  }

  /**
   * Get engines by priority order
   */
  static getByPriority(): SearchEngineConfig[] {
    return this.getAllConfigs().sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get engines supporting specific feature
   */
  static getByFeature(feature: keyof SearchEngineConfig['features']): SearchEngineConfig[] {
    return this.getAllConfigs().filter(config => 
      config.features[feature] === true || 
      (Array.isArray(config.features[feature]) && config.features[feature].length > 0)
    );
  }

  /**
   * Get engines by search type support
   */
  static getBySearchType(searchType: SearchType): SearchEngineConfig[] {
    return this.getAllConfigs().filter(config =>
      config.features.supportedSearchTypes?.includes(searchType)
    );
  }

  /**
   * Get engines by pricing tier
   */
  static getByPricingTier(tier: 'free' | 'basic' | 'pro' | 'enterprise'): SearchEngineConfig[] {
    return this.getAllConfigs().filter(config =>
      config.metadata?.pricingTier === tier
    );
  }

  /**
   * Get optimal engine for requirements
   */
  static getOptimalEngine(requirements: {
    searchType?: SearchType;
    needsDateRange?: boolean;
    needsCountryFilter?: boolean;
    maxLatency?: number;
    pricingTier?: string;
  }): SearchEngineConfig | undefined {
    let engines = this.getAllConfigs();

    if (requirements.searchType) {
      engines = engines.filter(e => 
        e.features.supportedSearchTypes?.includes(requirements.searchType!)
      );
    }

    if (requirements.needsDateRange) {
      engines = engines.filter(e => e.features.supportsDateRange);
    }

    if (requirements.needsCountryFilter) {
      engines = engines.filter(e => e.features.supportsCountry);
    }

    if (requirements.maxLatency) {
      engines = engines.filter(e => e.timeout <= requirements.maxLatency!);
    }

    if (requirements.pricingTier) {
      engines = engines.filter(e => e.metadata?.pricingTier === requirements.pricingTier);
    }

    // Return highest priority engine that meets requirements
    return engines.sort((a, b) => a.priority - b.priority)[0];
  }

  /**
   * Validate engine configuration
   */
  static validateConfig(config: SearchEngineConfig): string[] {
    const errors: string[] = [];

    if (!config.id || !config.name) {
      errors.push('Engine must have id and name');
    }

    if (config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }

    if (config.rateLimit.requests <= 0 || config.rateLimit.window <= 0) {
      errors.push('Rate limit configuration invalid');
    }

    if (!config.endpoints.base || !config.endpoints.search) {
      errors.push('Base and search endpoints required');
    }

    return errors;
  }

  /**
   * Get engine statistics
   */
  static getEngineStats(engineId: string): any {
    return this.stats.get(engineId) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastUsed: null,
      quotaUsed: 0,
      errorRate: 0
    };
  }

  /**
   * Update engine statistics
   */
  static updateStats(engineId: string, stats: Partial<any>): void {
    const current = this.getEngineStats(engineId);
    this.stats.set(engineId, { ...current, ...stats });
  }
}

// Export convenience functions
export const getSearchEngineConfig = (id: string) => 
  SearchEngineConfigManager.getConfig(id);

export const getPriorityEngines = () => 
  SearchEngineConfigManager.getByPriority();

export const getFreeSearchEngines = () => 
  SearchEngineConfigManager.getByPricingTier('free');

export const getNewsSearchEngines = () => 
  SearchEngineConfigManager.getBySearchType(SearchType.NEWS);
