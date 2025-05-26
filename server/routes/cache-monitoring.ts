
import express, { Request, Response, NextFunction } from 'express';
import { researchCache } from '../optimized-research-cache';

const router = express.Router();

// Constants
const CACHE_CONTROL_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

const HEALTH_THRESHOLD = {
  MIN_HIT_RATE: 0.1,
  RESPONSE_TIMEOUT: 5000
};

// Interfaces
interface CacheMetrics {
  hitRate: number;
  hits: number;
  misses: number;
  cacheSize: number;
  evictions?: number;
  avgResponseTime?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    ...CACHE_CONTROL_HEADERS,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  next();
};

// Apply middleware to all routes
router.use(addRequestId);
router.use(setSecurityHeaders);

// Utility functions
const createResponse = <T>(success: boolean, data?: T, error?: string): ApiResponse<T> => ({
  success,
  ...(data && { data }),
  ...(error && { error }),
  timestamp: new Date().toISOString()
});

const calculateCacheEfficiency = (metrics: CacheMetrics): string => {
  if (metrics.cacheSize === 0) return 'initializing';
  if (metrics.hitRate > 0.8) return 'excellent';
  if (metrics.hitRate > 0.5) return 'good';
  if (metrics.hitRate > 0.2) return 'moderate';
  return 'poor';
};

const formatMemoryUsage = (cacheSize: number): string => {
  if (cacheSize === 0) return 'Empty';
  if (cacheSize === 1) return '1 item';
  return `${cacheSize.toLocaleString()} items`;
};

/**
 * GET /api/cache-monitoring/status
 * Returns comprehensive cache status and metrics
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const metrics = await Promise.race([
      researchCache.getMetrics(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), HEALTH_THRESHOLD.RESPONSE_TIMEOUT)
      )
    ]) as CacheMetrics;
    
    const responseTime = Date.now() - startTime;
    const hitRatePercentage = (metrics.hitRate * 100).toFixed(2);
    const efficiency = calculateCacheEfficiency(metrics);
    
    const responseData = {
      type: 'optimized-lru',
      status: 'operational',
      metrics: {
        ...metrics,
        hitRatePercentage: parseFloat(hitRatePercentage),
        totalRequests: metrics.hits + metrics.misses,
        responseTimeMs: responseTime
      },
      performance: {
        hitRate: `${hitRatePercentage}%`,
        efficiency,
        memoryUsage: formatMemoryUsage(metrics.cacheSize),
        ...(metrics.evictions && { evictionCount: metrics.evictions }),
        ...(metrics.avgResponseTime && { avgResponseTimeMs: metrics.avgResponseTime.toFixed(2) })
      },
      health: {
        status: efficiency !== 'poor' ? 'healthy' : 'degraded',
        lastChecked: new Date().toISOString()
      }
    };
    
    res.json(createResponse(true, responseData));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get cache status';
    console.error(`[${req.requestId}] Cache status error:`, error);
    
    res.status(500).json(createResponse(false, undefined, errorMessage));
  }
}));

/**
 * POST /api/cache-monitoring/clear
 * Clears the optimized research cache
 */
router.post('/clear', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Optional: Add authentication check here
    // if (!req.user?.isAdmin) {
    //   return res.status(403).json(createResponse(false, undefined, 'Unauthorized'));
    // }
    
    const beforeSize = researchCache.getMetrics().cacheSize;
    await researchCache.clear();
    
    const responseData = {
      message: 'Optimized research cache cleared successfully',
      itemsCleared: beforeSize,
      currentSize: 0
    };
    
    // Log important actions
    console.log(`[${req.requestId}] Cache cleared by ${req.ip} - ${beforeSize} items removed`);
    
    res.json(createResponse(true, responseData));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to clear cache';
    console.error(`[${req.requestId}] Cache clear error:`, error);
    
    res.status(500).json(createResponse(false, undefined, errorMessage));
  }
}));

/**
 * GET /api/cache-monitoring/health
 * Health check for cache system with detailed diagnostics
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const verbose = req.query.verbose === 'true';
  
  try {
    const metrics = await Promise.race([
      researchCache.getMetrics(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), HEALTH_THRESHOLD.RESPONSE_TIMEOUT)
      )
    ]) as CacheMetrics;
    
    const responseTime = Date.now() - startTime;
    const totalRequests = metrics.hits + metrics.misses;
    const isHealthy = metrics.hitRate > HEALTH_THRESHOLD.MIN_HIT_RATE || totalRequests === 0;
    const status = isHealthy ? 'healthy' : 'degraded';
    
    const healthData = {
      status,
      checks: {
        cacheOperational: true,
        hitRateAcceptable: metrics.hitRate > HEALTH_THRESHOLD.MIN_HIT_RATE,
        responseTimeAcceptable: responseTime < 100
      },
      metrics: {
        hitRate: parseFloat((metrics.hitRate * 100).toFixed(2)),
        cacheSize: metrics.cacheSize,
        totalRequests,
        responseTimeMs: responseTime
      }
    };
    
    // Add verbose diagnostics if requested
    if (verbose) {
      Object.assign(healthData, {
        diagnostics: {
          hits: metrics.hits,
          misses: metrics.misses,
          evictions: metrics.evictions || 0,
          efficiency: calculateCacheEfficiency(metrics),
          memoryUsage: formatMemoryUsage(metrics.cacheSize),
          thresholds: HEALTH_THRESHOLD
        }
      });
    }
    
    res.status(isHealthy ? 200 : 503).json(createResponse(isHealthy, healthData));
  } catch (error) {
    console.error(`[${req.requestId}] Health check error:`, error);
    
    res.status(503).json(createResponse(false, {
      status: 'unhealthy',
      checks: {
        cacheOperational: false,
        hitRateAcceptable: false,
        responseTimeAcceptable: false
      },
      error: 'Cache health check failed'
    }));
  }
}));

/**
 * GET /api/cache-monitoring/metrics
 * Returns raw metrics for monitoring systems
 */
router.get('/metrics', asyncHandler(async (req: Request, res: Response) => {
  try {
    const metrics = researchCache.getMetrics();
    const totalRequests = metrics.hits + metrics.misses;
    
    // Prometheus-style metrics format
    const metricsText = `
# HELP cache_hit_rate Cache hit rate ratio
# TYPE cache_hit_rate gauge
cache_hit_rate ${metrics.hitRate}

# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total ${metrics.hits}

# HELP cache_misses_total Total number of cache misses
# TYPE cache_misses_total counter
cache_misses_total ${metrics.misses}

# HELP cache_size Current number of items in cache
# TYPE cache_size gauge
cache_size ${metrics.cacheSize}

# HELP cache_requests_total Total number of cache requests
# TYPE cache_requests_total counter
cache_requests_total ${totalRequests}
`.trim();
    
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsText);
  } catch (error) {
    console.error(`[${req.requestId}] Metrics error:`, error);
    res.status(500).send('# Error: Failed to get metrics\n');
  }
}));

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${req.requestId}] Unhandled error:`, error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(500).json(createResponse(false, undefined, 'Internal server error'));
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
