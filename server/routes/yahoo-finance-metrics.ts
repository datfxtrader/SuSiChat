
/**
 * Yahoo Finance Service Metrics Route
 */

import express from 'express';
import { yahooFinanceService } from '../yahoo-finance-integration';

const router = express.Router();

/**
 * Get Yahoo Finance service metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = yahooFinanceService.getMetrics();
    
    res.json({
      success: true,
      metrics,
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting Yahoo Finance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get current Bitcoin price with performance data
 */
router.get('/bitcoin/price', async (req, res) => {
  try {
    const startTime = Date.now();
    const bitcoinData = await yahooFinanceService.getCurrentBitcoinPrice();
    const responseTime = Date.now() - startTime;
    
    if (bitcoinData) {
      res.json({
        success: true,
        data: bitcoinData,
        performance: {
          responseTime,
          cached: bitcoinData.cached || false
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Unable to fetch Bitcoin price',
        performance: {
          responseTime
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error getting Bitcoin price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Bitcoin price',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Bitcoin market context
 */
router.get('/bitcoin/context', async (req, res) => {
  try {
    const startTime = Date.now();
    const context = await yahooFinanceService.getBitcoinMarketContext();
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      context,
      performance: {
        responseTime
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting Bitcoin context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Bitcoin context',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Batch get multiple crypto prices
 */
router.post('/crypto/batch', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }
    
    if (symbols.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 symbols allowed per request'
      });
    }
    
    const startTime = Date.now();
    const results = await yahooFinanceService.getCryptoPrices(symbols);
    const responseTime = Date.now() - startTime;
    
    // Convert Map to object for JSON response
    const resultsObject: Record<string, any> = {};
    results.forEach((value, key) => {
      resultsObject[key] = value;
    });
    
    res.json({
      success: true,
      data: resultsObject,
      performance: {
        responseTime,
        symbolCount: symbols.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error batch fetching crypto prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch crypto prices',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Clear Yahoo Finance cache
 */
router.post('/cache/clear', async (req, res) => {
  try {
    yahooFinanceService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = yahooFinanceService.getMetrics();
    const isHealthy = metrics.lastSuccessfulFetch && 
                     new Date().getTime() - new Date(metrics.lastSuccessfulFetch).getTime() < 300000; // 5 minutes
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      metrics: {
        cacheSize: metrics.cacheSize,
        hitRate: metrics.hitRate,
        lastSuccessfulFetch: metrics.lastSuccessfulFetch,
        circuitBreakerOpens: metrics.circuitBreakerOpens
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
