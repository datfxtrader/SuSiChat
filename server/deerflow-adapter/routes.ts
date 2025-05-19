/**
 * DeerFlow API Routes
 * 
 * This module registers Express routes to interact with the DeerFlow adapter.
 */

import { Router } from 'express';
import { startResearch, getResearchStatus, runResearch, checkHealth } from './controller';
import { isAuthenticated } from '../replitAuth';

const router = Router();

// All DeerFlow routes require authentication
router.use(isAuthenticated);

// DeerFlow health check
router.get('/health', checkHealth);

// Start a new research task
router.post('/research', startResearch);

// Get research status by ID
router.get('/research/:id', getResearchStatus);

// Run complete research (start + wait for completion)
router.post('/research/complete', runResearch);

export default router;