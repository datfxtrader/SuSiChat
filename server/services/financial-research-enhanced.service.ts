
// services/financial-research-enhanced.service.ts
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import { DeepSeekService } from './deepseek.service';
import { FinancialReport, FinancialSource } from '../../types/financial.types';
import { FINANCIAL_SOURCES } from '../config/financial-sources.config';

export class FinancialResearchService {
  private cache: LRUCache<string, FinancialReport>;
  private deepseek: DeepSeekService;

  constructor(apiKey: string) {
    this.deepseek = new DeepSeekService(apiKey);
    this.cache = new LRUCache<string, FinancialReport>({
      max: 100,
      ttl: 15 * 60 * 1000, // 15 minutes
      updateAgeOnGet: true
    });
  }

  async generateReport(
    query: string,
    depth: number = 3,
    options?: any
  ): Promise<FinancialReport> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(query, depth, options);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          cached: true
        }
      };
    }

    try {
      // Generate analysis
      const report = await this.deepseek.generateAnalysis(query, depth, options);
      
      // Select relevant sources
      const sources = this.selectRelevantSources(query);

      const result: FinancialReport = {
        report,
        sources,
        depth,
        processingTime: Date.now() - startTime,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'deepseek-chat',
          cached: false,
          confidence: this.calculateConfidence(report)
        }
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Report generation failed:', error);
      
      // Return fallback report
      return {
        report: this.generateFallbackReport(query),
        sources: FINANCIAL_SOURCES.slice(0, 3),
        depth,
        processingTime: Date.now() - startTime,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'fallback',
          cached: false
        }
      };
    }
  }

  private selectRelevantSources(query: string): FinancialSource[] {
    const lowerQuery = query.toLowerCase();
    let sources = [...FINANCIAL_SOURCES];

    // Prioritize sources based on query
    if (lowerQuery.includes('forex') || lowerQuery.includes('currency')) {
      sources.sort((a, b) => {
        const aRelevance = a.domain.includes('fx') ? 1 : 0;
        const bRelevance = b.domain.includes('fx') ? 1 : 0;
        return bRelevance - aRelevance;
      });
    }

    // Sort by reliability
    sources.sort((a, b) => b.reliability - a.reliability);

    return sources.slice(0, 5);
  }

  private calculateConfidence(report: string): number {
    // Simple confidence calculation based on content
    const hasNumbers = /\d+\.?\d*/.test(report);
    const hasSections = /##\s+\w+/.test(report);
    const length = report.length;

    let confidence = 0.5;
    if (hasNumbers) confidence += 0.2;
    if (hasSections) confidence += 0.2;
    if (length > 1000) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  private generateFallbackReport(query: string): string {
    return `# ${query} Analysis

## Notice
I apologize, but I'm currently unable to provide a detailed analysis due to technical difficulties. 

## Quick Overview
- The ${query} market requires careful analysis of multiple factors
- Consider checking recent price action and key support/resistance levels
- Monitor relevant economic indicators and news events
- Always use proper risk management in your trading decisions

## Recommended Actions
1. Visit the financial sources provided for real-time data
2. Consult with financial professionals for personalized advice
3. Try again later for a comprehensive analysis

*This is a fallback response. Please try again for detailed analysis.*`;
  }

  private getCacheKey(query: string, depth: number, options?: any): string {
    const data = `${query}:${depth}:${JSON.stringify(options || {})}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  isConfigured(): boolean {
    return this.deepseek.isConfigured();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      ttl: this.cache.ttl
    };
  }

  clearCache() {
    this.cache.clear();
  }
}
