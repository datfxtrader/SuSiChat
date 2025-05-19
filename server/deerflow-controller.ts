/**
 * DeerFlow Controller
 * 
 * This module provides Express routes for the DeerFlow research functionality
 */

import { Request, Response } from 'express';
import { deerflowBridge, ResearchRequest } from './deerflow-bridge';

/**
 * Check the health of the DeerFlow service
 */
export const checkDeerflowHealth = async (_req: Request, res: Response) => {
  try {
    const isAvailable = await deerflowBridge.initService();
    if (isAvailable) {
      return res.json({ status: 'ok', message: 'DeerFlow service is operational' });
    } else {
      return res.status(503).json({ status: 'error', message: 'DeerFlow service is not available' });
    }
  } catch (error) {
    console.error('Error checking DeerFlow health:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to check DeerFlow health' });
  }
};

/**
 * Start a new research task
 */
export const startDeerflowResearch = async (req: Request, res: Response) => {
  try {
    const researchRequest: ResearchRequest = req.body;
    
    // Validate required fields
    if (!researchRequest.query) {
      return res.status(400).json({ status: 'error', message: 'Query is required' });
    }
    
    const result = await deerflowBridge.startResearch(researchRequest);
    return res.json(result);
  } catch (error) {
    console.error('Error starting DeerFlow research:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to start research task' });
  }
};

/**
 * Get the status and results of a research task
 */
export const getDeerflowResearchStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ status: 'error', message: 'Task ID is required' });
    }
    
    const result = await deerflowBridge.getResearchStatus(taskId);
    return res.json(result);
  } catch (error) {
    console.error('Error getting DeerFlow research status:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to get research status' });
  }
};

/**
 * Run a complete research task (start and wait for completion)
 * This is a long-running operation, so it should be used with caution
 */
export const runDeerflowCompleteResearch = async (req: Request, res: Response) => {
  try {
    const researchRequest: ResearchRequest = req.body;
    
    // Validate required fields
    if (!researchRequest.query) {
      return res.status(400).json({ status: 'error', message: 'Query is required' });
    }
    
    const result = await deerflowBridge.runCompleteResearch(researchRequest);
    return res.json(result);
  } catch (error) {
    console.error('Error running complete DeerFlow research:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to complete research task' });
  }
};