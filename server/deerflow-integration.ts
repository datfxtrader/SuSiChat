// server/deerflow-integration.ts
import { deerflowClient, DeerFlowResearchParams, DeerFlowResearchResponse } from './deerflow-client';

/**
 * Research depth levels
 */
export enum ResearchDepth {
  Basic = 1,      // Simple web search
  Enhanced = 2,   // More comprehensive web search with better processing
  Deep = 3        // Full DeerFlow research capabilities
}

/**
 * Research result interface
 */
export interface ResearchResult {
  report: string;
  sources: Array<{
    title: string;
    url: string;
    domain: string;
    content?: string;
  }>;
  depth: ResearchDepth;
  processingTime: number;
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
}

/**
 * Service for performing research at different depth levels
 */
export class ResearchService {
  /**
   * Perform research at the specified depth level
   */
  async performResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    const depth = params.depth || ResearchDepth.Basic;
    
    console.log(`Performing research at depth level ${depth} for query: "${params.query}"`);
    
    try {
      // Basic search (depth 1) - use existing performWebSearch
      if (depth === ResearchDepth.Basic) {
        return await this.performBasicResearch(params);
      }
      
      // Enhanced search (depth 2) - more comprehensive web search
      if (depth === ResearchDepth.Enhanced) {
        return await this.performEnhancedResearch(params);
      }
      
      // Deep research (depth 3) - use DeerFlow
      if (depth === ResearchDepth.Deep) {
        return await this.performDeepResearch(params);
      }
      
      // Default to basic research if invalid depth
      return await this.performBasicResearch(params);
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
      return {
        report: `Error performing research: ${error.message}`,
        sources: [],
        depth: depth,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Perform basic research using existing web search
   * This will be implemented by the existing performWebSearch in suna-integration.ts
   */
  private async performBasicResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    // This will be a wrapper for the existing web search functionality
    // Actual implementation will be in suna-integration.ts
    
    // This is a placeholder that will be replaced with actual integration
    return {
      report: "Basic research report placeholder",
      sources: [],
      depth: ResearchDepth.Basic,
      processingTime: Date.now() - startTime
    };
  }
  
  /**
   * Perform enhanced research with more sources and better processing
   */
  private async performEnhancedResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    // Enhanced search would typically use the same APIs as basic search
    // but with more sources, more results, and better processing
    
    // This is a placeholder that will be replaced with actual integration
    return {
      report: "Enhanced research report placeholder",
      sources: [],
      depth: ResearchDepth.Enhanced,
      processingTime: Date.now() - startTime
    };
  }
  
  /**
   * Perform deep research using DeerFlow
   */
  private async performDeepResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('Performing deep research with DeerFlow...');
      
      // Prepare DeerFlow research parameters
      const deerflowParams: DeerFlowResearchParams = {
        research_question: params.query,
        model_id: params.modelId || 'deepseek-v3',
        include_market_data: params.includeMarketData !== undefined ? params.includeMarketData : true,
        include_news: params.includeNews !== undefined ? params.includeNews : true
      };
      
      // Call DeerFlow API
      const deerflowResponse: DeerFlowResearchResponse = await deerflowClient.performResearch(deerflowParams);
      
      // Process the response
      if (!deerflowResponse.report) {
        throw new Error('DeerFlow research returned no report');
      }
      
      // Format the response
      return {
        report: deerflowResponse.report,
        sources: deerflowResponse.sources || [],
        depth: ResearchDepth.Deep,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('DeerFlow research error:', error);
      throw error; // Let the main performResearch method handle the fallback
    }
  }
}

// Export singleton instance
export const researchService = new ResearchService();