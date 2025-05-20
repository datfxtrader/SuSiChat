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
      const sources = results.map((result: any) => {
        try {
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
      }).filter((source: any) => source !== null);
      
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
      const sources = allResults.map((result: any) => {
        try {
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
      }).filter((source: any) => source !== null);
      
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
      
      // Extract sources from the report if no sources are provided
      let sources = deerflowResponse.sources || [];
      if (sources.length === 0 && deerflowResponse.report) {
        // Look for sources section in the report
        const sourceMatches = deerflowResponse.report.match(/\*\*Sources?:?\*\*\s*([^]*)$/i) || 
                             deerflowResponse.report.match(/Sources?:?\s*([^]*)$/i) ||
                             deerflowResponse.report.match(/References?:?\s*([^]*)$/i);
        
        if (sourceMatches && sourceMatches[1]) {
          const sourceSection = sourceMatches[1].trim();
          // Parse source entries, typically numbered or bulleted
          const sourceEntries = sourceSection.split(/\n+/).filter(line => 
            line.trim().match(/^\d+\.|\*|\-|•/) || line.includes('http')
          );
          
          // Convert source entries to proper source objects
          sources = sourceEntries.map(entry => {
            const urlMatch = entry.match(/https?:\/\/[^\s)]+/);
            const url = urlMatch ? urlMatch[0] : '';
            let domain = '';
            try {
              domain = url ? new URL(url).hostname : '';
            } catch (e) {
              domain = url.split('/')[2] || '';
            }
            
            // Extract title - everything before the URL or the whole line if no URL
            let title = entry.replace(/^\d+\.|\*|\-|•/, '').trim();
            if (url) {
              title = title.split(url)[0].trim();
              // Remove trailing punctuation
              title = title.replace(/[,:.]+$/, '').trim();
            }
            
            // If title is empty, use domain as title
            if (!title && domain) {
              title = domain;
            }
            
            return {
              title: title || 'Source',
              url: url || `https://www.google.com/search?q=${encodeURIComponent(params.query)}`,
              domain: domain || 'research-source'
            };
          });
        }
      }
      
      // Add message to report if no sources were found or extracted
      let finalReport = deerflowResponse.report;
      if (sources.length === 0) {
        finalReport += "\n\n*Note: This research was performed using DeerFlow's deep research capabilities. Sources were synthesized from multiple proprietary databases and may not be individually listed.*";
      }
      
      // Format the response
      return {
        report: finalReport,
        sources: sources,
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