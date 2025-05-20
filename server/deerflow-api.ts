/**
 * DeerFlow Research API - Direct endpoint for accessing advanced research capabilities
 */

import { Request, Response } from 'express';
import { deerflowService } from './deerflow-simplified';
import { log } from './logging';

/**
 * Express handler for direct DeerFlow research requests 
 */
export async function handleDirectResearchRequest(req: Request, res: Response) {
  try {
    const { query, threadId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    log(`DeerFlow API: Processing direct research request for query: ${query}`, 'deerflow');
    
    // Perform research using our enhanced implementation
    const result = await deerflowService.performResearch({
      query,
      maxSteps: 3,
      enableBackgroundInvestigation: true,
      conversationId: threadId
    });
    
    return res.json({
      success: true,
      research: result
    });
  } catch (error) {
    console.error('Error handling DeerFlow research request:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}