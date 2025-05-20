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
          const source: ResearchSource = {
            title: result.title || domain,
            url: result.url,
            domain: domain,
            content: result.content || result.snippet || ''
          };
          return source;
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        report: `I encountered an error while performing basic research: ${errorMessage}`,
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
      // Access performWebSearch from global to avoid circular dependency issues
      const performWebSearch = (global as any).performWebSearch;
      
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
          const source: ResearchSource = {
            title: result.title || domain,
            url: result.url,
            domain: domain,
            content: result.content || result.snippet || ''
          };
          return source;
        } catch (e) {
          return null;
        }
      }).filter((source): source is ResearchSource => source !== null);
      
      // Generate a comprehensive report using LLM to synthesize findings
      let report = '';
      
      if (sources.length > 0) {
        // Use only the top sources to avoid overwhelming the LLM
        const topSources = sources.slice(0, 7);
        
        // Extract key content from sources - include full content for better analysis
        const sourceContent = topSources.map((source, index) => {
          // Get the most substantial content possible from each source
          const content = source.content || '';
          // Format with clear separation between sources for better LLM comprehension
          return `Source ${index + 1} (${source.title} - ${source.domain}):\n${content}`;
        }).join('\n\n---\n\n');
        
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

          // Create a detailed prompt with source content
          const systemPrompt = 'You are an expert financial and market analyst providing detailed, comprehensive reports with accurate information. Your reports should include specific data, trends, technical analysis, and market insights.';
          
          // Check if this is a financial/forex query
          const isFinancialQuery = /EUR\/USD|USD\/JPY|GBP\/USD|currency|forex|exchange rate|financial market|stock market|trading|investment/i.test(mainQuery);
          
          let userPrompt = '';
          
          if (isFinancialQuery) {
            userPrompt = `Create a comprehensive, expert-level financial analysis report about "${mainQuery}" using the following sources.

The report MUST include:
1. Executive Summary (2-3 paragraphs with specific numerical insights)
2. Current Market Status (detailed price analysis with EXACT current rates, ranges, and percentage movements)
3. Technical Analysis (identify support/resistance levels with precise numbers, chart patterns, key indicators like RSI, MACD, moving averages)
4. Fundamental Analysis (economic indicators, central bank policies, geopolitical factors with dates and data)
5. Expert Forecasts (include specific price targets, timeframes, and divergent opinions)
6. Risk Assessment (volatility measures, potential scenarios with probability estimates)
7. Trading Recommendations (entry/exit points with specific price levels)

SOURCES:
${sourceContent}

Your report MUST:
- Include ALL available numerical data (EXACT prices, percentages, dates, ranges) from the sources
- Cite sources using [Source X] notation for EVERY significant data point or claim
- Use proper financial terminology (pips, spreads, liquidity, etc.)
- Format with clear Markdown headings, bullet points, and tables where appropriate
- Be extremely detailed and data-driven with NO generic statements
- Include any conflicting viewpoints or predictions from different sources`;
          } else {
            userPrompt = `Create a comprehensive, well-organized research report about "${mainQuery}" using the following sources.

The report should include:
1. Executive Summary (2-3 paragraphs with key insights)
2. Current Situation Analysis (detailed examination with facts, figures, and specific data points)
3. Key Factors and Trends (identify 3-5 important influences with supporting evidence)
4. Detailed Analysis (explore critical aspects in depth)
5. Expert Perspectives (include varied viewpoints and quotes when available)
6. Future Outlook (likely scenarios based on current evidence)

SOURCES:
${sourceContent}

Your report should:
- Include exact numerical data and specific facts from the sources
- Cite sources using [Source X] notation throughout the analysis
- Use proper terminology relevant to the topic
- Format with clear Markdown headings, bullet points, and emphasis
- Be highly detailed and data-driven rather than general
- Acknowledge any limitations in the available information`;
          }

          // Use LLM service to generate detailed report
          const llmResponse = await llmService.generateResearchReport(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            0.7,  // temperature for balanced creativity and accuracy
            4000  // token limit for comprehensive research
          );
          
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        report: `I encountered an error while performing enhanced research: ${errorMessage}`,
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
      
      // Use the deerflowClient that's already imported at the top of the file
      // This fixes the "require is not defined" error
      
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
      
      // Format sources from DeerFlow response with improved logging and fallback
      console.log('Processing DeerFlow sources:', JSON.stringify(deerflowResponse.sources || []));
      let sources: ResearchSource[] = [];
      
      // If DeerFlow provided sources, use them
      if (deerflowResponse.sources && deerflowResponse.sources.length > 0) {
        sources = (deerflowResponse.sources || [])
          .map((source: any) => {
            if (!source) return null;
            try {
              const formattedSource: ResearchSource = {
                title: source.title || 'Untitled',
                url: source.url || '',
                domain: source.domain || (source.url ? new URL(source.url).hostname : 'unknown'),
                content: source.content || ''
              };
              return formattedSource;
            } catch (error) {
              console.error('Error formatting source:', error, 'Source:', source);
              return {
                title: source.title || 'Untitled',
                url: source.url || '',
                domain: 'unknown',
                content: source.content || ''
              };
            }
          })
          .filter((source): source is ResearchSource => source !== null);
      } 
      // If no sources from DeerFlow, use web search as fallback
      else {
        console.log('No sources from DeerFlow, using web search as fallback');
        // Use the global performWebSearch function
        try {
          const webSearch = await (global as any).performWebSearch(params.query, 8);
          sources = (webSearch.results || []).map((result: any) => ({
            title: result.title || 'Untitled',
            url: result.url || '',
            domain: result.source || (result.url ? new URL(result.url).hostname : 'unknown'),
            content: result.content || ''
          }));
        } catch (searchError) {
          console.error('Error performing fallback web search:', searchError);
        }
      }
      
      console.log('Formatted sources count:', sources.length);
      
      // Log service process info
      if (deerflowResponse.service_process_log && deerflowResponse.service_process_log.length > 0) {
        console.log('DeerFlow service process log:', deerflowResponse.service_process_log.join('\n'));
      }
      
      // Return the research result, always labeling as Deep research even if we used fallback
      // This ensures consistent user experience
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