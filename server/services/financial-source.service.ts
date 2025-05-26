
import { Request, Response } from 'express';
import { 
  FinancialSource,
  SourceCategory,
  SourceSubcategory,
  Region,
  SourceFeatures
} from '../../types/financial-source.types';
import { 
  FINANCIAL_SOURCES,
  FinancialSourceManager,
  getRealtimeSources,
  getNewsSources,
  getAnalysisSources,
  getForexSources,
  getCryptoSources,
  getMostReliableSources
} from '../config/financial-sources.config';

export class FinancialSourceService {
  /**
   * Get all available financial sources
   */
  static getAllSources(): FinancialSource[] {
    return [...FINANCIAL_SOURCES];
  }

  /**
   * Get filtered sources based on criteria
   */
  static getFilteredSources(filters: {
    category?: SourceCategory;
    subcategory?: SourceSubcategory;
    region?: Region;
    minReliability?: number;
    requiresAPI?: boolean;
    features?: Partial<SourceFeatures>;
  }): FinancialSource[] {
    let sources = [...FINANCIAL_SOURCES];

    if (filters.category) {
      sources = FinancialSourceManager.getByCategory(filters.category);
    }

    if (filters.subcategory) {
      sources = sources.filter(source => 
        source.subcategories?.includes(filters.subcategory!)
      );
    }

    if (filters.region) {
      sources = sources.filter(source => 
        source.regions?.includes(filters.region!) || 
        source.regions?.includes(Region.GLOBAL)
      );
    }

    if (filters.minReliability) {
      sources = sources.filter(source => 
        source.reliability >= filters.minReliability!
      );
    }

    if (filters.requiresAPI !== undefined) {
      sources = sources.filter(source => 
        source.apiAvailable === filters.requiresAPI
      );
    }

    if (filters.features) {
      sources = sources.filter(source => 
        Object.entries(filters.features!).every(([key, value]) => 
          !value || source.features[key as keyof SourceFeatures] === value
        )
      );
    }

    return sources.sort((a, b) => b.reliability - a.reliability);
  }

  /**
   * Get recommended sources for a specific query
   */
  static getRecommendedSources(query: string): FinancialSource[] {
    const queryLower = query.toLowerCase();
    const recommendations: FinancialSource[] = [];

    // Detect asset type
    if (queryLower.includes('forex') || queryLower.includes('currency') || 
        queryLower.includes('usd') || queryLower.includes('eur')) {
      recommendations.push(...getForexSources().slice(0, 3));
    }

    if (queryLower.includes('crypto') || queryLower.includes('bitcoin') || 
        queryLower.includes('ethereum')) {
      recommendations.push(...getCryptoSources().slice(0, 3));
    }

    if (queryLower.includes('stock') || queryLower.includes('equity') || 
        queryLower.includes('nasdaq') || queryLower.includes('s&p')) {
      recommendations.push(...FinancialSourceManager.getBySubcategory(SourceSubcategory.STOCKS).slice(0, 3));
    }

    // Detect content type
    if (queryLower.includes('news') || queryLower.includes('latest')) {
      recommendations.push(...getNewsSources().slice(0, 2));
    }

    if (queryLower.includes('analysis') || queryLower.includes('technical') || 
        queryLower.includes('forecast')) {
      recommendations.push(...getAnalysisSources().slice(0, 2));
    }

    if (queryLower.includes('real-time') || queryLower.includes('live') || 
        queryLower.includes('current')) {
      recommendations.push(...getRealtimeSources().slice(0, 2));
    }

    // If no specific matches, return most reliable sources
    if (recommendations.length === 0) {
      recommendations.push(...getMostReliableSources(5));
    }

    // Remove duplicates and sort by reliability
    const uniqueRecommendations = recommendations
      .filter((source, index, arr) => 
        arr.findIndex(s => s.id === source.id) === index
      )
      .sort((a, b) => b.reliability - a.reliability);

    return uniqueRecommendations.slice(0, 5);
  }

