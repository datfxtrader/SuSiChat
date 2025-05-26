
// types/financial.types.ts
export interface FinancialResearchRequest {
  query: string;
  depth?: number;
  options?: {
    includeCharts?: boolean;
    timeframe?: 'short' | 'medium' | 'long';
    analysisType?: 'technical' | 'fundamental' | 'both';
  };
}

export interface FinancialSource {
  title: string;
  url: string;
  domain: string;
  category: 'realtime' | 'analysis' | 'news';
  reliability: number;
}

export interface FinancialReport {
  report: string;
  sources: FinancialSource[];
  depth: number;
  processingTime: number;
  metadata: {
    generatedAt: string;
    model: string;
    cached: boolean;
    confidence?: number;
  };
}
