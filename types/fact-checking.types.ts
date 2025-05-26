
// types/fact-checking.types.ts
export interface FactValidationRequest {
  content: string;
  options?: ValidationOptions;
}

export interface ValidationOptions {
  includeSources?: boolean;
  confidenceThreshold?: number;
  maxFacts?: number;
  categories?: FinancialCategory[];
}

export enum FinancialCategory {
  INTEREST_RATES = 'interest_rates',
  COMMODITIES = 'commodities',
  INFLATION = 'inflation',
  STOCKS = 'stocks',
  FOREX = 'forex',
  CRYPTO = 'crypto'
}

export interface ValidationResult {
  fact: string;
  is_valid: boolean;
  confidence: number;
  official_value: string;
  source: string;
  category?: FinancialCategory;
  recommendation: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface FactValidationResponse {
  success: boolean;
  validation: {
    message: string;
    total_facts_checked: number;
    valid_facts: number;
    invalid_facts: number;
    validation_results: ValidationResult[];
    processing_time_ms: number;
    service_used: 'deerflow' | 'fallback';
  };
  cached?: boolean;
}
