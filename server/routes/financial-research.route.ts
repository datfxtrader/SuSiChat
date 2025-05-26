
// routes/financial-research.route.ts
import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { FinancialResearchService } from '../services/financial-research.service';
import { FinancialDetectorService } from '../services/financial-detector.service';
import { ResearchDepth } from '../../types/financial-research.types';
import { FINANCIAL_SOURCES } from '../config/financial-sources';

const router = express.Router();

// Initialize services
const apiKey = process.env.DEEPSEEK_API_KEY || '';
const researchService = new FinancialResearchService(apiKey);
const detectorService = new FinancialDetectorService();

// Rate limiting
const researchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many research requests, please try again later'
});

// Validation
const validateResearchRequest = [
  body('query').isString().trim().isLength({ min: 3, max: 200 }),
  body('depth').optional().isInt({ min: 1, max: 5 }),
  body('options').optional().isObject()
];

// Error handler
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * POST /api/financial-research/research
 * Generate financial research report
 */
router.post('/research',
  researchLimiter,
  validateResearchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: errors.array() 
      });
    }

    const { query, depth = ResearchDepth.STANDARD, options } = req.body;

    if (!researchService.isConfigured()) {
      return res.status(503).json({
        error: 'Service not configured',
        message: 'Financial research service is temporarily unavailable',
        sources: FINANCIAL_SOURCES.slice(0, 3),
        depth
      });
    }

    try {
      const report = await researchService.generateResearch(query, depth, options);
      res.json(report);
    } catch (error) {
      console.error('Research generation failed:', error);
      res.status(500).json({
        error: 'Failed to generate research',
        message: 'Unable to complete financial analysis at this time',
        sources: FINANCIAL_SOURCES.slice(0, 3),
        depth
      });
    }
  })
);

/**
 * POST /api/financial-research/detect
 * Detect if query is financial in nature
 */
router.post('/detect',
  body('query').isString().trim().notEmpty(),
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: errors.array() 
      });
    }

    const { query } = req.body;
    const detection = detectorService.detectFinancialQuery(query);
    
    res.json(detection);
  })
);

/**
 * GET /api/financial-research/status
 * Service status and health check
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    service: 'financial-research',
    configured: researchService.isConfigured(),
    cache: researchService.getCacheStats(),
    sources: {
      total: FINANCIAL_SOURCES.length,
      categories: ['news', 'analysis', 'data', 'charts']
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Financial research error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

export default router;
