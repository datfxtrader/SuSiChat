
// types/financial-research.types.ts
export interface FinancialResearchRequest {
  query: string;
  depth?: ResearchDepth;
  options?: ResearchOptions;
}

export interface ResearchOptions {
  includeCharts?: boolean;
  timeframe?: 'intraday' | 'daily' | 'weekly' | 'monthly';
  includeTechnicals?: boolean;
  includeFundamentals?: boolean;
  language?: string;
}

export enum ResearchDepth {
  BASIC = 1,
  STANDARD = 3,
  COMPREHENSIVE = 5
}

export interface FinancialSource {
  title: string;
  url: string;
  domain: string;
  category: 'news' | 'analysis' | 'data' | 'charts';
  reliability: number; // 0-1 score
}

export interface ResearchReport {
  report: string;
  sources: FinancialSource[];
  depth: number;
  processingTime: number;
  metadata?: {
    model: string;
    tokensUsed?: number;
    confidence?: number;
    lastUpdated?: string;
  };
  cached?: boolean;
}

export interface FinancialDetectionResult {
  isFinancial: boolean;
  confidence: number;
  detectedTerms: string[];
  suggestedCategory?: string;
  query: string;
}
