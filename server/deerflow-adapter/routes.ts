/**
 * DeerFlow API Routes
 * 
 * This module registers Express routes to interact with the DeerFlow adapter.
 */
import express from 'express';
import { startResearch, getResearchStatus, runResearch, checkHealth } from './controller';

const router = express.Router();

// Health check endpoint
router.get('/health', checkHealth);

// Research endpoints
router.post('/research', startResearch);
router.get('/research/:id', getResearchStatus);
router.post('/research/complete', runResearch);

export default router;