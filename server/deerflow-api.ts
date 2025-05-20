/**
 * DeerFlow Research API - Direct endpoint for accessing advanced research capabilities
 */

import { Request, Response } from 'express';
import { deerflowDirectService } from './deerflow-direct';
import { log } from './vite';

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
    
    // Perform research using our direct implementation
    const result = await deerflowDirectService.performResearch({
      query,
      conversation_id: threadId,
      max_step_num: 3,
      enable_background_investigation: true
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