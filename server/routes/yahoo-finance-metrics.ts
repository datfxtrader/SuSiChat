
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { yahooFinanceService } from '../yahoo-finance-integration';
import { MetricsAggregator } from '../services/metrics-aggregator.service';
import { 
  validateBatchRequest, 
  validateSymbol, 
  handleValidationErrors 
} from '../middleware/validation.middleware';
import { BatchCryptoRequest, BatchCryptoResponse } from '../../types/yahoo-finance.types';

const router = express.Router();
const metricsAggregator = new MetricsAggregator();

// Constants
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=10',
  'X-Content-Type-Options': 'nosniff'
};

// Middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = `yf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

const recordMetrics = (startTime: number) => (req: Request, res: Response, next: NextFunction) => {
  const responseTime = Date.now() - startTime;
  metricsAggregator.recordResponseTime(responseTime);
  res.locals.responseTime = responseTime;
  next();
};

// Rate limiting
const standardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: 'Too many requests'
});

const batchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: 'Too many batch requests'
});

// Apply global middleware
router.use(addRequestId);

/**
 * GET /api/yahoo-finance/metrics
 * Returns comprehensive service metrics with analysis
 */
router.get('/metrics',
  standardLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const metrics = yahooFinanceService.getMetrics();
      const performanceStats = metricsAggregator.getPerformanceStats();
      const healthAnalysis = metricsAggregator.analyzeHealth(metrics);

      // Enhance metrics with aggregated data
      const enhancedMetrics = {
        ...metrics,
        performance: {
          ...metrics.performance,
          ...performanceStats
        },
        health: healthAnalysis
      };

      res.set(CACHE_HEADERS).json({
        success: true,
        metrics: enhancedMetrics,
        timestamp: new Date().toISOString()
      });

      recordMetrics(startTime)(req, res, () => {});
    } catch (error) {
      console.error(`[${req.requestId}] Metrics error:`, error);
      throw error;
    }
  })
);

/**
 * GET /api/yahoo-finance/bitcoin/price
 * Get current Bitcoin price with enhanced data
 */
router.get('/bitcoin/price',
  standardLimiter,
  validateSymbol,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const bitcoinData = await yahooFinanceService.getCurrentBitcoinPrice();
      
      if (!bitcoinData) {
        return res.status(503).json({
          success: false,
          error: 'Bitcoin price unavailable',
          message: 'Service temporarily unable to fetch Bitcoin price',
          timestamp: new Date().toISOString()
        });
      }

      res.set(CACHE_HEADERS).json({
        success: true,
        data: bitcoinData,
        performance: {
          responseTime: Date.now() - startTime,
          cached: bitcoinData.cached || false,
          dataAge: bitcoinData.timestamp 
            ? Date.now() - new Date(bitcoinData.timestamp).getTime()
            : null
        },
        timestamp: new Date().toISOString()
      });

      recordMetrics(startTime)(req, res, () => {});
    } catch (error) {
      console.error(`[${req.requestId}] Bitcoin price error:`, error);
      throw error;
    }
  })
);

/**
 * GET /api/yahoo-finance/bitcoin/context
 * Get Bitcoin market context with analysis
 */
router.get('/bitcoin/context',
  standardLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const includeAnalysis = req.query.includeAnalysis === 'true';
    
    try {
      const context = await yahooFinanceService.getBitcoinMarketContext();
      
      const response: any = {
        success: true,
        context,
        performance: {
          responseTime: Date.now() - startTime
        },
        timestamp: new Date().toISOString()
      };

      // Add market analysis if requested
      if (includeAnalysis && context) {
        response.analysis = {
          trend: context.sentiment,
          volatilityLevel: context.volatilityIndex > 30 ? 'high' : 
                          context.volatilityIndex > 20 ? 'medium' : 'low',
          correlationStrength: {
            sp500: Math.abs(context.correlations.sp500) > 0.7 ? 'strong' : 'moderate',
            gold: Math.abs(context.correlations.gold) > 0.7 ? 'strong' : 'moderate'
          }
        };
      }

      res.set(CACHE_HEADERS).json(response);
      recordMetrics(startTime)(req, res, () => {});
    } catch (error) {
      console.error(`[${req.requestId}] Context error:`, error);
      throw error;
    }
  })
);

