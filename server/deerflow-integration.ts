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
   * Perform deep research using DeepSeek for comprehensive analysis
   */
  private async performDeepResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('Performing deep research for query:', params.query);
      
      // Import necessary functions directly
      const { performWebSearch } = require('./performWebSearch');
      const { llmService } = require('./llm');
      
      // For deep research, use a multi-faceted approach with multiple query variants
      const queryVariants = [
        params.query,                                      // Original query
        `latest research on ${params.query}`,             // Latest findings
        `detailed analysis of ${params.query}`,           // Analytical perspective
        `${params.query} statistics and data`,            // Data-focused
        `${params.query} expert opinions`,                // Expert views
        `${params.query} case studies`,                   // Real-world examples
        `${params.query} comprehensive overview`,         // Overview
        `${params.query} future trends and projections`   // Forward-looking
      ];
      
      // Get more results per query for comprehensive data
      const searchPromises = queryVariants.map(q => performWebSearch(q, 10));
      const searchResultsArray = await Promise.all(searchPromises);
      
      // Combine all search results and remove duplicates
      const allResults: any[] = [];
      const urlSet = new Set();
      
      searchResultsArray.forEach((searchResult, index) => {
        if (searchResult.results && Array.isArray(searchResult.results)) {
          searchResult.results.forEach((result: any) => {
            if (result.url && !urlSet.has(result.url)) {
              urlSet.add(result.url);
              allResults.push({
                ...result,
                queryVariant: queryVariants[index] // Track which query variant found this result
              });
            }
          });
        }
      });
      
      // Convert search results to properly formatted sources for our unified format
      const sources = allResults.map(result => {
        let domain = 'Unknown';
        try {
          domain = new URL(result.url).hostname;
        } catch {
          domain = result.url.split('/')[2] || 'Unknown';
        }
        
        return {
          title: result.title || 'Untitled',
          url: result.url,
          domain: domain,
          content: result.content || result.description
        };
      });
      
      // Create a prompt for the LLM to synthesize a comprehensive report
      const sourcesText = allResults.map((result, index) => {
        return `Source ${index + 1}: ${result.title || 'Untitled'} (${result.url})
Content: ${result.content || result.description || 'No content available'}
Found via query: "${result.queryVariant}"
`;
      }).join('\n\n');
      
      // Create a prompt for the LLM to generate a comprehensive research report
      const prompt = `You are a research assistant tasked with creating a comprehensive research report.
      
TOPIC: ${params.query}

I have gathered information from multiple sources using various search queries to get diverse perspectives.
Please analyze the following sources and create a well-structured, comprehensive research report.

${sourcesText}

Your report should:
1. Include a clear and informative title
2. Begin with an executive summary highlighting key findings
3. Organize information into logical sections with appropriate headings
4. Synthesize information from different sources, noting agreements and contradictions
5. Include key data points, statistics, and expert opinions when available
6. End with conclusions and implications
7. Properly cite sources throughout using footnotes or inline citations
8. Include a "Sources" section at the end with numbered references

Format the report in Markdown, but make it readable and professional. Aim for depth and comprehensive coverage.`;

      // Use the LLM to generate the comprehensive research report
      const llmResponse = await llmService.generateResponse([
        { role: 'system', content: 'You are a research expert that creates comprehensive, fact-based reports.' },
        { role: 'user', content: prompt }
      ]);
      
      // Ensure the report has a sources section if not already present
      let report = llmResponse.trim();
      if (!report.toLowerCase().includes('sources:') && !report.toLowerCase().includes('references:')) {
        report += '\n\n## Sources\n\n';
        allResults.forEach((result, index) => {
          report += `${index + 1}. [${result.title || 'Source ' + (index + 1)}](${result.url})\n`;
        });
      }
      
      // Return the finished deep research result
      return {
        report: report,
        sources: sources,
        depth: ResearchDepth.Deep,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Error performing deep research:', error);
      
      // Fall back to enhanced research in case of an error
      console.log('Falling back to enhanced research...');
      return this.performEnhancedResearch(params);
    }
  }
    } catch (error) {
      console.error('DeerFlow research error:', error);
      throw error; // Let the main performResearch method handle the fallback
    }
  }
}

// Export singleton instance
export const researchService = new ResearchService();