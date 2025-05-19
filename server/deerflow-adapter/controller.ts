/**
 * DeerFlow API Controller
 * 
 * This module provides Express routes to interact with the DeerFlow adapter.
 */

import { Request, Response } from 'express';
import deerFlowAdapter, { ResearchRequest } from './index';

/**
 * Start a new research task
 */
export const startResearch = async (req: Request, res: Response) => {
  try {
    const { query, depth, maxSources, includeDomains, excludeDomains, useCache, userContext } = req.body;
    
    // Validate request
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Create research request
    const researchRequest: ResearchRequest = {
      query,
      depth: depth || 'standard',
      maxSources: maxSources || 5,
      includeDomains: includeDomains || [],
      excludeDomains: excludeDomains || [],
      useCache: useCache !== undefined ? useCache : true,
      userContext: userContext || ''
    };
    
    // Start research and get task ID
    const researchId = await deerFlowAdapter.startResearch(researchRequest);
    
    res.status(200).json({ id: researchId });
  } catch (error) {
    console.error('Error starting research:', error);
    res.status(500).json({ error: 'Failed to start research' });
  }
};

/**
 * Get research status and results
 */
export const getResearchStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Research ID is required' });
    }
    
    const status = await deerFlowAdapter.getResearchStatus(id);
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting research status:', error);
    res.status(500).json({ error: 'Failed to get research status' });
  }
};

/**
 * Run a complete research task (start and wait for completion)
 * This is a long-running operation, so it should be used with caution
 */
export const runResearch = async (req: Request, res: Response) => {
  try {
    const { query, depth, maxSources, includeDomains, excludeDomains, useCache, userContext } = req.body;
    
    // Validate request
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Create research request
    const researchRequest: ResearchRequest = {
      query,
      depth: depth || 'standard',
      maxSources: maxSources || 5,
      includeDomains: includeDomains || [],
      excludeDomains: excludeDomains || [],
      useCache: useCache !== undefined ? useCache : true,
      userContext: userContext || ''
    };
    
    // Run research and wait for completion
    const result = await deerFlowAdapter.runResearch(researchRequest);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error running research:', error);
    res.status(500).json({ error: 'Failed to complete research' });
  }
};

/**
 * Check the health of the DeerFlow service
 */
export const checkHealth = async (_req: Request, res: Response) => {
  try {
    const isHealthy = await deerFlowAdapter.checkHealth();
    
    if (isHealthy) {
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(503).json({ status: 'unavailable' });
    }
  } catch (error) {
    console.error('Error checking DeerFlow health:', error);
    res.status(500).json({ error: 'Failed to check DeerFlow health' });
  }
};