  /**
   * Get source metrics and statistics
   */
  static getSourceMetrics(): {
    totalSources: number;
    byCategory: Record<string, number>;
    byReliability: Record<string, number>;
    withAPI: number;
    averageReliability: number;
  } {
    const byCategory: Record<string, number> = {};
    const byReliability: Record<string, number> = {
      'excellent': 0, // 0.9+
      'good': 0,      // 0.8-0.89
      'fair': 0       // <0.8
    };

    let totalReliability = 0;
    let apiCount = 0;

    FINANCIAL_SOURCES.forEach(source => {
      // Category count
      byCategory[source.category] = (byCategory[source.category] || 0) + 1;

      // Reliability bands
      if (source.reliability >= 0.9) {
        byReliability.excellent++;
      } else if (source.reliability >= 0.8) {
        byReliability.good++;
      } else {
        byReliability.fair++;
      }

      totalReliability += source.reliability;

      if (source.apiAvailable) {
        apiCount++;
      }
    });

    return {
      totalSources: FINANCIAL_SOURCES.length,
      byCategory,
      byReliability,
      withAPI: apiCount,
      averageReliability: totalReliability / FINANCIAL_SOURCES.length
    };
  }

  /**
   * Search sources by text
   */
  static searchSources(searchTerm: string): FinancialSource[] {
    const term = searchTerm.toLowerCase();
    
    return FINANCIAL_SOURCES.filter(source => 
      source.title.toLowerCase().includes(term) ||
      source.domain.toLowerCase().includes(term) ||
      source.subcategories?.some(sub => sub.includes(term)) ||
      source.metadata?.specialNotes?.toLowerCase().includes(term)
    ).sort((a, b) => b.reliability - a.reliability);
  }
}
import { 
  FinancialSource,
  SourceCategory,
  SourceSubcategory,
  DataType,
  UpdateFrequency,
  SourceFeatures
} from '../../types/financial-source.types';
import { 
  FINANCIAL_SOURCES,
  FinancialSourceManager,
  getDataSources,
  getNewsSources,
  getAnalysisSources,
  getChartingSources,
  getForexSources,
  getCryptoSources,
  getReliableSources,
  getSourceById
} from '../config/financial-sources.config';

export class FinancialSourceService {
  /**
   * Get all financial sources
   */
  static getAllSources(): FinancialSource[] {
    return [...FINANCIAL_SOURCES];
  }

  /**
   * Search sources by query
   */
  static searchSources(query: string, filters?: {
    category?: SourceCategory;
    dataType?: DataType;
    minReliability?: number;
    freeOnly?: boolean;
    apiRequired?: boolean;
    language?: string;
  }): FinancialSource[] {
    const queryLower = query.toLowerCase();
    let results = FINANCIAL_SOURCES.filter(source => 
      source.title.toLowerCase().includes(queryLower) ||
      source.description?.toLowerCase().includes(queryLower) ||
      source.domain.toLowerCase().includes(queryLower) ||
      source.metadata.company.toLowerCase().includes(queryLower) ||
      source.metadata.specialties.some(specialty => 
        specialty.toLowerCase().includes(queryLower)
      )
    );

    if (filters) {
      if (filters.category) {
        results = results.filter(s => s.category === filters.category);
      }
      
      if (filters.dataType) {
        results = results.filter(s => s.dataTypes.includes(filters.dataType!));
      }
      
      if (filters.minReliability !== undefined) {
        results = results.filter(s => s.reliability >= filters.minReliability!);
      }
      
      if (filters.freeOnly) {
        results = results.filter(s => s.access.freeAccess);
      }
      
      if (filters.apiRequired) {
        results = results.filter(s => s.access.apiAccess?.available);
      }
      
      if (filters.language) {
        results = results.filter(s => 
          s.coverage.languages.includes(filters.language!)
        );
      }
    }

    return results.sort((a, b) => b.reliability - a.reliability);
  }

