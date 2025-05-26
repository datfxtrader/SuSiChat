
// routes/financial-research-enhanced.route.ts
import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { FinancialResearchService } from '../services/financial-research-enhanced.service';
import { FinancialResearchRequest } from '../../types/financial.types';

const router = express.Router();

// Initialize service
const apiKey = process.env.DEEPSEEK_API_KEY || '';
const researchService = new FinancialResearchService(apiKey);

// Middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate limiting
const researchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // 15 requests per 5 minutes
  message: 'Too many research requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Request validation
const validateResearchRequest = [
  body('query')
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Query must be between 2 and 200 characters'),
  body('depth')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Depth must be between 1 and 5'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object')
];

// Logging middleware
const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `fin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  console.log(`[${requestId}] Financial research: ${req.body.query} | Depth: ${req.body.depth || 3}`);
  res.setHeader('X-Request-Id', requestId);
  next();
};

/**
 * POST /api/financial/research
 * Generate financial research report
 */
router.post('/',
  researchLimiter,
  logRequest,
  validateResearchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid request',
        details: errors.array()
      });
    }

    const { query, depth = 3, options }: FinancialResearchRequest = req.body;

    // Check service configuration
    if (!researchService.isConfigured()) {
      console.warn(`[${req.requestId}] Service not configured`);
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Financial research service is not properly configured',
        sources: [],
        depth,
        processingTime: 0
      });
    }

    try {
      // Generate report
      const report = await researchService.generateReport(query, depth, options);
      
      console.log(`[${req.requestId}] Report generated in ${report.processingTime}ms`);
      res.json(report);
      
    } catch (error) {
      console.error(`[${req.requestId}] Research error:`, error);
      throw error;
    }
  })
);

/**
 * GET /api/financial/research/status
 * Service status and health check
 */
router.get('/status', (req: Request, res: Response) => {
  const status = {
    service: 'financial-research',
    configured: researchService.isConfigured(),
    cache: researchService.getCacheStats(),
    timestamp: new Date().toISOString()
  };

  res.json(status);
});

/**
 * POST /api/financial/research/cache/clear
 * Clear the research cache
 */
router.post('/cache/clear',
  asyncHandler(async (req: Request, res: Response) => {
    researchService.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  })
);

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';
  console.error(`[${requestId}] Unhandled error:`, error);

  res.status(500).json({
    error: 'Internal server error',
    message: 'Failed to process financial research request',
    report: 'An error occurred while researching this financial topic.',
    sources: [],
    depth: req.body?.depth || 3,
    processingTime: 0,
    requestId
  });
});

// TypeScript augmentation
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export default router;
