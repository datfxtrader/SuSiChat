
import { 
  FinancialTerm,
  TermCategory,
  TermSubcategory,
  TermSearchResult,
  RelevanceScore
} from '../../types/financial-terms.types';
import { 
  FINANCIAL_TERMS,
  FinancialTermsManager,
  findFinancialTerms,
  isFinancialText
} from '../config/financial-terms.config';

export class FinancialTermsService {
  /**
   * Analyze text for financial terms and context
   */
  static analyzeText(text: string): {
    isFinancial: boolean;
    relevanceScore: RelevanceScore;
    foundTerms: TermSearchResult[];
    primaryCategory?: TermCategory;
    suggestions: string[];
  } {
    const foundTerms = findFinancialTerms(text);
    const relevanceScore = FinancialTermsManager.calculateRelevanceScore(text);
    const isFinancial = isFinancialText(text);

    // Determine primary category
    let primaryCategory: TermCategory | undefined;
    if (Object.keys(relevanceScore.categories).length > 0) {
      primaryCategory = Object.entries(relevanceScore.categories)
        .sort(([,a], [,b]) => b - a)[0][0] as TermCategory;
    }

    // Generate suggestions for related terms
    const suggestions = this.generateSuggestions(foundTerms, primaryCategory);

    return {
      isFinancial,
      relevanceScore,
      foundTerms,
      primaryCategory,
      suggestions
    };
  }

  /**
   * Generate related term suggestions
   */
  private static generateSuggestions(
    foundTerms: TermSearchResult[], 
    primaryCategory?: TermCategory
  ): string[] {
    const suggestions = new Set<string>();

    // Add related terms from found terms
    for (const { term } of foundTerms) {
      const relatedTerms = FinancialTermsManager.getRelatedTerms(term.normalized);
      relatedTerms.forEach(t => suggestions.add(t));
    }

    // Add high-weight terms from primary category
    if (primaryCategory) {
      const categoryTerms = FinancialTermsManager.getByCategory(primaryCategory)
        .filter(t => t.weight >= 0.8)
        .slice(0, 5);
      categoryTerms.forEach(t => suggestions.add(t.term));
    }

    return Array.from(suggestions).slice(0, 10);
  }

  /**
   * Get term details by normalized name
   */
  static getTermDetails(normalized: string): FinancialTerm | null {
    return FINANCIAL_TERMS.find(t => t.normalized === normalized) || null;
  }

  /**
   * Search terms with filters
   */
  static searchTerms(query: string, filters?: {
    category?: TermCategory;
    subcategory?: TermSubcategory;
    minWeight?: number;
    tradingRelevance?: 'high' | 'medium' | 'low';
  }): FinancialTerm[] {
    let results = FinancialTermsManager.searchTerms(query);

    if (filters) {
      if (filters.category) {
        results = results.filter(t => t.category === filters.category);
      }
      if (filters.subcategory) {
        results = results.filter(t => t.subcategory === filters.subcategory);
      }
      if (filters.minWeight !== undefined) {
        results = results.filter(t => t.weight >= filters.minWeight!);
      }
      if (filters.tradingRelevance) {
        results = results.filter(t => 
          t.metadata?.tradingRelevance === filters.tradingRelevance
        );
      }
    }

    return results.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get terms by category with metadata
   */
  static getTermsByCategory(category: TermCategory): {
    category: TermCategory;
    terms: FinancialTerm[];
    totalWeight: number;
    subcategories: TermSubcategory[];
  } {
    const terms = FinancialTermsManager.getByCategory(category);
    const totalWeight = terms.reduce((sum, t) => sum + t.weight, 0);
    const subcategories = Array.from(new Set(
      terms.map(t => t.subcategory).filter(Boolean)
    )) as TermSubcategory[];

    return {
      category,
      terms,
      totalWeight,
      subcategories
    };
  }

  /**
   * Extract financial entities from query for search enhancement
   */
  static extractFinancialEntities(query: string): {
    pairs: string[];
    symbols: string[];
    concepts: string[];
    indicators: string[];
    timeframes: string[];
  } {
    const foundTerms = findFinancialTerms(query);
    
    const pairs: string[] = [];
    const symbols: string[] = [];
    const concepts: string[] = [];
    const indicators: string[] = [];
    const timeframes: string[] = [];

    for (const { term } of foundTerms) {
      switch (term.subcategory) {
        case TermSubcategory.MAJOR_PAIRS:
        case TermSubcategory.MINOR_PAIRS:
        case TermSubcategory.EXOTIC_PAIRS:
          pairs.push(term.term);
          break;
        case TermSubcategory.MAJOR_COINS:
        case TermSubcategory.INDICES:
          symbols.push(term.term);
          break;
        case TermSubcategory.FOREX_CONCEPTS:
        case TermSubcategory.BLOCKCHAIN_CONCEPTS:
          concepts.push(term.term);
          break;
        case TermSubcategory.INDICATORS:
        case TermSubcategory.CHART_PATTERNS:
          indicators.push(term.term);
          break;
      }

      // Extract timeframes from metadata
      if (term.metadata?.timeframe) {
        timeframes.push(term.metadata.timeframe);
      }
    }

    return { pairs, symbols, concepts, indicators, timeframes };
  }

  /**
   * Get term statistics
   */
  static getTermStatistics(): {
    totalTerms: number;
    byCategory: Record<TermCategory, number>;
    bySubcategory: Record<TermSubcategory, number>;
    byWeight: {
      high: number; // >= 0.8
      medium: number; // 0.5-0.8
      low: number; // < 0.5
    };
    highestWeight: FinancialTerm;
    mostAliases: FinancialTerm;
  } {
    const byCategory: Record<string, number> = {};
    const bySubcategory: Record<string, number> = {};
    let high = 0, medium = 0, low = 0;
    let highestWeight = FINANCIAL_TERMS[0];
    let mostAliases = FINANCIAL_TERMS[0];

    for (const term of FINANCIAL_TERMS) {
      // Count by category
      byCategory[term.category] = (byCategory[term.category] || 0) + 1;
      
      // Count by subcategory
      if (term.subcategory) {
        bySubcategory[term.subcategory] = (bySubcategory[term.subcategory] || 0) + 1;
      }

      // Count by weight
      if (term.weight >= 0.8) high++;
      else if (term.weight >= 0.5) medium++;
      else low++;

      // Track highest weight
      if (term.weight > highestWeight.weight) {
        highestWeight = term;
      }

      // Track most aliases
      const aliasCount = term.aliases?.length || 0;
      const mostAliasCount = mostAliases.aliases?.length || 0;
      if (aliasCount > mostAliasCount) {
        mostAliases = term;
      }
    }

    return {
      totalTerms: FINANCIAL_TERMS.length,
      byCategory: byCategory as Record<TermCategory, number>,
      bySubcategory: bySubcategory as Record<TermSubcategory, number>,
      byWeight: { high, medium, low },
      highestWeight,
      mostAliases
    };
  }
}
