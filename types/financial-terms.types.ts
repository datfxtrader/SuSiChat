
// types/financial-terms.types.ts
export interface FinancialTerm {
  term: string;
  normalized: string;
  category: TermCategory;
  subcategory?: TermSubcategory;
  weight: number; // 0-1, importance/specificity
  aliases?: string[];
  patterns?: RegExp[];
  context?: TermContext;
  metadata?: TermMetadata;
}

export enum TermCategory {
  FOREX = 'forex',
  STOCKS = 'stocks',
  COMMODITIES = 'commodities',
  CRYPTO = 'crypto',
  DERIVATIVES = 'derivatives',
  FIXED_INCOME = 'fixed_income',
  ECONOMICS = 'economics',
  TECHNICAL = 'technical',
  FUNDAMENTAL = 'fundamental',
  GENERAL = 'general'
}

export enum TermSubcategory {
  // Forex
  MAJOR_PAIRS = 'major_pairs',
  MINOR_PAIRS = 'minor_pairs',
  EXOTIC_PAIRS = 'exotic_pairs',
  FOREX_CONCEPTS = 'forex_concepts',
  
  // Stocks
  INDICES = 'indices',
  SECTORS = 'sectors',
  METRICS = 'metrics',
  CORPORATE_ACTIONS = 'corporate_actions',
  
  // Commodities
  PRECIOUS_METALS = 'precious_metals',
  ENERGY = 'energy',
  AGRICULTURE = 'agriculture',
  INDUSTRIAL_METALS = 'industrial_metals',
  
  // Crypto
  MAJOR_COINS = 'major_coins',
  DEFI_TOKENS = 'defi_tokens',
  STABLECOINS = 'stablecoins',
  BLOCKCHAIN_CONCEPTS = 'blockchain_concepts',
  
  // Analysis
  CHART_PATTERNS = 'chart_patterns',
  INDICATORS = 'indicators',
  MARKET_SENTIMENT = 'market_sentiment',
  RISK_MANAGEMENT = 'risk_management'
}

export interface TermContext {
  relatedTerms?: string[];
  oppositeTerms?: string[];
  broaderTerms?: string[];
  narrowerTerms?: string[];
  commonPhrases?: string[];
}

export interface TermMetadata {
  acronym?: string;
  fullForm?: string;
  definition?: string;
  example?: string;
  tradingRelevance?: 'high' | 'medium' | 'low';
  timeframe?: 'short' | 'medium' | 'long' | 'any';
}

export interface TermSearchResult {
  term: FinancialTerm;
  match: string;
  position: number;
}

export interface RelevanceScore {
  score: number;
  categories: Record<TermCategory, number>;
  topTerms: Array<{ term: string; weight: number }>;
}
