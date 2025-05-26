
import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { webSearchService } from '../services/web-search.service';
import { WebSearchRequest } from '../../types/web-search.types';

const router = express.Router();

// Middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Rate limiting
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many search requests',
    message: 'Please try again later',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many search requests',
      message: 'Please try again later',
      retryAfter: 60
    });
  }
});

// Validation middleware
const validateSearchRequest = [
  body('query')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Query must be between 1 and 500 characters'),
  body('maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('maxResults must be between 1 and 50'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.searchEngines')
    .optional()
    .isArray()
    .withMessage('searchEngines must be an array'),
  body('options.searchDepth')
    .optional()
    .isIn(['basic', 'advanced'])
    .withMessage('searchDepth must be "basic" or "advanced"'),
  body('options.freshness')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('freshness must be one of: day, week, month, year'),
  body('options.safeSearch')
    .optional()
    .isBoolean()
    .withMessage('safeSearch must be a boolean')
];

// Logging middleware
const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  const query = req.body?.query || req.query?.q || 'unknown';
  console.log(`[${requestId}] 🔍 Web search request: "${query}" from ${req.ip}`);
  res.setHeader('X-Request-Id', requestId);
  next();
};

/**
 * POST /api/webSearch
 * Perform web search with multiple engines
 */
router.post('/',
  searchLimiter,
  logRequest,
  validateSearchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn(`[${req.requestId}] ❌ Validation failed:`, errors.array());
      return res.status(400).json({
        error: 'Invalid request',
        details: errors.array(),
        requestId: req.requestId
      });
    }

    const { query, maxResults = 10, options = {} }: WebSearchRequest = req.body;

    try {
      const startTime = Date.now();
      const results = await webSearchService.search(query, maxResults, options);
      const totalTime = Date.now() - startTime;
      
      console.log(`[${req.requestId}] ✅ Search completed: ${results.totalResults} results in ${totalTime}ms`);
      
      res.json({
        ...results,
        requestId: req.requestId
      });
      
    } catch (error) {
      console.error(`[${req.requestId}] ❌ Search error:`, error);
      throw error;
    }
  })
);

/**
 * GET /api/webSearch/status
 * Get search service status and metrics
 */
router.get('/status', 
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = webSearchService.getMetrics();
    const engineStatus = webSearchService.getEngineStatus();
    
    const serviceHealth = metrics.totalAvailableEngines > 0 ? 'healthy' : 'degraded';
    
    res.json({
      service: 'web-search',
      status: serviceHealth,
      version: '1.0.0',
      metrics,
      engines: engineStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  })
);

/**
 * POST /api/webSearch/cache/clear
 * Clear search cache (admin operation)
 */
router.post('/cache/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const { confirm = false } = req.body;
    
    if (!confirm) {
      return res.status(400).json({
        error: 'Cache clear must be confirmed',
        message: 'Set confirm: true in request body to clear cache'
      });
    }

    const clearedCount = webSearchService.clearCache();
    
    console.log(`🗑️ Cache cleared by ${req.ip} - ${clearedCount} items removed`);
    
    res.json({
      success: true,
      message: 'Search cache cleared successfully',
      itemsCleared: clearedCount,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/webSearch/engines
 * Get available search engines and their status
 */
router.get('/engines',
  asyncHandler(async (req: Request, res: Response) => {
    const engineStatus = webSearchService.getEngineStatus();
    
    res.json({
      engines: engineStatus,
      totalEngines: engineStatus.length,
      availableEngines: engineStatus.filter(e => e.available).length,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/webSearch (legacy support)
 * Support GET requests with query parameter
 */
router.get('/',
  searchLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const maxResults = parseInt(req.query.maxResults as string) || 10;
    
    if (!query?.trim()) {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    if (maxResults < 1 || maxResults > 50) {
      return res.status(400).json({
        error: 'maxResults must be between 1 and 50'
      });
    }

    try {
      const results = await webSearchService.search(query, maxResults);
      res.json(results);
    } catch (error) {
      console.error('GET search error:', error);
      throw error;
    }
  })
);

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';
  console.error(`[${requestId}] ❌ Unhandled error:`, error);

  // Determine error type and status code
  let statusCode = 500;
  let message = 'Internal server error';

  if (error.message.includes('Rate limit exceeded')) {
    statusCode = 429;
    message = error.message;
  } else if (error.message.includes('No search engines available')) {
    statusCode = 503;
    message = 'Search service temporarily unavailable';
  } else if (error.message.includes('Query cannot be empty')) {
    statusCode = 400;
    message = error.message;
  }

  res.status(statusCode).json({
    error: 'Search service error',
    message: process.env.NODE_ENV === 'development' ? error.message : message,
    requestId,
    timestamp: new Date().toISOString()
  });
});

// TypeScript augmentation for request ID
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export default router;
