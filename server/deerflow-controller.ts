/**
 * DeerFlow Controller
 * 
 * This module provides Express routes for the DeerFlow research functionality
 */
import { Request, Response } from 'express';
import { deerflowBridge, ResearchRequest } from './deerflow-bridge';
import { log } from './vite';

/**
 * Check the health of the DeerFlow service
 */
export const checkDeerflowHealth = async (_req: Request, res: Response) => {
  try {
    // Initialize the service and get its status
    const isReady = await deerflowBridge.initService?.();
    
    if (isReady) {
      return res.status(200).json({ 
        status: 'ok',
        message: 'DeerFlow service is operational'
      });
    } else {
      return res.status(503).json({ 
        status: 'unavailable',
        message: 'DeerFlow service is unavailable'
      });
    }
  } catch (error) {
    console.error('Error checking DeerFlow health:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to check DeerFlow service health'
    });
  }
};

/**
 * Start a new research task
 */
export const startDeerflowResearch = async (req: Request, res: Response) => {
  try {
    const researchRequest: ResearchRequest = req.body;
    
    if (!researchRequest.query) {
      return res.status(400).json({ 
        status: 'failed', 
        error: 'Query is required' 
      });
    }
    
    // Start a research task
    const result = await deerflowBridge.startResearch(researchRequest);
    return res.status(202).json(result);
  } catch (error: any) {
    log(`Error starting research: ${error.message}`, 'deerflow');
    return res.status(500).json({ 
      status: 'failed', 
      error: `Failed to start research: ${error.message}`
    });
  }
};

/**
 * Get the status and results of a research task
 */
export const getDeerflowResearchStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        status: 'failed', 
        error: 'Research ID is required' 
      });
    }
    
    const result = await deerflowBridge.getResearchStatus(id);
    return res.status(200).json(result);
  } catch (error: any) {
    log(`Error getting research status: ${error.message}`, 'deerflow');
    
    // Special handling for not found errors
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        status: 'failed', 
        error: `Research task not found` 
      });
    }
    
    return res.status(500).json({ 
      status: 'failed', 
      error: `Failed to get research status: ${error.message}`
    });
  }
};

/**
 * Run a complete research task (start and wait for completion)
 * This is a long-running operation, so it should be used with caution
 */
export const runDeerflowCompleteResearch = async (req: Request, res: Response) => {
  try {
    const researchRequest: ResearchRequest = req.body;
    
    if (!researchRequest.query) {
      return res.status(400).json({ 
        status: 'failed', 
        error: 'Query is required' 
      });
    }
    
    // Run a complete research task
    const result = await deerflowBridge.runCompleteResearch(researchRequest);
    return res.status(200).json(result);
  } catch (error: any) {
    log(`Error running complete research: ${error.message}`, 'deerflow');
    return res.status(500).json({ 
      status: 'failed', 
      error: `Failed to run research task: ${error.message}`
    });
  }
};