
import { 
  FinancialSource, 
  SourceCategory, 
  SourceSubcategory, 
  DataType, 
  UpdateFrequency,
  SourceFeatures
} from '../../types/financial-source.types';

/**
 * Comprehensive financial sources configuration with detailed metadata
 */
export const FINANCIAL_SOURCES: readonly FinancialSource[] = Object.freeze([
  {
    id: 'bloomberg',
    title: 'Bloomberg Markets',
    url: 'https://www.bloomberg.com/markets',
    domain: 'bloomberg.com',
    category: SourceCategory.NEWS,
    subcategories: [
      SourceSubcategory.MARKET_NEWS,
      SourceSubcategory.ECONOMIC_DATA,
      SourceSubcategory.FUNDAMENTAL_ANALYSIS
    ],
    reliability: 0.95,
    features: {
      realTimeData: true,
      historicalData: true,
      newsArticles: true,
      analysis: true,
      charts: true,
      screeners: true,
      alerts: true,
      api: true,
      mobileApp: true,
      widgets: true
    },
    dataTypes: [
      DataType.FOREX,
      DataType.STOCKS,
      DataType.COMMODITIES,
      DataType.INDICES,
      DataType.BONDS,
      DataType.CRYPTO
    ],
    coverage: {
      geographic: [{ region: 'global' }],
      markets: [
        { type: DataType.FOREX, coverage: 'comprehensive' },
        { type: DataType.STOCKS, coverage: 'comprehensive', instruments: 100000 },
        { type: DataType.COMMODITIES, coverage: 'comprehensive' },
        { type: DataType.BONDS, coverage: 'comprehensive' }
      ],
      exchanges: ['NYSE', 'NASDAQ', 'LSE', 'TSE', 'HKEX', 'SSE', 'BSE'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ar', 'ru'],
      timeZones: ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Hong_Kong']
    },
    access: {
      requiresRegistration: false,
      freeAccess: true,
      paidTiers: [
        {
          name: 'Bloomberg Professional',
          price: 2000,
          currency: 'USD',
          period: 'monthly',
          features: ['Terminal Access', 'Real-time Data', 'Advanced Analytics', 'API Access']
        }
      ],
      apiAccess: {
        available: true,
        documentation: 'https://www.bloomberg.com/professional/support/api-library/',
        authentication: 'api_key',
        formats: ['JSON', 'XML', 'CSV'],
        websocket: true
      }
    },
    quality: {
      dataAccuracy: 0.98,
      updateFrequency: UpdateFrequency.REALTIME,
      dataDepth: 'deep',
      userRating: 4.7,
      professionalGrade: true
    },
    metadata: {
      established: 1981,
      company: 'Bloomberg L.P.',
      headquarters: 'New York, USA',
      description: 'Leading global provider of financial data, analytics, and news',
      specialties: ['Financial Data', 'Market News', 'Analytics', 'Terminal Services'],
      certifications: ['ISO 27001', 'SOC 2'],
      awards: ['Best Financial Data Provider 2023'],
      userBase: '325,000+ Terminal users',
      lastReviewed: '2024-03-01'
    }
  },

  {
    id: 'reuters',
    title: 'Reuters Finance',
    url: 'https://www.reuters.com/finance/',
    domain: 'reuters.com',
    category: SourceCategory.NEWS,
    subcategories: [
      SourceSubcategory.MARKET_NEWS,
      SourceSubcategory.ECONOMIC_DATA,
      SourceSubcategory.REALTIME_QUOTES
    ],
    reliability: 0.95,
    features: {
      realTimeData: true,
      historicalData: true,
      newsArticles: true,
      analysis: true,
      charts: true,
      screeners: false,
      alerts: true,
      api: true,
      mobileApp: true,
      widgets: false
    },
    dataTypes: [
      DataType.FOREX,
      DataType.STOCKS,
      DataType.COMMODITIES,
      DataType.INDICES
    ],
    coverage: {
      geographic: [{ region: 'global' }],
      markets: [
        { type: DataType.FOREX, coverage: 'comprehensive' },
        { type: DataType.STOCKS, coverage: 'major', instruments: 50000 },
        { type: DataType.COMMODITIES, coverage: 'major' }
      ],
      exchanges: ['NYSE', 'NASDAQ', 'LSE', 'TSE', 'FSE', 'Euronext'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ar'],
      timeZones: ['America/New_York', 'Europe/London', 'Asia/Tokyo']
    },
    access: {
      requiresRegistration: false,
      freeAccess: true,
      paidTiers: [
        {
          name: 'Reuters Eikon',
          price: 1800,
          currency: 'USD',
          period: 'monthly',
          features: ['Real-time Data', 'Advanced Analytics', 'News Feed', 'API Access']
        }
      ],
      rateLimit: {
        requests: 1000,
        window: 3600,
        authenticated: 5000
      }
    },
    quality: {
      dataAccuracy: 0.97,
      updateFrequency: UpdateFrequency.REALTIME,
      dataDepth: 'deep',
      userRating: 4.6,
      professionalGrade: true
    },
    metadata: {
      established: 1851,
      company: 'Thomson Reuters Corporation',
      headquarters: 'Toronto, Canada',
      description: 'Global news and financial information provider',
      specialties: ['Breaking News', 'Financial Data', 'Market Analysis'],
      certifications: ['ISO 27001'],
      userBase: '400,000+ professionals',
      lastReviewed: '2024-03-01'
    }
  },

  {
    id: 'investing-com',
    title: 'Investing.com',
    url: 'https://www.investing.com/',
    domain: 'investing.com',
    category: SourceCategory.DATA,
    subcategories: [
      SourceSubcategory.REALTIME_QUOTES,
      SourceSubcategory.HISTORICAL_DATA,
      SourceSubcategory.ECONOMIC_DATA,
      SourceSubcategory.TECHNICAL_ANALYSIS
    ],
    reliability: 0.9,
    features: {
      realTimeData: true,
      historicalData: true,
      newsArticles: true,
      analysis: true,
      charts: true,
      screeners: true,
      alerts: true,
      api: false,
      mobileApp: true,
      widgets: true
    },
    dataTypes: [
      DataType.FOREX,
      DataType.STOCKS,
      DataType.CRYPTO,
      DataType.COMMODITIES,
      DataType.INDICES,
      DataType.BONDS,
      DataType.ETFS
    ],
    coverage: {
      geographic: [{ region: 'global' }],
      markets: [
        { type: DataType.FOREX, coverage: 'comprehensive' },
        { type: DataType.STOCKS, coverage: 'comprehensive', instruments: 80000 },
        { type: DataType.CRYPTO, coverage: 'comprehensive', instruments: 2000 }
      ],
      exchanges: ['Global coverage - 100+ exchanges'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'ru', 'tr', 'ar', 'he', 'ja', 'ko', 'zh', 'hi'],
      timeZones: ['All major time zones']
    },
    access: {
      requiresRegistration: false,
      freeAccess: true,
      paidTiers: [
        {
          name: 'Pro',
          price: 24.95,
          currency: 'USD',
          period: 'monthly',
          features: ['Ad-free', 'Advanced Charts', 'Priority Support']
        }
      ],
      rateLimit: {
        requests: 100,
        window: 60
      }
    },
    quality: {
      dataAccuracy: 0.92,
      updateFrequency: UpdateFrequency.REALTIME,
      dataDepth: 'moderate',
      userRating: 4.4,
      professionalGrade: false
    },
    metadata: {
      established: 2007,
      company: 'Investing.com',
      headquarters: 'Nicosia, Cyprus',
      description: 'Popular financial portal for retail investors and traders',
      specialties: ['Real-time Quotes', 'Economic Calendar', 'Technical Analysis'],
      userBase: '50+ million monthly users',
      lastReviewed: '2024-03-01'
    }
  },

  {
    id: 'tradingview',
    title: 'TradingView',
    url: 'https://www.tradingview.com/',
    domain: 'tradingview.com',
    category: SourceCategory.CHARTS,
    subcategories: [
      SourceSubcategory.TECHNICAL_ANALYSIS,
      SourceSubcategory.REALTIME_QUOTES,
      SourceSubcategory.HISTORICAL_DATA
    ],
    reliability: 0.9,
    features: {
      realTimeData: true,
      historicalData: true,
      newsArticles: false,
      analysis: true,
      charts: true,
      screeners: true,
      alerts: true,
      api: true,
      mobileApp: true,
      widgets: true
    },
    dataTypes: [
      DataType.FOREX,
      DataType.STOCKS,
      DataType.CRYPTO,
      DataType.COMMODITIES,
      DataType.INDICES,
      DataType.FUTURES
    ],
    coverage: {
      geographic: [{ region: 'global' }],
      markets: [
        { type: DataType.FOREX, coverage: 'comprehensive' },
        { type: DataType.STOCKS, coverage: 'comprehensive', instruments: 100000 },
        { type: DataType.CRYPTO, coverage: 'comprehensive', instruments: 10000 }
      ],
      exchanges: ['All major global exchanges'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'tr', 'th', 'ja', 'ko', 'zh', 'vi'],
      timeZones: ['All time zones']
    },
    access: {
      requiresRegistration: true,
      freeAccess: true,
      paidTiers: [
        {
          name: 'Pro',
          price: 14.95,
          currency: 'USD',
          period: 'monthly',
          features: ['Multiple Charts', 'No Ads', 'More Indicators']
        },
        {
          name: 'Pro+',
          price: 29.95,
          currency: 'USD',
          period: 'monthly',
          features: ['Intraday Data', 'Extended Hours', 'More Alerts']
        },
        {
          name: 'Premium',
          price: 59.95,
          currency: 'USD',
          period: 'monthly',
          features: ['Tick Data', 'Priority Support', 'Advanced Features']
        }
      ],
      apiAccess: {
        available: true,
        documentation: 'https://www.tradingview.com/rest-api-spec/',
        authentication: 'api_key',
        formats: ['JSON'],
        websocket: true
      }
    },
    quality: {
      dataAccuracy: 0.93,
      updateFrequency: UpdateFrequency.REALTIME,
      dataDepth: 'deep',
      userRating: 4.8,
      professionalGrade: true
    },
    metadata: {
      established: 2011,
      company: 'TradingView Inc.',
      headquarters: 'Chicago, USA',
      description: 'Leading charting platform and social network for traders',
      specialties: ['Advanced Charting', 'Technical Analysis', 'Social Trading', 'Pine Script'],
      awards: ['Best Trading Platform 2023'],
      userBase: '50+ million traders',
      lastReviewed: '2024-03-01'
    }
  },

  {
    id: 'fxstreet',
    title: 'FXStreet',
    url: 'https://www.fxstreet.com/',
    domain: 'fxstreet.com',
    category: SourceCategory.ANALYSIS,
    subcategories: [
      SourceSubcategory.TECHNICAL_ANALYSIS,
      SourceSubcategory.FUNDAMENTAL_ANALYSIS,
      SourceSubcategory.MARKET_NEWS
    ],
    reliability: 0.85,
    features: {
      realTimeData: true,
      historicalData: false,
      newsArticles: true,
      analysis: true,
      charts: true,
      screeners: false,
      alerts: true,
      api: false,
      mobileApp: true,
      widgets: true
    },
    dataTypes: [DataType.FOREX, DataType.COMMODITIES, DataType.CRYPTO],
    coverage: {
      geographic: [{ region: 'global' }],
      markets: [
        { type: DataType.FOREX, coverage: 'comprehensive' },
        { type: DataType.COMMODITIES, coverage: 'major' },
        { type: DataType.CRYPTO, coverage: 'major' }
      ],
      exchanges: ['Forex markets'],
      languages: ['en', 'es', 'fr', 'it', 'pt', 'ru', 'ar', 'tr', 'zh'],
      timeZones: ['All major trading sessions']
    },
    access: {
      requiresRegistration: false,
      freeAccess: true,
      paidTiers: [
        {
          name: 'Premium',
          price: 49,
          currency: 'USD',
          period: 'monthly',
          features: ['Premium Analysis', 'Trading Signals', 'Webinars']
        }
      ]
    },
    quality: {
      dataAccuracy: 0.88,
      updateFrequency: UpdateFrequency.MINUTES,
      dataDepth: 'moderate',
      userRating: 4.2,
      professionalGrade: false
    },
    metadata: {
      established: 2000,
      company: 'FXStreet Network',
      headquarters: 'Barcelona, Spain',
      description: 'Leading forex news and analysis portal',
      specialties: ['Forex Analysis', 'Economic Calendar', 'Trading Education'],
      userBase: '9+ million monthly users',
      lastReviewed: '2024-03-01'
    }
  },

  {
    id: 'dailyfx',
    title: 'DailyFX',
    url: 'https://www.dailyfx.com/',
    domain: 'dailyfx.com',
    category: SourceCategory.ANALYSIS,
    subcategories: [
      SourceSubcategory.TECHNICAL_ANALYSIS,
      SourceSubcategory.FUNDAMENTAL_ANALYSIS,
      SourceSubcategory.SENTIMENT
    ],
    reliability: 0.85,
    features: {
      realTimeData: true,
      historicalData: false,
      newsArticles: true,
      analysis: true,
      charts: true,
      screeners: false,
      alerts: true,
      api: false,
      mobileApp: true,
      widgets: false
    },
    dataTypes: [DataType.FOREX, DataType.COMMODITIES, DataType.INDICES],
    coverage: {
      geographic: [{ region: 'global' }],
      markets: [
        { type: DataType.FOREX, coverage: 'comprehensive' },
        { type: DataType.COMMODITIES, coverage: 'major' },
        { type: DataType.INDICES, coverage: 'major' }
      ],
      exchanges: ['Major forex pairs and CFDs'],
      languages: ['en', 'de', 'fr', 'it', 'es', 'ar', 'zh'],
      timeZones: ['All major trading sessions']
    },
    access: {
      requiresRegistration: false,
      freeAccess: true,
      paidTiers: []
    },
    quality: {
      dataAccuracy: 0.87,
      updateFrequency: UpdateFrequency.HOURLY,
      dataDepth: 'moderate',
      userRating: 4.3,
      professionalGrade: false
    },
    metadata: {
      established: 2004,
      company: 'IG Group',
      headquarters: 'London, UK',
      description: 'Forex news and education portal by IG Group',
      specialties: ['Forex Education', 'Market Analysis', 'Trading Strategies'],
      userBase: '5+ million monthly users',
      lastReviewed: '2024-03-01'
    }
  }
]);

// Helper functions and source manager
export class FinancialSourceManager {
  private static readonly sources = new Map(
    FINANCIAL_SOURCES.map(source => [source.id, source])
  );

  /**
   * Get source by ID
   */
  static getById(id: string): FinancialSource | undefined {
    return this.sources.get(id);
  }

  /**
   * Get sources by category
   */
  static getByCategory(category: SourceCategory): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => source.category === category);
  }

  /**
   * Get sources by data type
   */
  static getByDataType(dataType: DataType): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.dataTypes.includes(dataType)
    );
  }

  /**
   * Get sources by reliability threshold
   */
  static getByReliability(minReliability: number): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.reliability >= minReliability
    );
  }

  /**
   * Get sources with specific feature
   */
  static getByFeature(feature: keyof SourceFeatures): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.features[feature] === true
    );
  }

  /**
   * Get free sources
   */
  static getFreeSources(): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.access.freeAccess === true
    );
  }

  /**
   * Get sources with API access
   */
  static getWithAPI(): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.access.apiAccess?.available === true
    );
  }

  /**
   * Get sources by language
   */
  static getByLanguage(language: string): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.coverage.languages.includes(language)
    );
  }

  /**
   * Get professional grade sources
   */
  static getProfessionalSources(): FinancialSource[] {
    return FINANCIAL_SOURCES.filter(source => 
      source.quality.professionalGrade === true
    );
  }

  /**
   * Get best source for specific needs
   */
  static getBestSource(criteria: {
    dataType: DataType;
    category?: SourceCategory;
    needsAPI?: boolean;
    needsRealtime?: boolean;
    maxPrice?: number;
    preferredLanguage?: string;
  }): FinancialSource | undefined {
    let candidates = this.getByDataType(criteria.dataType);

    if (criteria.category) {
      candidates = candidates.filter(s => s.category === criteria.category);
    }

    if (criteria.needsAPI) {
      candidates = candidates.filter(s => s.access.apiAccess?.available);
    }

    if (criteria.needsRealtime) {
      candidates = candidates.filter(s => 
        s.quality.updateFrequency === UpdateFrequency.REALTIME
      );
    }

    if (criteria.maxPrice !== undefined) {
      candidates = candidates.filter(s => {
        if (s.access.freeAccess) return true;
        const lowestPrice = Math.min(
          ...s.access.paidTiers.map(tier => tier.price)
        );
        return lowestPrice <= criteria.maxPrice;
      });
    }

    if (criteria.preferredLanguage) {
      candidates = candidates.filter(s => 
        s.coverage.languages.includes(criteria.preferredLanguage)
      );
    }

    // Sort by reliability and return the best
    return candidates.sort((a, b) => b.reliability - a.reliability)[0];
  }

  /**
   * Get source comparison
   */
  static compareFeatures(...sourceIds: string[]): Record<string, any> {
    const sources = sourceIds
      .map(id => this.getById(id))
      .filter(Boolean) as FinancialSource[];

    const comparison: Record<string, any> = {
      sources: sources.map(s => ({ id: s.id, title: s.title })),
      features: {},
      dataTypes: {},
      quality: {},
      pricing: {}
    };

    // Compare features
    Object.keys(sources[0].features).forEach(feature => {
      comparison.features[feature] = sources.map(s => 
        s.features[feature as keyof SourceFeatures]
      );
    });

    // Compare data types
    const allDataTypes = new Set(sources.flatMap(s => s.dataTypes));
    allDataTypes.forEach(dataType => {
      comparison.dataTypes[dataType] = sources.map(s => 
        s.dataTypes.includes(dataType)
      );
    });

    // Compare quality metrics
    comparison.quality = {
      reliability: sources.map(s => s.reliability),
      accuracy: sources.map(s => s.quality.dataAccuracy),
      updateFrequency: sources.map(s => s.quality.updateFrequency),
      professionalGrade: sources.map(s => s.quality.professionalGrade)
    };

    // Compare pricing
    comparison.pricing = sources.map(s => ({
      free: s.access.freeAccess,
      lowestPaidTier: s.access.paidTiers.length > 0 
        ? Math.min(...s.access.paidTiers.map(t => t.price))
        : null
    }));

    return comparison;
  }
}

// Export convenience functions
export const getDataSources = () => 
  FinancialSourceManager.getByCategory(SourceCategory.DATA);

export const getNewsSources = () => 
  FinancialSourceManager.getByCategory(SourceCategory.NEWS);

export const getAnalysisSources = () => 
  FinancialSourceManager.getByCategory(SourceCategory.ANALYSIS);

export const getChartingSources = () => 
  FinancialSourceManager.getByCategory(SourceCategory.CHARTS);

export const getForexSources = () => 
  FinancialSourceManager.getByDataType(DataType.FOREX);

export const getCryptoSources = () => 
  FinancialSourceManager.getByDataType(DataType.CRYPTO);

export const getReliableSources = (minReliability = 0.9) => 
  FinancialSourceManager.getByReliability(minReliability);

export const getSourceById = (id: string) => 
  FinancialSourceManager.getById(id);
