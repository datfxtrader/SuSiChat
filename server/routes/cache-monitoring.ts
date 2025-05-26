
import express from 'express';
import { researchCache } from '../optimized-research-cache';

const router = express.Router();

/**
 * GET /api/cache-monitoring/status
 * Returns comprehensive cache status and metrics
 */
router.get('/status', (req, res) => {
  try {
    const metrics = researchCache.getMetrics();
    
    res.json({
      success: true,
      cache: {
        type: 'optimized-lru',
        status: 'operational',
        metrics,
        performance: {
          hitRatePercentage: (metrics.hitRate * 100).toFixed(2),
          efficiency: metrics.cacheSize > 0 ? 'optimal' : 'initializing',
          memoryUsage: `${metrics.cacheSize} items cached`
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache status'
    });
  }
});

/**
 * POST /api/cache-monitoring/clear
 * Clears the optimized research cache
 */
router.post('/clear', (req, res) => {
  try {
    researchCache.clear();
    
    res.json({
      success: true,
      message: 'Optimized research cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * GET /api/cache-monitoring/health
 * Health check for cache system
 */
router.get('/health', (req, res) => {
  try {
    const metrics = researchCache.getMetrics();
    const isHealthy = metrics.hitRate > 0.1 || metrics.cacheSize === 0; // Healthy if hit rate > 10% or cache is empty
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'degraded',
      metrics: {
        hitRate: metrics.hitRate,
        cacheSize: metrics.cacheSize,
        totalRequests: metrics.hits + metrics.misses
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking cache health:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Cache health check failed'
    });
  }
});

export default router;
