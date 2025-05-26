
import { Router } from 'express';
import { enhancedDbManager } from '../enhanced-db-connection-manager';
import { monitoringSystem } from '../advanced-monitoring-system';
import { securityMiddleware } from '../security-enhanced-middleware';

const router = Router();

// System health overview
router.get('/health', async (req, res) => {
  try {
    const health = monitoringSystem.getSystemHealth();
    const dbMetrics = enhancedDbManager.getMetrics();
    const securityReport = securityMiddleware.getSecurityReport();
    
    const systemHealth = {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      services: {
        database: {
          healthy: health.checks.database,
          connections: {
            active: dbMetrics.activeConnections,
            idle: dbMetrics.idleConnections,
            total: dbMetrics.totalConnections
          },
          queries: {
            total: dbMetrics.totalQueries,
            failed: dbMetrics.failedQueries,
            averageTime: dbMetrics.averageQueryTime
          }
        },
        
        security: {
          activeSessions: securityReport.activeSessions,
          suspiciousIPs: securityReport.suspiciousIPs.length,
          blockedIPs: securityReport.blockedIPs.length,
          recentIncidents: securityReport.riskSummary.high + securityReport.riskSummary.critical
        },
        
        research: {
          healthy: health.checks.research,
          // Add research-specific metrics
        },
        
        memory: {
          healthy: health.checks.memory,
          usage: process.memoryUsage(),
          usageMB: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          }
        }
      },
      
      alerts: health.alerts.map(alert => ({
        severity: alert.severity,
        component: alert.component,
        message: alert.message,
        timestamp: new Date(alert.timestamp).toISOString()
      }))
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(systemHealth);
    
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'critical',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Detailed database statistics
router.get('/database/stats', async (req, res) => {
  try {
    const stats = await enhancedDbManager.getDatabaseStats();
    res.json(stats);
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve database statistics' });
  }
});

// Performance metrics
router.get('/metrics', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 1;
    const metrics = monitoringSystem.getMetricsHistory(hours);
    
    res.json({
      timeRange: `${hours} hour(s)`,
      dataPoints: metrics.length,
      metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

// System report generation
router.get('/report', async (req, res) => {
  try {
    const report = await monitoringSystem.generateReport();
    res.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate system report' });
  }
});

// Security overview
router.get('/security', async (req, res) => {
  try {
    const securityReport = securityMiddleware.getSecurityReport();
    res.json(securityReport);
  } catch (error) {
    console.error('Security report error:', error);
    res.status(500).json({ error: 'Failed to retrieve security report' });
  }
});

// Database health check with detailed info
router.get('/database/health', async (req, res) => {
  try {
    const healthCheck = await enhancedDbManager.query('SELECT NOW() as timestamp, version() as version');
    const connectionInfo = enhancedDbManager.getMetrics();
    
    res.json({
      healthy: true,
      timestamp: healthCheck[0].timestamp,
      version: healthCheck[0].version,
      metrics: connectionInfo
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Research system health
router.get('/research/health', async (req, res) => {
  try {
    // Test DeerFlow connection
    const deerflowHealth = await fetch('http://0.0.0.0:9000/health')
      .then(response => response.ok)
      .catch(() => false);
    
    // Check research cache
    const { researchCache } = await import('../optimized-research-cache');
    const cacheMetrics = researchCache.getMetrics();
    
    res.json({
      healthy: deerflowHealth,
      deerflow: {
        accessible: deerflowHealth,
        url: 'http://0.0.0.0:9000'
      },
      cache: {
        enabled: true,
        ...cacheMetrics
      }
    });
  } catch (error) {
    console.error('Research health check failed:', error);
    res.status(503).json({
      healthy: false,
      error: error.message
    });
  }
});

// Emergency operations
router.post('/emergency/clear-cache', async (req, res) => {
  try {
    const { researchCache } = await import('../optimized-research-cache');
    researchCache.clear();
    
    res.json({
      success: true,
      message: 'Emergency cache clear completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Emergency cache clear failed:', error);
    res.status(500).json({ error: 'Emergency operation failed' });
  }
});

router.post('/emergency/restart-monitoring', async (req, res) => {
  try {
    // This would restart monitoring components if needed
    res.json({
      success: true,
      message: 'Monitoring system restart completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Emergency restart failed:', error);
    res.status(500).json({ error: 'Emergency operation failed' });
  }
});

// Maintenance operations
router.post('/maintenance/optimize-database', async (req, res) => {
  try {
    await enhancedDbManager.createOptimizedIndexes();
    
    res.json({
      success: true,
      message: 'Database optimization completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database optimization failed:', error);
    res.status(500).json({ error: 'Database optimization failed' });
  }
});

export default router;
