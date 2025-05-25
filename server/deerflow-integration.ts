// server/deerflow-integration.ts
import { deerflowClient, DeerFlowResearchParams, DeerFlowResearchResponse } from './deerflow-client';
import { llmService } from './llm';

/**
 * Research depth levels
 */
export enum ResearchDepth {
  Basic = 1,      // Simple web search
  Enhanced = 2,   // More comprehensive web search with better processing
  Deep = 3        // Full DeerFlow research capabilities
}

/**
 * Research source interface
 */
export interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  content?: string;
}

/**
 * Research result interface
 */
export interface ResearchResult {
  report: string;
  sources: ResearchSource[];
  depth: ResearchDepth;
  processingTime: number;
  progress?: {
    step: string;
    percent: number;
    statusMessage?: string;
  };
}

/**
 * Research parameters interface
 */
export interface ResearchParams {
  query: string;
  depth?: ResearchDepth;
  modelId?: string;
  includeMarketData?: boolean;
  includeNews?: boolean;
  researchLength?: string;
  researchTone?: string;
  minWordCount?: number;
  researchDepth?: number; // For universal token allocation (1=8K, 2=15K, 3=25K tokens)
}

/**
 * Main research service class
 */
export class ResearchService {
  private activeRequests = new Map<string, AbortController>();

  public cancelResearch(researchId: string) {
    const controller = this.activeRequests.get(researchId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(researchId);
    }
  }

  /**
   * Perform research at the specified depth level
   */
  async performResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    const depth = params.depth || ResearchDepth.Basic;

    console.log(`Performing research at depth level ${depth} for query: "${params.query}"`);

    try {
      if (depth === ResearchDepth.Basic) {
        // Use enhanced free research service for basic depth
        console.log('🔍 Using enhanced free research service');
        const { enhancedResearchService } = await import('./enhanced-research-service');
        const results = await enhancedResearchService.performResearch(params.query);
        
        return {
          ...results,
          depth: depth,
          processingTime: Date.now() - startTime
        };
      }

      // For higher depths, use DeerFlow
      console.log(`🔍 Using DeerFlow system for depth ${depth}`);
      return await this.performDeepResearch(params);

    } catch (error) {
      console.error(`Research error at depth ${depth}:`, error);

      // Fall back to a lower depth level if higher depth fails
      if (depth === ResearchDepth.Deep) {
        console.log('Falling back to Enhanced research level due to DeerFlow error');
        return await this.performResearch({
          ...params,
          depth: ResearchDepth.Enhanced
        });
      } else if (depth === ResearchDepth.Enhanced) {
        console.log('Falling back to Basic research level due to error');
        return await this.performResearch({
          ...params,
          depth: ResearchDepth.Basic
        });
      }

      // If even basic research fails, return an error
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      } else if (error) {
        errorMessage = String(error);
      }