  /**
   * Get source recommendations based on requirements
   */
  static getRecommendations(requirements: {
    dataTypes: DataType[];
    features: Partial<SourceFeatures>;
    budget?: number;
    professionalGrade?: boolean;
    realtime?: boolean;
  }): {
    primary: FinancialSource[];
    alternatives: FinancialSource[];
    budget: FinancialSource[];
  } {
    const allCandidates = FINANCIAL_SOURCES.filter(source => {
      // Must support at least one required data type
      const supportsDataType = requirements.dataTypes.some(dt => 
        source.dataTypes.includes(dt)
      );
      if (!supportsDataType) return false;

      // Must have required features
      const hasFeatures = Object.entries(requirements.features).every(
        ([feature, required]) => !required || source.features[feature as keyof SourceFeatures]
      );
      if (!hasFeatures) return false;

      // Professional grade filter
      if (requirements.professionalGrade !== undefined) {
        if (source.quality.professionalGrade !== requirements.professionalGrade) {
          return false;
        }
      }

      // Realtime filter
      if (requirements.realtime) {
        if (source.quality.updateFrequency !== UpdateFrequency.REALTIME) {
          return false;
        }
      }

      return true;
    });

    // Sort by reliability
    const sorted = allCandidates.sort((a, b) => b.reliability - a.reliability);

    // Categorize recommendations
    const primary = sorted.filter(s => s.reliability >= 0.9).slice(0, 3);
    const alternatives = sorted.filter(s => 
      s.reliability >= 0.8 && s.reliability < 0.9
    ).slice(0, 5);
    
    const budget = requirements.budget 
      ? sorted.filter(s => {
          if (s.access.freeAccess) return true;
          const lowestPrice = s.access.paidTiers.length > 0 
            ? Math.min(...s.access.paidTiers.map(t => t.price))
            : Infinity;
          return lowestPrice <= requirements.budget!;
        }).slice(0, 5)
      : sorted.filter(s => s.access.freeAccess).slice(0, 5);

    return { primary, alternatives, budget };
  }

  /**
   * Get source analytics and metrics
   */
  static getSourceAnalytics(): {
    totalSources: number;
    byCategory: Record<SourceCategory, number>;
    byDataType: Record<DataType, number>;
    averageReliability: number;
    freeSourcesCount: number;
    apiSourcesCount: number;
    professionalGradeCount: number;
    updateFrequencyDistribution: Record<UpdateFrequency, number>;
    topSources: Array<{ id: string; title: string; reliability: number }>;
  } {
    const byCategory: Record<string, number> = {};
    const byDataType: Record<string, number> = {};
    const updateFrequencyDistribution: Record<string, number> = {};
    
    let totalReliability = 0;
    let freeSourcesCount = 0;
    let apiSourcesCount = 0;
    let professionalGradeCount = 0;

    FINANCIAL_SOURCES.forEach(source => {
      // Count by category
      byCategory[source.category] = (byCategory[source.category] || 0) + 1;
      
      // Count by data types
      source.dataTypes.forEach(dataType => {
        byDataType[dataType] = (byDataType[dataType] || 0) + 1;
      });
      
      // Count update frequencies
      const freq = source.quality.updateFrequency;
      updateFrequencyDistribution[freq] = (updateFrequencyDistribution[freq] || 0) + 1;
      
      // Accumulate metrics
      totalReliability += source.reliability;
      if (source.access.freeAccess) freeSourcesCount++;
      if (source.access.apiAccess?.available) apiSourcesCount++;
      if (source.quality.professionalGrade) professionalGradeCount++;
    });

    const topSources = [...FINANCIAL_SOURCES]
      .sort((a, b) => b.reliability - a.reliability)
      .slice(0, 5)
      .map(s => ({ id: s.id, title: s.title, reliability: s.reliability }));

    return {
      totalSources: FINANCIAL_SOURCES.length,
      byCategory: byCategory as Record<SourceCategory, number>,
      byDataType: byDataType as Record<DataType, number>,
      averageReliability: totalReliability / FINANCIAL_SOURCES.length,
      freeSourcesCount,
      apiSourcesCount,
      professionalGradeCount,
      updateFrequencyDistribution: updateFrequencyDistribution as Record<UpdateFrequency, number>,
      topSources
    };
  }

