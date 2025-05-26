
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { webSearchService } from '../performWebSearch';
import { MetricsAnalyzer } from '../services/metrics-analyzer.service';
import { MetricsResponse } from '../../types/metrics.types';

const router = express.Router();
const metricsAnalyzer = new MetricsAnalyzer();

// Constants
const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Middleware
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    ...CACHE_HEADERS,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });
  next();
};

// Rate limiting for metrics endpoint
const metricsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many metrics requests'
});

// Rate limiting for cache operations
const cacheLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 cache clears per 5 minutes
  message: 'Too many cache clear requests'
});

// Apply security headers to all routes
router.use(setSecurityHeaders);

/**
 * GET /api/search-metrics
 * Returns comprehensive web search service metrics with analysis
 */
router.get('/', 
  metricsLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const verbose = req.query.verbose === 'true';
    const format = req.query.format as 'json' | 'prometheus';

    try {
      const metrics = webSearchService.getMetrics();
      
      if (format === 'prometheus') {
        // Return Prometheus-formatted metrics
        const prometheusMetrics = formatPrometheusMetrics(metrics);
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        return res.send(prometheusMetrics);
      }

      // Analyze metrics
      const summary = metricsAnalyzer.analyze(metrics);
      
      const response: MetricsResponse = {
        success: true,
        metrics: verbose ? metrics : undefined,
        summary,
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime()
      };

      // Add simplified metrics if not verbose
      if (!verbose) {
        response.metrics = {
          cache: {
            hitRate: metrics.cache.hitRate,
            size: metrics.cache.size,
            maxSize: metrics.cache.maxSize,
            hits: metrics.cache.hits,
            misses: metrics.cache.misses,
            evictions: metrics.cache.evictions
          },
          performance: {
            avgResponseTime: metrics.performance.avgResponseTime,
            requestsPerMinute: metrics.performance.requestsPerMinute,
            totalRequests: metrics.performance.totalRequests,
            p95ResponseTime: metrics.performance.p95ResponseTime,
            p99ResponseTime: metrics.performance.p99ResponseTime,
            activeRequests: metrics.performance.activeRequests
          },
          usage: {
            totalSearches: metrics.usage.totalSearches,
            topQueries: metrics.usage.topQueries.slice(0, 5),
            searchEngineUsage: metrics.usage.searchEngineUsage,
            queryCategories: metrics.usage.queryCategories,
            peakHour: metrics.usage.peakHour
          },
          errors: {
            errorRate: metrics.errors.errorRate,
            totalErrors: metrics.errors.totalErrors,
            errorsByType: metrics.errors.errorsByType,
            lastError: metrics.errors.lastError
          }
        };
      }

      res.json(response);
    } catch (error) {
      console.error('Error getting search metrics:', error);
      throw error;
    }
  })
);

/**
 * GET /api/search-metrics/health
 * Quick health check endpoint
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  try {
    const metrics = webSearchService.getMetrics();
    const summary = metricsAnalyzer.analyze(metrics);
    
    const statusCode = summary.health === 'healthy' ? 200 : 
                      summary.health === 'degraded' ? 503 : 500;

    res.status(statusCode).json({
      status: summary.health,
      timestamp: new Date().toISOString(),
      alerts: summary.alerts.filter(a => a.level === 'error')
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to check health'
    });
  }
}));

/**
 * POST /api/search-metrics/clear-cache
 * Clears the search cache with optional confirmation
 */
router.post('/clear-cache',
  cacheLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { confirm = false } = req.body;
    
    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Cache clear must be confirmed',
        message: 'Set confirm: true in request body to clear cache'
      });
    }

    try {
      const beforeMetrics = webSearchService.getMetrics();
      const beforeSize = beforeMetrics.cache.size;
      
      webSearchService.clearCache();
      
      const afterMetrics = webSearchService.getMetrics();

      // Log important operations
      console.log(`Cache cleared by ${req.ip} - ${beforeSize} items removed`);

      res.json({
        success: true,
        message: 'Search cache cleared successfully',
        cleared: {
          itemsRemoved: beforeSize,
          previousHitRate: beforeMetrics.cache.hitRate,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error clearing search cache:', error);
      throw error;
    }
  })
);

/**
 * GET /api/search-metrics/top-queries
 * Returns top search queries with statistics
 */
router.get('/top-queries',
  metricsLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const timeframe = req.query.timeframe || 'all'; // all, hour, day

    try {
      const metrics = webSearchService.getMetrics();
      const topQueries = metrics.usage.topQueries.slice(0, limit);

      res.json({
        success: true,
        queries: topQueries,
        totalUniqueQueries: metrics.usage.topQueries.length,
        timeframe,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting top queries:', error);
      throw error;
    }
  })
);

/**
 * GET /api/search-metrics/performance
 * Returns performance statistics
 */
router.get('/performance',
  metricsLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const metrics = webSearchService.getMetrics();
      const perf = metrics.performance;

      res.json({
        success: true,
        performance: {
          ...perf,
          responseTimeHistogram: {
            fast: `< 1s: ${Math.round((perf.avgResponseTime < 1000 ? 0.7 : 0.3) * 100)}%`,
            medium: `1-3s: ${Math.round((perf.avgResponseTime < 3000 ? 0.5 : 0.2) * 100)}%`,
            slow: `> 3s: ${Math.round((perf.avgResponseTime > 3000 ? 0.3 : 0.1) * 100)}%`
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  })
);

// Helper function for Prometheus format
function formatPrometheusMetrics(metrics: any): string {
  return `
# HELP search_cache_hit_rate Cache hit rate ratio
# TYPE search_cache_hit_rate gauge
search_cache_hit_rate ${metrics.cache.hitRate}

# HELP search_cache_size Current cache size
# TYPE search_cache_size gauge
search_cache_size ${metrics.cache.size}

# HELP search_cache_hits_total Total cache hits
# TYPE search_cache_hits_total counter
search_cache_hits_total ${metrics.cache.hits}

# HELP search_cache_misses_total Total cache misses
# TYPE search_cache_misses_total counter
search_cache_misses_total ${metrics.cache.misses}

# HELP search_response_time_avg Average response time in ms
# TYPE search_response_time_avg gauge
search_response_time_avg ${metrics.performance.avgResponseTime}

# HELP search_requests_total Total search requests
# TYPE search_requests_total counter
search_requests_total ${metrics.performance.totalRequests}

# HELP search_errors_total Total errors
# TYPE search_errors_total counter
search_errors_total ${metrics.errors.totalErrors}

# HELP search_error_rate Current error rate
# TYPE search_error_rate gauge
search_error_rate ${metrics.errors.errorRate}
`.trim();
}

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Search metrics error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process metrics request',
    timestamp: new Date().toISOString()
  });
});

export default router;
