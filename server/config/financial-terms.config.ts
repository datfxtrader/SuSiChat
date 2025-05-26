
// config/financial-terms.config.ts
import { 
  FinancialTerm, 
  TermCategory, 
  TermSubcategory,
  TermSearchResult,
  RelevanceScore
} from '../../types/financial-terms.types';

/**
 * Comprehensive financial terms configuration with metadata
 */
export const FINANCIAL_TERMS: readonly FinancialTerm[] = Object.freeze([
  // ===== FOREX TERMS =====
  // Major Currency Pairs
  {
    term: 'EUR/USD',
    normalized: 'eur/usd',
    category: TermCategory.FOREX,
    subcategory: TermSubcategory.MAJOR_PAIRS,
    weight: 0.95,
    aliases: ['eurusd', 'euro dollar', 'fiber'],
    patterns: [/eur[\s\/\-]?usd/i],
    metadata: {
      fullForm: 'Euro/US Dollar',
      tradingRelevance: 'high',
      definition: 'Most traded currency pair globally'
    }
  },
  {
    term: 'GBP/USD',
    normalized: 'gbp/usd',
    category: TermCategory.FOREX,
    subcategory: TermSubcategory.MAJOR_PAIRS,
    weight: 0.9,
    aliases: ['gbpusd', 'pound dollar', 'cable'],
    patterns: [/gbp[\s\/\-]?usd/i],
    metadata: {
      fullForm: 'British Pound/US Dollar',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'USD/JPY',
    normalized: 'usd/jpy',
    category: TermCategory.FOREX,
    subcategory: TermSubcategory.MAJOR_PAIRS,
    weight: 0.9,
    aliases: ['usdjpy', 'dollar yen', 'ninja'],
    patterns: [/usd[\s\/\-]?jpy/i],
    metadata: {
      fullForm: 'US Dollar/Japanese Yen',
      tradingRelevance: 'high'
    }
  },
  
  // Forex Concepts
  {
    term: 'pip',
    normalized: 'pip',
    category: TermCategory.FOREX,
    subcategory: TermSubcategory.FOREX_CONCEPTS,
    weight: 0.8,
    aliases: ['pips', 'point in percentage'],
    metadata: {
      acronym: 'PIP',
      fullForm: 'Percentage In Point',
      definition: 'Smallest price move in forex trading',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'spread',
    normalized: 'spread',
    category: TermCategory.FOREX,
    subcategory: TermSubcategory.FOREX_CONCEPTS,
    weight: 0.75,
    context: {
      relatedTerms: ['bid', 'ask', 'liquidity'],
      commonPhrases: ['bid-ask spread', 'tight spread', 'spread widening']
    }
  },
  {
    term: 'leverage',
    normalized: 'leverage',
    category: TermCategory.FOREX,
    subcategory: TermSubcategory.FOREX_CONCEPTS,
    weight: 0.8,
    aliases: ['margin trading', 'gearing'],
    patterns: [/\d+:\d+/], // matches leverage ratios like 100:1
    context: {
      relatedTerms: ['margin', 'risk', 'position size'],
      commonPhrases: ['high leverage', 'leverage ratio', '100:1 leverage']
    }
  },

  // ===== STOCK TERMS =====
  // Indices
  {
    term: 'S&P 500',
    normalized: 'sp500',
    category: TermCategory.STOCKS,
    subcategory: TermSubcategory.INDICES,
    weight: 0.95,
    aliases: ['s&p', 'spx', 'sp 500', 'standard and poors'],
    patterns: [/s\s*&\s*p\s*500/i, /spx/i],
    metadata: {
      fullForm: 'Standard & Poor\'s 500',
      definition: 'US stock market index of 500 large companies',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'NASDAQ',
    normalized: 'nasdaq',
    category: TermCategory.STOCKS,
    subcategory: TermSubcategory.INDICES,
    weight: 0.9,
    aliases: ['nasdaq composite', 'ixic', 'nas'],
    patterns: [/nasdaq/i, /ixic/i],
    metadata: {
      definition: 'US tech-heavy stock market index',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'Dow Jones',
    normalized: 'dow',
    category: TermCategory.STOCKS,
    subcategory: TermSubcategory.INDICES,
    weight: 0.9,
    aliases: ['djia', 'dow', 'the dow', 'dow 30'],
    patterns: [/dow\s*jones/i, /djia/i],
    metadata: {
      acronym: 'DJIA',
      fullForm: 'Dow Jones Industrial Average',
      definition: 'Price-weighted index of 30 major US companies',
      tradingRelevance: 'high'
    }
  },

  // Stock Metrics
  {
    term: 'P/E ratio',
    normalized: 'pe_ratio',
    category: TermCategory.STOCKS,
    subcategory: TermSubcategory.METRICS,
    weight: 0.8,
    aliases: ['pe', 'price earnings', 'price/earnings', 'p/e'],
    patterns: [/p\s*\/?\s*e\s*ratio/i],
    metadata: {
      fullForm: 'Price-to-Earnings Ratio',
      definition: 'Stock price divided by earnings per share',
      tradingRelevance: 'high',
      timeframe: 'medium'
    }
  },
  {
    term: 'market cap',
    normalized: 'market_cap',
    category: TermCategory.STOCKS,
    subcategory: TermSubcategory.METRICS,
    weight: 0.75,
    aliases: ['market capitalization', 'mcap'],
    patterns: [/market\s*cap/i],
    context: {
      relatedTerms: ['large cap', 'mid cap', 'small cap', 'micro cap'],
      commonPhrases: ['market cap weighted', 'total market cap']
    }
  },

  // ===== COMMODITY TERMS =====
  // Precious Metals
  {
    term: 'gold',
    normalized: 'gold',
    category: TermCategory.COMMODITIES,
    subcategory: TermSubcategory.PRECIOUS_METALS,
    weight: 0.9,
    aliases: ['xau', 'gc', 'gold futures'],
    patterns: [/gold/i, /xau/i],
    context: {
      relatedTerms: ['safe haven', 'inflation hedge'],
      commonPhrases: ['gold price', 'spot gold', 'gold rally']
    },
    metadata: {
      acronym: 'XAU',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'silver',
    normalized: 'silver',
    category: TermCategory.COMMODITIES,
    subcategory: TermSubcategory.PRECIOUS_METALS,
    weight: 0.85,
    aliases: ['xag', 'si', 'silver futures'],
    patterns: [/silver/i, /xag/i],
    metadata: {
      acronym: 'XAG',
      tradingRelevance: 'medium'
    }
  },

  // Energy
  {
    term: 'crude oil',
    normalized: 'crude_oil',
    category: TermCategory.COMMODITIES,
    subcategory: TermSubcategory.ENERGY,
    weight: 0.9,
    aliases: ['oil', 'cl', 'crude'],
    patterns: [/crude\s*oil/i, /\boil\b/i],
    context: {
      relatedTerms: ['wti', 'brent', 'opec'],
      narrowerTerms: ['wti crude', 'brent crude']
    }
  },
  {
    term: 'WTI',
    normalized: 'wti',
    category: TermCategory.COMMODITIES,
    subcategory: TermSubcategory.ENERGY,
    weight: 0.85,
    aliases: ['west texas intermediate', 'wti crude', 'us oil'],
    patterns: [/wti/i, /west\s*texas/i],
    metadata: {
      fullForm: 'West Texas Intermediate',
      definition: 'US crude oil benchmark',
      tradingRelevance: 'high'
    }
  },

  // ===== CRYPTO TERMS =====
  // Major Coins
  {
    term: 'Bitcoin',
    normalized: 'bitcoin',
    category: TermCategory.CRYPTO,
    subcategory: TermSubcategory.MAJOR_COINS,
    weight: 0.95,
    aliases: ['btc', 'xbt', 'bitcoin/usd', 'btcusd'],
    patterns: [/bitcoin/i, /btc/i, /xbt/i],
    context: {
      relatedTerms: ['satoshi', 'halving', 'mining'],
      commonPhrases: ['bitcoin price', 'btc dominance', 'bitcoin rally']
    },
    metadata: {
      acronym: 'BTC',
      definition: 'First and largest cryptocurrency',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'Ethereum',
    normalized: 'ethereum',
    category: TermCategory.CRYPTO,
    subcategory: TermSubcategory.MAJOR_COINS,
    weight: 0.9,
    aliases: ['eth', 'ether', 'ethereum/usd', 'ethusd'],
    patterns: [/ethereum/i, /\beth\b/i],
    context: {
      relatedTerms: ['smart contracts', 'gas', 'defi', 'nft'],
      commonPhrases: ['eth 2.0', 'ethereum network', 'gas fees']
    },
    metadata: {
      acronym: 'ETH',
      definition: 'Second-largest cryptocurrency with smart contracts',
      tradingRelevance: 'high'
    }
  },

  // DeFi & Concepts
  {
    term: 'DeFi',
    normalized: 'defi',
    category: TermCategory.CRYPTO,
    subcategory: TermSubcategory.BLOCKCHAIN_CONCEPTS,
    weight: 0.8,
    aliases: ['decentralized finance', 'defi protocols'],
    patterns: [/defi/i, /decentralized\s*finance/i],
    context: {
      relatedTerms: ['yield farming', 'liquidity pools', 'dex'],
      narrowerTerms: ['defi tokens', 'defi tvl', 'defi lending']
    }
  },

  // ===== GENERAL TRADING TERMS =====
  {
    term: 'bull market',
    normalized: 'bull_market',
    category: TermCategory.GENERAL,
    subcategory: TermSubcategory.MARKET_SENTIMENT,
    weight: 0.8,
    aliases: ['bullish', 'bull run', 'uptrend'],
    patterns: [/bull\s*market/i, /bullish/i],
    context: {
      oppositeTerms: ['bear market', 'bearish'],
      relatedTerms: ['rally', 'uptick', 'breakout']
    },
    metadata: {
      definition: 'Market characterized by rising prices',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'bear market',
    normalized: 'bear_market',
    category: TermCategory.GENERAL,
    subcategory: TermSubcategory.MARKET_SENTIMENT,
    weight: 0.8,
    aliases: ['bearish', 'downtrend', 'bear territory'],
    patterns: [/bear\s*market/i, /bearish/i],
    context: {
      oppositeTerms: ['bull market', 'bullish'],
      relatedTerms: ['selloff', 'correction', 'crash']
    },
    metadata: {
      definition: 'Market characterized by falling prices (20%+ decline)',
      tradingRelevance: 'high'
    }
  },
  {
    term: 'volatility',
    normalized: 'volatility',
    category: TermCategory.GENERAL,
    subcategory: TermSubcategory.RISK_MANAGEMENT,
    weight: 0.85,
    aliases: ['vol', 'vix', 'implied volatility', 'iv'],
    patterns: [/volatility/i, /\bvol\b/i, /\bvix\b/i],
    context: {
      relatedTerms: ['standard deviation', 'risk', 'vix index'],
      commonPhrases: ['high volatility', 'volatility spike', 'vol crush']
    }
  },
  {
    term: 'technical analysis',
    normalized: 'technical_analysis',
    category: TermCategory.TECHNICAL,
    weight: 0.85,
    aliases: ['ta', 'charting', 'chart analysis'],
    patterns: [/technical\s*analysis/i, /\bta\b/],
    context: {
      relatedTerms: ['indicators', 'patterns', 'support', 'resistance'],
      oppositeTerms: ['fundamental analysis'],
      narrowerTerms: ['rsi', 'macd', 'moving averages', 'fibonacci']
    }
  }
]);

// Helper class for term management
export class FinancialTermsManager {
  private static readonly termsMap = new Map(
    FINANCIAL_TERMS.map(term => [term.normalized, term])
  );
  
  private static readonly categoryMap = new Map<TermCategory, FinancialTerm[]>();
  private static readonly patternMap = new Map<RegExp, FinancialTerm>();
  
  static {
    // Build category map
    for (const term of FINANCIAL_TERMS) {
      const categoryTerms = this.categoryMap.get(term.category) || [];
      categoryTerms.push(term);
      this.categoryMap.set(term.category, categoryTerms);
      
      // Build pattern map
      if (term.patterns) {
        for (const pattern of term.patterns) {
          this.patternMap.set(pattern, term);
        }
      }
    }
  }

  /**
   * Find terms in text with context
   */
  static findTermsInText(text: string): TermSearchResult[] {
    const results: TermSearchResult[] = [];
    const lowerText = text.toLowerCase();
    
    // Check exact terms and aliases
    for (const term of FINANCIAL_TERMS) {
      // Check main term
      const termIndex = lowerText.indexOf(term.normalized);
      if (termIndex !== -1) {
        results.push({ term, match: term.term, position: termIndex });
      }
      
      // Check aliases
      if (term.aliases) {
        for (const alias of term.aliases) {
          const aliasIndex = lowerText.indexOf(alias.toLowerCase());
          if (aliasIndex !== -1) {
            results.push({ term, match: alias, position: aliasIndex });
          }
        }
      }
    }
    
    // Check patterns
    for (const [pattern, term] of this.patternMap) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        results.push({ term, match: match[0], position: match.index });
      }
    }
    
    // Sort by position and remove duplicates
    return results
      .sort((a, b) => a.position - b.position)
      .filter((item, index, arr) => 
        index === 0 || item.position !== arr[index - 1].position
      );
  }

  /**
   * Get terms by category
   */
  static getByCategory(category: TermCategory): FinancialTerm[] {
    return this.categoryMap.get(category) || [];
  }

  /**
   * Get terms by subcategory
   */
  static getBySubcategory(subcategory: TermSubcategory): FinancialTerm[] {
    return FINANCIAL_TERMS.filter(term => term.subcategory === subcategory);
  }

  /**
   * Get terms by weight threshold
   */
  static getByWeight(minWeight: number): FinancialTerm[] {
    return FINANCIAL_TERMS.filter(term => term.weight >= minWeight);
  }

  /**
   * Search terms by query
   */
  static searchTerms(query: string): FinancialTerm[] {
    const lowerQuery = query.toLowerCase();
    return FINANCIAL_TERMS.filter(term => 
      term.normalized.includes(lowerQuery) ||
      term.term.toLowerCase().includes(lowerQuery) ||
      term.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery)) ||
      term.metadata?.definition?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get related terms
   */
  static getRelatedTerms(termNormalized: string): string[] {
    const term = this.termsMap.get(termNormalized);
    if (!term || !term.context) return [];
    
    return [
      ...(term.context.relatedTerms || []),
      ...(term.context.broaderTerms || []),
      ...(term.context.narrowerTerms || [])
    ];
  }

  /**
   * Calculate text financial relevance score
   */
  static calculateRelevanceScore(text: string): RelevanceScore {
    const foundTerms = this.findTermsInText(text);
    const categories: Record<string, number> = {};
    const termWeights: Array<{ term: string; weight: number }> = [];
    
    let totalScore = 0;
    
    for (const { term } of foundTerms) {
      totalScore += term.weight;
      categories[term.category] = (categories[term.category] || 0) + term.weight;
      termWeights.push({ term: term.term, weight: term.weight });
    }
    
    // Normalize score to 0-1 range
    const normalizedScore = Math.min(totalScore / 5, 1);
    
    return {
      score: normalizedScore,
      categories: categories as Record<TermCategory, number>,
      topTerms: termWeights
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5)
    };
  }
}

// Export convenience functions
export const findFinancialTerms = (text: string) => 
  FinancialTermsManager.findTermsInText(text);

export const getForexTerms = () => 
  FinancialTermsManager.getByCategory(TermCategory.FOREX);

export const getStockTerms = () => 
  FinancialTermsManager.getByCategory(TermCategory.STOCKS);

export const getCommodityTerms = () => 
  FinancialTermsManager.getByCategory(TermCategory.COMMODITIES);

export const getCryptoTerms = () => 
  FinancialTermsManager.getByCategory(TermCategory.CRYPTO);

export const getHighWeightTerms = (minWeight = 0.8) => 
  FinancialTermsManager.getByWeight(minWeight);

export const isFinancialText = (text: string, threshold = 0.3) => 
  FinancialTermsManager.calculateRelevanceScore(text).score >= threshold;