  /**
   * Validate source access and features
   */
  static validateSourceAccess(sourceId: string, requirements: {
    needsAPI?: boolean;
    needsRealtime?: boolean;
    hasSubscription?: boolean;
  }): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const source = FinancialSourceManager.getById(sourceId);
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!source) {
      return {
        valid: false,
        issues: ['Source not found'],
        recommendations: ['Check the source ID']
      };
    }

    // Check API access
    if (requirements.needsAPI && !source.access.apiAccess?.available) {
      issues.push('API access not available');
      recommendations.push('Consider using a source with API access like Bloomberg or TradingView');
    }

    // Check realtime data
    if (requirements.needsRealtime && 
        source.quality.updateFrequency !== UpdateFrequency.REALTIME) {
      issues.push('Real-time data not available');
      recommendations.push('Consider upgrading to a premium tier or use a real-time source');
    }

    // Check subscription requirements
    if (!source.access.freeAccess && !requirements.hasSubscription) {
      issues.push('Subscription required for full access');
      recommendations.push(`Consider subscribing to ${source.title} or use free alternatives`);
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get source coverage for specific markets
   */
  static getMarketCoverage(markets: DataType[]): {
    comprehensive: FinancialSource[];
    major: FinancialSource[];
    limited: FinancialSource[];
  } {
    const comprehensive: FinancialSource[] = [];
    const major: FinancialSource[] = [];
    const limited: FinancialSource[] = [];

    FINANCIAL_SOURCES.forEach(source => {
      const relevantMarkets = source.coverage.markets.filter(market => 
        markets.includes(market.type)
      );

      if (relevantMarkets.length === 0) return;

      const coverageLevel = relevantMarkets.reduce((min, market) => {
        if (market.coverage === 'comprehensive') return min === 'limited' ? 'limited' : 'comprehensive';
        if (market.coverage === 'major') return min === 'limited' ? 'limited' : 'major';
        return 'limited';
      }, 'comprehensive' as 'comprehensive' | 'major' | 'limited');

      if (coverageLevel === 'comprehensive') {
        comprehensive.push(source);
      } else if (coverageLevel === 'major') {
        major.push(source);
      } else {
        limited.push(source);
      }
    });

    return {
      comprehensive: comprehensive.sort((a, b) => b.reliability - a.reliability),
      major: major.sort((a, b) => b.reliability - a.reliability),
      limited: limited.sort((a, b) => b.reliability - a.reliability)
    };
  }

  /**
   * Get cost analysis for source usage
   */
  static getCostAnalysis(sourceIds: string[], usage: {
    apiCalls?: number;
    usersCount?: number;
    period: 'monthly' | 'yearly';
  }): {
    totalCost: number;
    breakdown: Array<{
      sourceId: string;
      sourceName: string;
      cost: number;
      tier: string;
    }>;
    alternatives: Array<{
      sourceId: string;
      sourceName: string;
      cost: number;
      savings: number;
    }>;
  } {
    const breakdown: Array<{
      sourceId: string;
      sourceName: string;
      cost: number;
      tier: string;
    }> = [];

    let totalCost = 0;

    sourceIds.forEach(sourceId => {
      const source = FinancialSourceManager.getById(sourceId);
      if (!source) return;

      if (source.access.freeAccess && source.access.paidTiers.length === 0) {
        breakdown.push({
          sourceId,
          sourceName: source.title,
          cost: 0,
          tier: 'Free'
        });
      } else {
        // Find the most suitable tier
        const tier = source.access.paidTiers[0]; // Default to first tier
        if (tier) {
          const cost = usage.period === 'yearly' && tier.period === 'monthly' 
            ? tier.price * 12 * 0.85 // Assume 15% yearly discount
            : usage.period === 'monthly' && tier.period === 'yearly'
            ? tier.price / 12
            : tier.price;

          breakdown.push({
            sourceId,
            sourceName: source.title,
            cost,
            tier: tier.name
          });
          totalCost += cost;
        }
      }
    });

    // Find cheaper alternatives
    const alternatives = FINANCIAL_SOURCES
      .filter(source => !sourceIds.includes(source.id) && source.access.freeAccess)
      .slice(0, 3)
      .map(source => ({
        sourceId: source.id,
        sourceName: source.title,
        cost: 0,
        savings: totalCost
      }));

    return {
      totalCost,
      breakdown,
      alternatives
    };
  }
}
