
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
