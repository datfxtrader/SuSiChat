
// services/financial-detector.service.ts
import { FinancialDetectionResult } from '../../types/financial-research.types';
import { FINANCIAL_TERMS } from '../config/financial-terms';

export class FinancialDetectorService {
  private termWeights: Map<string, number>;

  constructor() {
    this.initializeTermWeights();
  }

  private initializeTermWeights() {
    this.termWeights = new Map();
    
    // Higher weights for more specific terms
    Object.entries(FINANCIAL_TERMS).forEach(([category, terms]) => {
      terms.forEach(term => {
        const weight = this.getCategoryWeight(category);
        this.termWeights.set(term.toLowerCase(), weight);
      });
    });
  }

  private getCategoryWeight(category: string): number {
    const weights: Record<string, number> = {
      forex: 0.9,
      stocks: 0.8,
      commodities: 0.8,
      crypto: 0.7,
      general: 0.5
    };
    return weights[category] || 0.5;
  }

  detectFinancialQuery(query: string): FinancialDetectionResult {
    const lowerQuery = query.toLowerCase();
    const detectedTerms: string[] = [];
    let totalWeight = 0;

    // Check for financial terms
    this.termWeights.forEach((weight, term) => {
      if (lowerQuery.includes(term)) {
        detectedTerms.push(term);
        totalWeight += weight;
      }
    });

    // Calculate confidence
    const confidence = Math.min(totalWeight / 2, 1); // Normalize to 0-1

    // Determine category
    const suggestedCategory = this.determineCategory(detectedTerms);

    return {
      isFinancial: confidence > 0.3,
      confidence,
      detectedTerms,
      suggestedCategory,
      query
    };
  }

  private determineCategory(detectedTerms: string[]): string | undefined {
    const categoryCounts: Record<string, number> = {};

    detectedTerms.forEach(term => {
      Object.entries(FINANCIAL_TERMS).forEach(([category, terms]) => {
        if (terms.includes(term)) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });
    });

    const topCategory = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return topCategory ? topCategory[0] : undefined;
  }
}
