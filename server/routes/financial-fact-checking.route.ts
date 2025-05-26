
// routes/financial-fact-checking.route.ts
import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { FactValidationService } from '../services/fact-validation.service';
import { FactValidationRequest } from '../../types/fact-checking.types';

const router = Router();

// Initialize service
const deerflowUrl = process.env.DEERFLOW_SERVICE_URL || 'http://localhost:9000';
const validationService = new FactValidationService(deerflowUrl);

// Rate limiting
const factCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many fact-checking requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Request validation
const validateFactCheckRequest = [
  body('content')
    .isString()
    .trim()
    .isLength({ min: 10, max: 10000 })
    .withMessage('Content must be between 10 and 10,000 characters'),
  body('options').optional().isObject(),
  body('options.confidenceThreshold').optional().isFloat({ min: 0, max: 1 }),
  body('options.maxFacts').optional().isInt({ min: 1, max: 50 }),
  body('options.categories').optional().isArray()
];

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Logging middleware
const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `fact-check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  console.log(`[${requestId}] Fact-check request from ${req.ip}`);
  next();
};

/**
 * POST /api/financial-facts/validate-facts
 * Validates financial facts in the provided content
 */
router.post('/validate-facts',
  factCheckLimiter,
  logRequest,
  validateFactCheckRequest,
  asyncHandler(async (req: Request, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { content, options }: FactValidationRequest = req.body;

    try {
      const result = await validationService.validateFacts(content, options);
      
      // Log successful validation
      console.log(`[${req.requestId}] Validation completed: ${result.validation.total_facts_checked} facts checked`);
      
      res.json(result);
    } catch (error) {
      console.error(`[${req.requestId}] Validation error:`, error);
      throw error;
    }
  })
);

/**
 * GET /api/financial-facts/health
 * Health check endpoint for the fact-checking service
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const health = validationService.getServiceHealth();
  
  res.json({
    success: true,
    service: 'financial-fact-checker',
    deerflow: health,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/financial-facts/supported-categories
 * Returns list of supported financial categories
 */
router.get('/supported-categories', (req: Request, res: Response) => {
  res.json({
    success: true,
    categories: [
      { key: 'interest_rates', name: 'Interest Rates', description: 'Federal funds rate, treasury yields' },
      { key: 'commodities', name: 'Commodities', description: 'Gold, silver, oil prices' },
      { key: 'inflation', name: 'Inflation', description: 'CPI, PCE, inflation rates' },
      { key: 'stocks', name: 'Stock Markets', description: 'Major indices, stock prices' },
      { key: 'forex', name: 'Foreign Exchange', description: 'Currency exchange rates' },
      { key: 'crypto', name: 'Cryptocurrency', description: 'Bitcoin, Ethereum, crypto prices' }
    ]
  });
});

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${req.requestId || 'unknown'}] Unhandled error:`, error);
  
  res.status(500).json({
    success: false,
    error: 'Failed to validate facts',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    requestId: req.requestId
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