/**
 * POST /api/yahoo-finance/crypto/batch
 * Batch fetch multiple crypto prices
 */
router.post('/crypto/batch',
  batchLimiter,
  validateBatchRequest,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { symbols, options }: BatchCryptoRequest = req.body;
    
    try {
      console.log(`[${req.requestId}] Batch request for ${symbols.length} symbols`);
      
      // Normalize symbols
      const normalizedSymbols = symbols.map(s => s.toUpperCase());
      
      // Fetch prices with error handling per symbol
      const results = await yahooFinanceService.getCryptoPrices(normalizedSymbols);
      
      // Convert Map to object and track success/failures
      const resultsObject: Record<string, any> = {};
      let successCount = 0;
      let failureCount = 0;
      
      results.forEach((value, key) => {
        if (value && 'price' in value) {
          successCount++;
        } else {
          failureCount++;
        }
        resultsObject[key] = value;
      });

      const response: BatchCryptoResponse = {
        success: true,
        data: resultsObject,
        performance: {
          responseTime: Date.now() - startTime,
          symbolCount: symbols.length,
          successCount,
          failureCount
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
      recordMetrics(startTime)(req, res, () => {});
    } catch (error) {
      console.error(`[${req.requestId}] Batch error:`, error);
      throw error;
    }
  })
);

/**
 * POST /api/yahoo-finance/cache/clear
 * Clear cache with confirmation
 */
router.post('/cache/clear',
  asyncHandler(async (req: Request, res: Response) => {
    const { confirm } = req.body;
    
    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        message: 'Set confirm: true to clear cache'
      });
    }
    
    try {
      const beforeMetrics = yahooFinanceService.getMetrics();
      yahooFinanceService.clearCache();
      
      console.log(`[${req.requestId}] Cache cleared - ${beforeMetrics.cache.size} items removed`);
      
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        itemsCleared: beforeMetrics.cache.size,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`[${req.requestId}] Cache clear error:`, error);
      throw error;
    }
  })
);

/**
 * GET /api/yahoo-finance/health
 * Enhanced health check with detailed status
 */
router.get('/health',
  asyncHandler(async (req: Request, res: Response) => {
    const verbose = req.query.verbose === 'true';
    
    try {
      const metrics = yahooFinanceService.getMetrics();
      const healthAnalysis = metricsAggregator.analyzeHealth(metrics);
      
      const response: any = {
        status: healthAnalysis.status,
        score: healthAnalysis.score,
        timestamp: new Date().toISOString()
      };

      if (verbose) {
        response.details = {
          issues: healthAnalysis.issues,
          metrics: {
            cache: {
              hitRate: metrics.cache.hitRate,
              size: `${metrics.cache.size}/${metrics.cache.maxSize}`
            },
            reliability: {
              uptime: `${metrics.reliability.uptime.toFixed(2)}%`,
              circuitBreaker: metrics.reliability.circuitBreakerStatus,
              lastSuccess: metrics.reliability.lastSuccessfulFetch
            },
            performance: {
              avgResponseTime: `${metrics.performance.avgResponseTime}ms`,
              requestsPerMinute: metrics.performance.requestsPerMinute
            }
          }
        };
      }

      const statusCode = healthAnalysis.status === 'healthy' ? 200 : 
                        healthAnalysis.status === 'degraded' ? 503 : 500;
      
      res.status(statusCode).json(response);
    } catch (error) {
      console.error(`[${req.requestId}] Health check error:`, error);
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  })
);

/**
 * GET /api/yahoo-finance/symbols/validate
 * Validate crypto symbols
 */
router.get('/symbols/validate',
  validateSymbol,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol parameter required'
      });
    }
    
    const validSymbols = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'USDC', 'ADA', 'AVAX', 'DOGE'];
    const isValid = validSymbols.includes(symbol.toString().toUpperCase());
    
    res.json({
      success: true,
      symbol: symbol.toString().toUpperCase(),
      valid: isValid,
      message: isValid ? 'Valid symbol' : 'Unknown symbol',
      timestamp: new Date().toISOString()
    });
  })
);

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId || 'unknown';
  console.error(`[${requestId}] Unhandled error:`, error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Service error',
    requestId,
    timestamp: new Date().toISOString()
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
