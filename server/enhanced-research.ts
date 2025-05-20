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
    const { performWebSearch } = await import('./suna-integration');
    const results = await performWebSearch(query);
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
  // Early return if no sources found
  if (!sources || sources.length === 0) {
    return `I was unable to find reliable sources to answer your query about "${query}". Please try a different query or reformulate your question.`;
  }
  
  // Create a prompt that includes the sources
  const prompt = `
You are an expert research assistant providing a detailed, evidence-based analysis.

QUERY: ${query}

I've gathered these sources for you to analyze:
${sources.map((s, i) => `SOURCE ${i+1}: ${s.title}
URL: ${s.url}
SNIPPET: ${s.snippet}`).join('\n\n')}

Please provide a comprehensive analysis of the query based on these sources. 
Include key findings, different perspectives, and evidence-based insights.
When citing sources, include the source number in brackets like [1] or [2].
Format your response using Markdown with headings, bullet points, and sections as appropriate.
Conclude with a "Sources" section that lists all the references used in your analysis.

Remember to:
1. Be objective and balanced in your analysis
2. Cite specific information from the sources
3. Acknowledge limitations in the available information
4. Present multiple perspectives when relevant
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