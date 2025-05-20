/**
 * Suna Research Integration - Connects enhanced research to Suna agent depth level 3
 * 
 * This module integrates the enhanced research capabilities with Suna's agent system
 * to provide comprehensive research with sources for depth level 3 queries.
 */

import { Request, Response } from 'express';
import { log, logError } from './logging';
import { performEnhancedResearch } from './enhanced-research';

interface SunaResearchRequest {
  query: string;
  depth?: number;
  userId?: string;
  threadId?: string;
  conversationId?: string;
}

/**
 * Convert a Suna message to a research query
 */
function extractQueryFromMessage(message: string): string {
  // Handle research commands with level indicators
  if (message.startsWith('/research3 ')) {
    return message.substring('/research3 '.length).trim();
  }
  
  // Handle general research requests
  if (message.startsWith('/research ')) {
    return message.substring('/research '.length).trim();
  }
  
  // Return the original message if it doesn't match expected patterns
  return message;
}

/**
 * Determine if a message should trigger enhanced research
 */
export function shouldUseEnhancedResearch(message: string, depth?: number): boolean {
  // Check for explicit depth level 3 command
  if (message.startsWith('/research3 ')) {
    return true;
  }
  
  // Check depth parameter
  if (depth === 3) {
    return true;
  }
  
  // Finally check message content for research-intensive indicators
  const researchIntensiveKeywords = [
    'comprehensive research',
    'detailed analysis',
    'in-depth research',
    'with sources',
    'compare perspectives',
    'analyze trends'
  ];
  
  return researchIntensiveKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase()));
}

/**
 * Process research requests from Suna agent
 */
export async function processSunaResearch(request: SunaResearchRequest): Promise<any> {
  const { query, depth = 1, threadId, conversationId } = request;
  const extractedQuery = extractQueryFromMessage(query);
  
  try {
    log(`Processing Suna research request: "${extractedQuery}" at depth ${depth}`, 'suna-research');
    
    // For depth level 3, use enhanced research
    if (depth === 3 || shouldUseEnhancedResearch(query)) {
      log(`Using enhanced research for depth level 3 query: ${extractedQuery}`, 'suna-research');
      
      const research = await performEnhancedResearch({
        query: extractedQuery,
        maxDepth: 3,
        includeSources: true,
        conversationId: conversationId || threadId
      });
      
      // Format response for Suna agent
      return {
        type: 'research',
        result: research.result,
        sources: research.sources,
        depth: 3,
        query: extractedQuery
      };
    }
    
    // For other depth levels, let Suna handle it with standard search
    log(`Passing query to standard Suna search: ${extractedQuery}`, 'suna-research');
    return {
      passthrough: true,
      query: extractedQuery,
      depth
    };
  } catch (error) {
    logError(`Error processing Suna research: ${error}`, 'suna-research');
    return {
      type: 'research',
      result: `I encountered an error while researching "${extractedQuery}". Please try again or reformulate your query.`,
      sources: [],
      depth,
      query: extractedQuery,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Express handler for Suna research requests
 */
export async function handleSunaResearchRequest(req: Request, res: Response) {
  try {
    const { query, depth, userId, threadId, conversationId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    log(`Received Suna research request: ${query}`, 'suna-research');
    
    const result = await processSunaResearch({
      query,
      depth: parseInt(depth || '1'),
      userId,
      threadId,
      conversationId
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error handling Suna research request:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
}