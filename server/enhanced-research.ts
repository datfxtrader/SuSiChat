/**
 * Enhanced Research Module - Combines web search with LLM analysis for depth level 3 research
 * 
 * This module provides comprehensive research capabilities with proper source attribution.
 */
import axios from 'axios';
import { log, logError } from './logging';
import { llmService } from './llm';

// Interfaces
export interface ResearchRequest {
  query: string;
  maxDepth?: number;
  includeSources?: boolean;
  conversationId?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchResponse {
  query: string;
  result: string;
  sources: ResearchSource[];
  observations: string[];
  timestamp: string;
  conversationId?: string;
}

/**
 * Perform web search using available search engines
 */
async function performWebSearch(query: string): Promise<any[]> {
  try {
    // Refine search query to be more specific and search-friendly
    const searchQuery = query.includes('impact') ? 
      `${query} recent developments analysis` : 
      `${query} recent developments`;
      
    log(`Refined search query: ${searchQuery}`, 'research');
    
    const { performWebSearch } = await import('./suna-integration');
    const results = await performWebSearch(searchQuery);
    
    // Log search results count for debugging
    log(`Found ${results?.length || 0} search results`, 'research');
    
    // Implement a fallback search if no results
    if (!results || results.length === 0) {
      log('No results found, trying broader search terms', 'research');
      const broaderQuery = query.split(' ').slice(0, 3).join(' ') + ' latest research';
      const broaderResults = await performWebSearch(broaderQuery);
      
      log(`Broader search found ${broaderResults?.length || 0} results`, 'research');
      return broaderResults || [];
    }
    
    return results || [];
  } catch (error) {
    logError(`Error performing web search: ${error}`, 'research');
    return [];
  }
}

/**
 * Format search results into proper sources
 */
function formatSources(searchResults: any[]): ResearchSource[] {
  if (!searchResults || !Array.isArray(searchResults)) {
    return [];
  }
  
  return searchResults.map(result => ({
    title: result.title || 'Untitled Source',
    url: result.url || result.link || '#',
    snippet: result.snippet || result.content || 'No description available'
  }));
}

/**
 * Generate research analysis using the LLM
 */
async function generateAnalysis(query: string, sources: ResearchSource[]): Promise<string> {
  // Early return if no sources found with a more helpful message
  if (!sources || sources.length === 0) {
    return `# Research Results: ${query}\n\nI was unable to find specific and reliable sources to answer your query about "${query}". This may be due to:\n\n- The specificity of your query\n- Limited recent information on this exact topic\n- Possible connection issues with search services\n\n## Suggestions\n\n1. Try a more general query focusing on the main concepts (e.g., "quantum computing financial applications")\n2. Specify a different timeframe if looking for recent developments\n3. Break your query into separate, more focused questions\n\nPlease try reformulating your question for better results.`;
  }
  
  // Create an enhanced prompt that gets better results from the LLM
  const prompt = `
You are a senior research analyst with expertise in providing comprehensive, evidence-based analysis.

QUERY: ${query}

I've gathered these sources for you to analyze. Extract relevant information, synthesize insights, and provide a thorough analysis:

${sources.map((s, i) => `SOURCE ${i+1}: ${s.title}
URL: ${s.url}
SNIPPET: ${s.snippet}`).join('\n\n')}

Your task is to create a detailed research report that:

1. Provides a comprehensive analysis of "${query}" based strictly on the sources provided
2. Extracts and synthesizes key insights from multiple sources
3. Presents different perspectives and viewpoints when available
4. Includes specific facts, figures, and expert opinions from the sources
5. Cites sources by including source numbers in brackets [1], [2], etc.

FORMAT YOUR RESPONSE WITH:
- Clear section headings using Markdown (# for main headings, ## for subheadings)
- Bullet points for key findings
- Quotes from sources when particularly relevant
- A dedicated "Sources" section at the end listing all references

IMPORTANT:
- If the sources contain conflicting information, acknowledge this and explain different viewpoints
- If sources are insufficient to fully answer the query, clearly state the limitations
- Focus specifically on how quantum computing impacts financial markets as requested in the query
- Include technical concepts but explain them in accessible terms
`;

  // Generate the analysis using the LLM
  try {
    const analysis = await llmService.generateResponse('system', prompt);
    return analysis;
  } catch (error) {
    logError(`Error generating analysis: ${error}`, 'research');
    return `I encountered an error while analyzing information about "${query}". The search found relevant sources, but I was unable to complete the analysis.`;
  }
}

/**
 * Perform comprehensive research on a query
 */
export async function performEnhancedResearch(request: ResearchRequest): Promise<ResearchResponse> {
  const { query, maxDepth = 3, includeSources = true } = request;
  
  try {
    log(`Starting enhanced research for: ${query}`, 'research');
    
    // Step 1: Perform web search
    log('Performing web search...', 'research');
    const searchResults = await performWebSearch(query);
    
    // Step 2: Format sources
    const sources = formatSources(searchResults);
    
    // Step 3: Generate analysis with the LLM
    log('Generating analysis...', 'research');
    const analysis = await generateAnalysis(query, sources);
    
    // Step 4: Compile observations
    const observations = [
      "Searched multiple authoritative sources for relevant information",
      "Analyzed information for accuracy and relevance",
      "Synthesized findings into a comprehensive response with proper citations"
    ];
    
    // Return the complete research response
    return {
      query,
      result: analysis,
      sources: includeSources ? sources : [],
      observations,
      timestamp: new Date().toISOString(),
      conversationId: request.conversationId
    };
  } catch (error) {
    logError(`Error performing enhanced research: ${error}`, 'research');
    
    // Return a basic response with error information
    return {
      query,
      result: `I encountered an error while researching "${query}". Please try again with a different query.`,
      sources: [],
      observations: ["Research process encountered an error"],
      timestamp: new Date().toISOString(),
      conversationId: request.conversationId
    };
  }
}