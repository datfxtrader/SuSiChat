// server/deerflow-integration.ts
import { deerflowClient, DeerFlowResearchParams, DeerFlowResearchResponse } from './deerflow-client';
import { enhancedResearchService, EnhancedResearchResult } from './enhanced-research-service';
import { llmService } from './llm';

/**
 * Research depth levels
 */
export enum ResearchDepth {
  Basic = 1,      // Simple web search
  Enhanced = 2,   // More comprehensive web search with better processing
  Deep = 3,       // Full DeerFlow research capabilities
  Comprehensive = 4 // Enhanced multi-source research (News + Wikipedia + Academic + DeerFlow)
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
      // For ALL research depths, use DeerFlow agent intelligence with external search engines
      console.log(`🔍 Using DeerFlow agent intelligence with Brave/Tavily/Yahoo search engines for depth ${depth}`);
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

      // Let DeerFlow agent intelligently handle ALL queries without restrictive filtering
      console.log('🤖 Using DeerFlow agent intelligence for comprehensive analysis');

      // Prepare DeerFlow parameters - let the agent decide how to handle the query
      const deerflowParams: DeerFlowResearchParams = {
        research_question: params.query,
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
   * Perform comprehensive research using multiple data sources
   */
  private async performComprehensiveResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();

    try {
      console.log('🚀 Starting comprehensive multi-source research...');

      // Execute enhanced research with multiple data providers
      const enhancedResult = await enhancedResearchService.performResearch(params.query);

      // Also get DeerFlow analysis for deeper insights
      const deerflowResult = await this.performDeepResearch(params);

      // Combine results from both enhanced research and DeerFlow
      const combinedSources = [
        ...enhancedResult.sources,
        ...deerflowResult.sources
      ];

      // Create comprehensive report combining both analyses
      const combinedReport = this.combineResearchResults(
        enhancedResult.report,
        deerflowResult.report,
        params.query,
        enhancedResult.sourceBreakdown
      );

      return {
        report: combinedReport,
        sources: combinedSources,
        depth: ResearchDepth.Comprehensive,
        processingTime: Math.max(enhancedResult.processingTime, deerflowResult.processingTime)
      };

    } catch (error) {
      console.error('Comprehensive research error:', error);
      
      // Fallback to enhanced research only if DeerFlow fails
      try {
        console.log('🔄 Falling back to enhanced multi-source research...');
        const enhancedResult = await enhancedResearchService.performResearch(params.query);
        
        return {
          report: enhancedResult.report,
          sources: enhancedResult.sources,
          depth: ResearchDepth.Comprehensive,
          processingTime: enhancedResult.processingTime
        };
      } catch (fallbackError) {
        console.error('Enhanced research fallback error:', fallbackError);
        
        return {
          report: `# Comprehensive Research: ${params.query}\n\nTo enable comprehensive research with multiple data sources, please provide the necessary API keys for NewsAPI and other external services.`,
          sources: [],
          depth: ResearchDepth.Basic,
          processingTime: Date.now() - startTime
        };
      }
    }
  }

  /**
   * Combine results from enhanced research and DeerFlow analysis
   */
  private combineResearchResults(
    enhancedReport: string,
    deerflowReport: string,
    query: string,
    sourceBreakdown: { web: number; news: number; wikipedia: number; academic: number }
  ): string {
    let combinedReport = `# Comprehensive Research Analysis: ${query}\n\n`;

    // Research Overview
    combinedReport += `## Research Overview\n\n`;
    combinedReport += `This comprehensive analysis combines multiple data sources with AI-powered research:\n`;
    combinedReport += `- **News Sources**: ${sourceBreakdown.news} current articles\n`;
    combinedReport += `- **Wikipedia**: ${sourceBreakdown.wikipedia} reference articles\n`;
    combinedReport += `- **Academic Papers**: ${sourceBreakdown.academic} scholarly sources\n`;
    combinedReport += `- **Web Research**: ${sourceBreakdown.web} additional sources\n`;
    combinedReport += `- **AI Analysis**: Deep research with external search engines\n\n`;

    // Extract sections from enhanced report
    const enhancedSections = this.extractReportSections(enhancedReport);
    
    // Add latest news section if available
    if (enhancedSections.news) {
      combinedReport += enhancedSections.news + '\n\n';
    }

    // Add background information if available
    if (enhancedSections.background) {
      combinedReport += enhancedSections.background + '\n\n';
    }

    // Add AI-powered analysis from DeerFlow
    combinedReport += `## AI-Powered Analysis\n\n`;
    const deerflowContent = deerflowReport.replace(/^#.*$/gm, '').trim();
    combinedReport += deerflowContent + '\n\n';

    // Add academic research if available
    if (enhancedSections.academic) {
      combinedReport += enhancedSections.academic + '\n\n';
    }

    return combinedReport;
  }

  /**
   * Extract sections from enhanced research report
   */
  private extractReportSections(report: string): {
    news?: string;
    background?: string;
    academic?: string;
  } {
    const sections: any = {};

    // Extract news section
    const newsMatch = report.match(/## Latest News & Developments\n\n(.*?)(?=\n## |$)/s);
    if (newsMatch) {
      sections.news = `## Latest News & Developments\n\n${newsMatch[1].trim()}`;
    }

    // Extract background section
    const backgroundMatch = report.match(/## Background Information\n\n(.*?)(?=\n## |$)/s);
    if (backgroundMatch) {
      sections.background = `## Background Information\n\n${backgroundMatch[1].trim()}`;
    }

    // Extract academic section
    const academicMatch = report.match(/## Academic Research\n\n(.*?)(?=\n## |$)/s);
    if (academicMatch) {
      sections.academic = `## Academic Research\n\n${academicMatch[1].trim()}`;
    }

    return sections;
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