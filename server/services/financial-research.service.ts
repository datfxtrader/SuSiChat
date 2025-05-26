
// services/financial-research.service.ts
import axios, { AxiosInstance } from 'axios';
import { LRUCache } from 'lru-cache';
import pRetry from 'p-retry';
import pTimeout from 'p-timeout';
import { 
  ResearchReport, 
  ResearchDepth, 
  ResearchOptions, 
  FinancialSource 
} from '../../types/financial-research.types';
import { FINANCIAL_SOURCES } from '../config/financial-sources';

export class FinancialResearchService {
  private client: AxiosInstance;
  private cache: LRUCache<string, ResearchReport>;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly TIMEOUT = 30000;
  private readonly MAX_RETRIES = 2;

  constructor(private apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.deepseek.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: this.TIMEOUT
    });

    this.cache = new LRUCache<string, ResearchReport>({
      max: 50,
      ttl: this.CACHE_TTL,
      updateAgeOnGet: true
    });
  }

  async generateResearch(
    query: string,
    depth: ResearchDepth = ResearchDepth.STANDARD,
    options?: ResearchOptions
  ): Promise<ResearchReport> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(query, depth, options);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    try {
      const report = await pTimeout(
        pRetry(() => this.callDeepSeekAPI(query, depth, options), {
          retries: this.MAX_RETRIES,
          onFailedAttempt: error => {
            console.log(`DeepSeek attempt ${error.attemptNumber} failed:`, error.message);
          }
        }),
        this.TIMEOUT,
        'Research generation timed out'
      );

      const result: ResearchReport = {
        report,
        sources: this.selectRelevantSources(query),
        depth,
        processingTime: Date.now() - startTime,
        metadata: {
          model: 'deepseek-chat',
          lastUpdated: new Date().toISOString()
        }
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to generate research:', error);
      throw new Error('Unable to generate financial research at this time');
    }
  }

  private async callDeepSeekAPI(
    query: string,
    depth: ResearchDepth,
    options?: ResearchOptions
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(options);
    const userPrompt = this.buildUserPrompt(query, depth, options);

    const response = await this.client.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: this.getMaxTokens(depth),
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }

    return response.data.choices[0].message.content;
  }

  private buildSystemPrompt(options?: ResearchOptions): string {
    const base = 'You are an expert financial analyst with deep knowledge of forex, stock markets, commodities, and economic indicators.';
    
    const specializations = [];
    if (options?.includeTechnicals) {
      specializations.push('technical analysis');
    }
    if (options?.includeFundamentals) {
      specializations.push('fundamental analysis');
    }
    
    return specializations.length > 0
      ? `${base} You specialize in ${specializations.join(' and ')}.`
      : base;
  }

  private buildUserPrompt(
    query: string,
    depth: ResearchDepth,
    options?: ResearchOptions
  ): string {
    const sections = this.getRequiredSections(depth, options);
    const timeframe = options?.timeframe || 'daily';
    
    return `Create a detailed ${this.getDepthDescription(depth)} market analysis for "${query}".

Include the following sections:
${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Requirements:
- Use clear section headings (##)
- Include specific numerical data and price levels
- Consider ${timeframe} timeframe for analysis
- Current date: ${new Date().toISOString().split('T')[0]}
- Be precise with technical levels and economic data
- Provide actionable insights

Format the response in clean markdown.`;
  }

  private getRequiredSections(depth: ResearchDepth, options?: ResearchOptions): string[] {
    const basicSections = [
      'Current Market Status',
      'Key Price Levels',
      'Market Outlook'
    ];

    const standardSections = [
      ...basicSections,
      'Technical Analysis',
      'Fundamental Factors',
      'Risk Factors'
    ];

    const comprehensiveSections = [
      ...standardSections,
      'Historical Context',
      'Correlation Analysis',
      'Trading Strategies',
      'Alternative Scenarios'
    ];

    const sections = {
      [ResearchDepth.BASIC]: basicSections,
      [ResearchDepth.STANDARD]: standardSections,
      [ResearchDepth.COMPREHENSIVE]: comprehensiveSections
    };

    return sections[depth] || standardSections;
  }

  private getDepthDescription(depth: ResearchDepth): string {
    const descriptions = {
      [ResearchDepth.BASIC]: 'concise',
      [ResearchDepth.STANDARD]: 'comprehensive',
      [ResearchDepth.COMPREHENSIVE]: 'in-depth professional'
    };
    return descriptions[depth] || 'comprehensive';
  }

  private getMaxTokens(depth: ResearchDepth): number {
    const tokenMap = {
      [ResearchDepth.BASIC]: 1500,
      [ResearchDepth.STANDARD]: 3000,
      [ResearchDepth.COMPREHENSIVE]: 4500
    };
    return tokenMap[depth] || 3000;
  }

  private selectRelevantSources(query: string): FinancialSource[] {
    const lowerQuery = query.toLowerCase();
    let sources = [...FINANCIAL_SOURCES];

    // Prioritize sources based on query content
    if (lowerQuery.includes('chart') || lowerQuery.includes('technical')) {
      sources = sources.sort((a, b) => 
        (a.category === 'charts' ? -1 : 0) - (b.category === 'charts' ? -1 : 0)
      );
    }

    return sources.slice(0, 6);
  }

  private getCacheKey(query: string, depth: ResearchDepth, options?: ResearchOptions): string {
    return `${query}:${depth}:${JSON.stringify(options || {})}`;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      ttl: this.CACHE_TTL
    };
  }
}
