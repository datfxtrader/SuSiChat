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
   * This integrates with the existing performWebSearch in suna-integration.ts
   */
  private async performBasicResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Direct import to avoid global object issues
      const { performWebSearch } = require('./performWebSearch');
      
      // Perform web search using the function
      const searchResults = await performWebSearch(params.query);
      
      if (searchResults.error) {
        throw new Error(`Web search error: ${searchResults.error}`);
      }
      
      // Extract search results
      const results = searchResults.results || [];
      
      // Format sources
      const sources: ResearchSource[] = results.map((result: any) => {
        try {
          if (!result || !result.url) return null;
          const domain = new URL(result.url).hostname;
          return {
            title: result.title || domain,
            url: result.url,
            domain: domain,
            content: result.content || result.snippet || ''
          };
        } catch (e) {
          return null;
        }
      }).filter((source): source is ResearchSource => source !== null);
      
      // Generate a report from results
      let report = '';
      
      if (results.length > 0) {
        // Simple results summary for basic research
        report = `Here are the key findings from my basic research:\n\n`;
        
        // Add main findings from top results
        results.slice(0, 3).forEach((result: any, index: number) => {
          report += `${index + 1}. ${result.title || 'Source'}: ${result.snippet || result.content || 'Information not available'}\n\n`;
        });
        
        // Add sources reference
        report += `\nSources:\n`;
        sources.forEach((source: any, index: number) => {
          report += `[${index + 1}] ${source.title}\n${source.url}\n`;
        });
      } else {
        report = `I couldn't find any relevant information for "${params.query}" in my basic research.`;
      }
      
      return {
        report,
        sources,
        depth: ResearchDepth.Basic,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Basic research error:', error);
      return {
        report: `I encountered an error while performing basic research: ${error.message}`,
        sources: [],
        depth: ResearchDepth.Basic,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Perform enhanced research with more sources and better processing
   */
  private async performEnhancedResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Direct import to avoid circular dependency issues
      const { performWebSearch } = require('./performWebSearch');
      const { llmService } = require('./llm');
      
      // Perform multiple searches with different query variations to get more diverse results
      const mainQuery = params.query;
      
      // Create more specific queries by adding qualifiers
      const queries = [
        mainQuery,                                      // Original query
        `latest information about ${mainQuery}`,        // For recency
        `detailed analysis of ${mainQuery}`,            // For depth
        `${mainQuery} research findings`,               // For academic/research focus
        `${mainQuery} statistics data`                  // For data-oriented results
      ];
      
      // Run all searches in parallel
      const searchResultPromises = queries.map(query => performWebSearch(query, 10)); // Get more results
      const searchResultsArray = await Promise.all(searchResultPromises);
      
      // Remove any failed searches
      const validSearchResults = searchResultsArray.filter(result => !result.error);
      
      if (validSearchResults.length === 0) {
        throw new Error('All enhanced searches failed');
      }
      
      // Combine and deduplicate results
      const allResults = [];
      const urlsSeen = new Set();
      
      for (const searchResult of validSearchResults) {
        const results = searchResult.results || [];
        for (const result of results) {
          if (result.url && !urlsSeen.has(result.url)) {
            urlsSeen.add(result.url);
            allResults.push(result);
          }
        }
      }
      
      // Sort results by relevance heuristic (prioritize title matches over content matches)
      allResults.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const queryWords = mainQuery.toLowerCase().split(' ');
        
        // Count query word matches in titles
        const aTitleMatches = queryWords.filter(word => aTitle.includes(word)).length;
        const bTitleMatches = queryWords.filter(word => bTitle.includes(word)).length;
        
        if (aTitleMatches !== bTitleMatches) {
          return bTitleMatches - aTitleMatches; // Higher title matches first
        }
        
        // If tie, use content match as secondary sort
        const aContent = (a.snippet || a.content || '').toLowerCase();
        const bContent = (b.snippet || b.content || '').toLowerCase();
        const aContentMatches = queryWords.filter(word => aContent.includes(word)).length;
        const bContentMatches = queryWords.filter(word => bContent.includes(word)).length;
        
        return bContentMatches - aContentMatches;
      });
      
      // Format sources
      const sources: ResearchSource[] = allResults.map((result: any) => {
        try {
          if (!result || !result.url) return null;
          const domain = new URL(result.url).hostname;
          return {
            title: result.title || domain,
            url: result.url,
            domain: domain,
            content: result.content || result.snippet || ''
          };
        } catch (e) {
          return null;
        }
      }).filter((source): source is ResearchSource => source !== null);
      
      // Generate a comprehensive report using LLM to synthesize findings
      let report = '';
      
      if (sources.length > 0) {
        // Use only the top sources to avoid overwhelming the LLM
        const topSources = sources.slice(0, 7);
        
        // Extract key content from sources
        const sourceContent = topSources.map((source, index) => 
          `Source ${index + 1} (${source.title} - ${source.domain}): ${source.content}`
        ).join('\n\n');
        
        // Use LLM to synthesize findings
        try {
          const prompt = `You are an advanced research assistant tasked with creating a well-organized, comprehensive report.
          
Based on the following sources, create a detailed research report about "${mainQuery}".
Structure your report with these sections:
1. Executive Summary (1-2 paragraphs)
2. Key Findings (3-5 bullet points)
3. Detailed Analysis (2-3 paragraphs)
4. Conclusions (1 paragraph)

SOURCES:
${sourceContent}

Your report should synthesize information from multiple sources, highlight consensus and disagreements, and provide a balanced view. Cite sources in your analysis where appropriate using [Source X] notation.`;

          const llmResponse = await llmService.generateResponse([
            { role: 'system', content: 'You are an expert research analyst providing accurate, comprehensive reports.' },
            { role: 'user', content: prompt }
          ]);
          
          report = llmResponse.message || '';
          
          // Add sources reference at the end
          report += '\n\n## Sources Used\n';
          topSources.forEach((source, index) => {
            report += `[Source ${index + 1}] ${source.title}\n${source.url}\n`;
          });
        } catch (error) {
          console.error('Error generating enhanced report with LLM:', error);
          
          // Fallback to simpler report format if LLM fails
          report = `# Research Report on "${mainQuery}"\n\n`;
          report += `## Key Findings\n\n`;
          
          sources.slice(0, 5).forEach((source, index) => {
            report += `### ${source.title}\n`;
            report += `${source.content}\n\n`;
          });
          
          report += `\n## Sources\n`;
          sources.forEach((source, index) => {
            report += `[${index + 1}] ${source.title}\n${source.url}\n`;
          });
        }
      } else {
        report = `I couldn't find any relevant information for "${mainQuery}" in my enhanced research.`;
      }
      
      return {
        report,
        sources,
        depth: ResearchDepth.Enhanced,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Enhanced research error:', error);
      return {
        report: `I encountered an error while performing enhanced research: ${error.message}`,
        sources: [],
        depth: ResearchDepth.Enhanced,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Perform deep research using the DeerFlow Python service
   */
  private async performDeepResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('Performing deep research with DeerFlow service for query:', params.query);
      
      // Import DeerFlow client
      const { deerflowClient } = require('./deerflow-client');
      
      // Prepare request parameters for DeerFlow service
      const deerflowParams = {
        research_question: params.query,
        model_id: params.modelId || 'deepseek-v3',
        include_market_data: params.includeMarketData !== false,
        include_news: params.includeNews !== false
      };
      
      // Call the DeerFlow service
      console.log('Sending request to DeerFlow service with params:', deerflowParams);
      const deerflowResponse = await deerflowClient.performResearch(deerflowParams);
      
      // Check if there was an error with the DeerFlow service
      if (deerflowResponse.status?.status === 'error') {
        console.error('DeerFlow service error:', deerflowResponse.status.message);
        throw new Error(`DeerFlow service error: ${deerflowResponse.status.message}`);
      }
      
      // Handle processing state - if the response is still processing, wait for completion
      if (deerflowResponse.status?.status === 'processing' && deerflowResponse.status?.id) {
        console.log('Research is processing, waiting for completion...');
        
        // Wait for research to be completed (with timeout)
        const maxAttempts = 10;
        const delayBetweenAttempts = 3000; // 3 seconds
        let attempt = 0;
        
        while (attempt < maxAttempts) {
          // Wait before checking again
          await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
          
          // Check status
          try {
            const statusResponse = await deerflowClient.checkResearchStatus(deerflowResponse.status.id);
            
            // If completed, use this response instead
            if (statusResponse.status?.status === 'completed') {
              console.log('Research completed successfully');
              return {
                report: statusResponse.report || 'No research report was generated.',
                sources: (statusResponse.sources || []).map((source: any) => ({
                  title: source.title || 'Untitled',
                  url: source.url,
                  domain: source.domain || 'unknown',
                  content: source.content
                })),
                depth: ResearchDepth.Deep,
                processingTime: Date.now() - startTime
              };
            }
            
            // If error, throw
            if (statusResponse.status?.status === 'error') {
              throw new Error(`Research failed: ${statusResponse.status.message}`);
            }
            
            console.log(`Research still in progress (attempt ${attempt + 1}/${maxAttempts})...`);
          } catch (statusError) {
            console.error('Error checking research status:', statusError);
          }
          
          attempt++;
        }
        
        // If we've waited too long, fall back to enhanced research
        console.log('Research taking too long, falling back to enhanced research');
        return this.performEnhancedResearch(params);
      }
      
      // Format the response
      const report = deerflowResponse.report || 'No research report was generated.';
      
      // Format sources from DeerFlow response
      const sources: ResearchSource[] = (deerflowResponse.sources || [])
        .map((source: any) => {
          if (!source) return null;
          return {
            title: source.title || 'Untitled',
            url: source.url || '',
            domain: source.domain || 'unknown',
            content: source.content || ''
          };
        })
        .filter((source): source is ResearchSource => source !== null);
      
      // Log service process info
      if (deerflowResponse.service_process_log && deerflowResponse.service_process_log.length > 0) {
        console.log('DeerFlow service process log:', deerflowResponse.service_process_log.join('\n'));
      }
      
      // Return the research result
      return {
        report,
        sources,
        depth: ResearchDepth.Deep,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error performing deep research with DeerFlow:', error);
      
      // Fall back to enhanced research if DeerFlow fails
      console.log('DeerFlow service unavailable or error occurred. Falling back to enhanced research...');
      return this.performEnhancedResearch(params);
    }
  }
}

// Export singleton instance
export const researchService = new ResearchService();