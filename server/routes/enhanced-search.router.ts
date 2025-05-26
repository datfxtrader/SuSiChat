
// routes/enhanced-search.router.ts
import express, { Request, Response, NextFunction } from 'express';
import { IntelligentSearchManager } from '../services/intelligent-search-manager';
import { validationResult, body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { EnhancedSearchRequest } from '../../types/search.types';

const router = express.Router();
const searchManager = new IntelligentSearchManager();

// Rate limiting
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateSearchRequest = [
  body('query').isString().trim().isLength({ min: 1, max: 500 }),
  body('maxResults').optional().isInt({ min: 1, max: 100 }),
  body('searchType').optional().isIn(['web', 'news', 'all']),
  body('freshness').optional().isIn(['day', 'week', 'month', 'year']),
  body('sources').optional().isArray(),
  body('filters').optional().isObject()
];

// Error handler
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Enhanced web search endpoint
router.post('/search', 
  searchLimiter,
  validateSearchRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      query,
      maxResults = 10,
      searchType = 'all',
      freshness = 'week',
      sources = [],
      filters
    }: EnhancedSearchRequest = req.body;

    console.log(`[Enhanced Search] Query: "${query}" | Type: ${searchType} | Max: ${maxResults}`);

    const results = await searchManager.performIntelligentSearch(
      query,
      maxResults,
      searchType,
      freshness,
      filters
    );

    res.json(results);
  })
);

// Status endpoint
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const status = searchManager.getStatus();
  res.json(status);
}));

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Enhanced Search Error]', error);
  res.status(500).json({
    error: 'Enhanced search service error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

export default router;
