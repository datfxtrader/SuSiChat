
import express from 'express';
import { webSearchService } from '../performWebSearch';

const router = express.Router();

/**
 * GET /api/search-metrics
 * Returns web search service performance metrics
 */
router.get('/', (req, res) => {
  try {
    const metrics = webSearchService.getMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting search metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search metrics'
    });
  }
});

/**
 * POST /api/search-metrics/clear-cache
 * Clears the search cache
 */
router.post('/clear-cache', (req, res) => {
  try {
    webSearchService.clearCache();
    
    res.json({
      success: true,
      message: 'Search cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing search cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear search cache'
    });
  }
});

export default router;