      return {
        report: `Error performing research: ${errorMessage}`,
        sources: [],
        depth: depth,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform deep research using DeerFlow service
   */
  private async performDeepResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();

    try {
      console.log('🚀 Starting DeerFlow deep research with external search engines...');

      // Check if this is a financial query
      const isFinancialQuery = /(?:forex|currency|exchange rate|trading|market|price|financial|investment|stock|crypto|bitcoin|ethereum|USD|EUR|GBP|JPY|analysis)/i.test(params.query);

      if (isFinancialQuery) {
        console.log('🏦 Financial query detected - using specialized financial research');
        return await this.performFinancialResearch(params);
      }

      // Prepare DeerFlow parameters
      const deerflowParams: DeerFlowResearchParams = {
        research_question: params.query,
        query: params.query,
        model_id: params.modelId || 'deepseek-chat',
        research_depth: params.researchDepth || 3,
        research_length: params.researchLength || 'comprehensive',
        research_tone: params.researchTone || 'analytical',
        include_market_data: params.includeMarketData || false,
        include_news: params.includeNews || true,
        min_word_count: params.minWordCount || 2500
      };

      console.log('📊 DeerFlow parameters:', deerflowParams);

      // Perform DeerFlow research with retry mechanism
      const maxRetries = 3;
      let retryCount = 0;
      let deerflowResponse: DeerFlowResearchResponse | undefined;

      while (retryCount < maxRetries) {
        try {
          console.log(`🔄 DeerFlow attempt ${retryCount + 1}/${maxRetries}`);
          deerflowResponse = await deerflowClient.performResearch(deerflowParams);
          break;
        } catch (error) {
          retryCount++;
          console.error(`❌ DeerFlow attempt ${retryCount} failed:`, error);
          if (retryCount >= maxRetries) {
            throw new Error(`DeerFlow failed after ${maxRetries} attempts: ${error}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!deerflowResponse) {
        throw new Error('No response from DeerFlow service');
      }

      console.log('✅ DeerFlow research completed successfully');
      console.log('📈 DeerFlow response keys:', Object.keys(deerflowResponse));

      // Process DeerFlow response
      const processingTime = Date.now() - startTime;

      // Extract sources from DeerFlow response
      let sources: ResearchSource[] = [];

      if (deerflowResponse.sources && Array.isArray(deerflowResponse.sources)) {
        sources = deerflowResponse.sources.map((source: any) => {
          try {
            const domain = new URL(source.url || source.link || '').hostname;
            return {
              title: source.title || source.name || domain,
              url: source.url || source.link || '',
              domain: domain,
              content: source.content || source.description || ''
            };
          } catch (e) {
            return {
              title: source.title || source.name || 'Unknown Source',
              url: source.url || source.link || '',
              domain: 'unknown',
              content: source.content || source.description || ''
            };
          }
        }).filter((source: ResearchSource) => source.url);
      }

      // Extract report from DeerFlow response
      let report = '';
      if (deerflowResponse.report) {
        report = deerflowResponse.report;
      } else if (deerflowResponse.content) {
        report = deerflowResponse.content;
      } else if (deerflowResponse.analysis) {
        report = deerflowResponse.analysis;
      } else {
        // Fallback: create a comprehensive report from available data
        report = this.createFallbackReport(params.query, sources, deerflowResponse);
      }

      console.log(`📄 Final report length: ${report.length} characters`);
      console.log(`🔗 Sources found: ${sources.length}`);

      return {
        report: report,
        sources: sources,
        depth: ResearchDepth.Deep,
        processingTime: processingTime
      };

    } catch (error) {
      console.error('DeerFlow research error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        report: `I encountered an error while performing deep research: ${errorMessage}`,
        sources: [],
        depth: ResearchDepth.Deep,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform specialized financial research
   */
  private async performFinancialResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();

    try {
      // Check for currency pair patterns
      const currencyPairMatch = params.query.match(/([A-Z]{3})[\s\/]?([A-Z]{3})/);
      const currencyPair = currencyPairMatch ? `${currencyPairMatch[1]}/${currencyPairMatch[2]}` : null;

      if (currencyPair) {
        console.log(`💱 Currency pair detected: ${currencyPair}`);

        // Enhanced financial research with multiple data sources
        const financialResearch = await this.performComprehensiveFinancialAnalysis(params.query, currencyPair);

        return {
          report: financialResearch.content || `# Market Analysis\n\nAnalysis for ${currencyPair} is currently unavailable. Please try:\n\n1. Being more specific with your query\n2. Including a timeframe\n3. Specifying particular metrics you're interested in`,
          sources: financialResearch.sources || [],
          depth: ResearchDepth.Deep,
          processingTime: Date.now() - startTime
        };
      }

      // Basic research without currency pair
      return {
        report: `# Financial Analysis\n\nUnable to analyze the market without a valid currency pair. Please specify a currency pair like "EUR/USD" or "GBP/JPY" for detailed analysis.`,
        sources: [],
        depth: ResearchDepth.Basic,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Financial research error:', error);
      return {
        report: `## Financial Market Analysis\n\nI apologize, but I was unable to provide a detailed analysis for your query. To get better results, please:\n\n1. Specify the time period you're interested in\n2. Include specific aspects you want to analyze (e.g., technical indicators, fundamentals)\n3. Mention any particular market events or factors you want to focus on\n\nExample query: "Analyze AUDUSD technical trends over the past week focusing on moving averages and support levels"`,
        sources: [],
        depth: ResearchDepth.Basic,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Create a fallback report when DeerFlow doesn't provide structured content
   */
  private createFallbackReport(query: string, sources: ResearchSource[], deerflowResponse: any): string {
    let report = `# Research Report: ${query}\n\n`;

    if (sources.length > 0) {
      report += `## Executive Summary\n\n`;
      report += `Based on comprehensive research using multiple search engines and sources, here are the key findings for "${query}":\n\n`;

      report += `## Key Findings\n\n`;
      sources.slice(0, 5).forEach((source, index) => {
        if (source.content) {
          report += `**${index + 1}. ${source.title}**\n`;
          report += `${source.content.substring(0, 200)}...\n`;
          report += `*Source: ${source.domain}*\n\n`;
        }
      });

      report += `## Sources\n\n`;
      sources.forEach((source, index) => {
        report += `${index + 1}. [${source.title}](${source.url}) - ${source.domain}\n`;
      });
    } else {
      report += `I apologize, but I was unable to find sufficient information about "${query}" at this time. This could be due to the specificity of the query or temporary search limitations.`;
    }

    return report;
  }

  /**
   * Perform comprehensive financial analysis
   */
  private async performComprehensiveFinancialAnalysis(query: string, currencyPair: string): Promise<any> {
    console.log(`💰 Performing comprehensive financial analysis for ${currencyPair}`);

    try {
      // Use DeerFlow with financial-specific parameters
      const deerflowParams: DeerFlowResearchParams = {
        research_question: `${query} ${currencyPair} financial analysis market trends trading`,
        query: `${query} ${currencyPair} financial analysis market trends trading`,
        model_id: 'deepseek-chat',
        research_depth: 3,
        research_length: 'comprehensive',
        research_tone: 'analytical',
        include_market_data: true,
        include_news: true,
        min_word_count: 3000
      };

      const result = await deerflowClient.performResearch(deerflowParams);

      return {
        success: true,
        content: result.report || result.content || result.analysis || 'Financial analysis completed',
        sources: result.sources || []
      };

    } catch (error) {
      console.error('Comprehensive financial analysis error:', error);
      return {
        success: false,
        content: '',
        sources: []
      };
    }
  }
}

// Export a singleton instance
export const researchService = new ResearchService();