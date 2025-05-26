
import { EventEmitter } from 'events';
import { enhancedDbManager } from './enhanced-db-connection-manager';

interface SystemMetrics {
  timestamp: number;
  database: {
    healthy: boolean;
    responseTime: number;
    activeConnections: number;
    queuedQueries: number;
    cacheHitRatio: number;
  };
  application: {
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    activeUsers: number;
    requestsPerMinute: number;
  };
  research: {
    activeResearchTasks: number;
    completedToday: number;
    averageResponseTime: number;
    errorRate: number;
  };
  chat: {
    activeConversations: number;
    messagesPerMinute: number;
    averageResponseTime: number;
  };
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

class AdvancedMonitoringSystem extends EventEmitter {
  private metrics: SystemMetrics[] = [];
  private alerts: Alert[] = [];
  private isRunning = false;
  private metricsInterval: NodeJS.Timeout;
  private requestCounts = new Map<string, number>();
  private responseTimes: number[] = [];
  
  constructor() {
    super();
    this.initializeMonitoring();
  }
  
  private initializeMonitoring(): void {
    console.log('🔍 Initializing advanced monitoring system...');
    
    // Listen to database events
    enhancedDbManager.on('pool_error', (error) => {
      this.createAlert('critical', 'database', `Database pool error: ${error.message}`);
    });
    
    enhancedDbManager.on('query_executed', (data) => {
      this.responseTimes.push(data.duration);
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-50);
      }
      
      if (data.duration > 5000) {
        this.createAlert('warning', 'database', `Slow query detected: ${data.duration}ms`);
      }
    });
    
    // Monitor system resources
    this.startMetricsCollection();
    this.startAlertProcessing();
  }
  
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const currentMetrics = await this.collectMetrics();
        this.metrics.push(currentMetrics);
        
        // Keep only last 24 hours of metrics (assuming 1 minute intervals)
        if (this.metrics.length > 1440) {
          this.metrics = this.metrics.slice(-720); // Keep last 12 hours
        }
        
        this.analyzeMetrics(currentMetrics);
        this.emit('metrics_collected', currentMetrics);
      } catch (error) {
        console.error('❌ Metrics collection failed:', error);
      }
    }, 60000); // Collect every minute
  }
  
  private async collectMetrics(): Promise<SystemMetrics> {
    const dbMetrics = enhancedDbManager.getMetrics();
    const memoryUsage = process.memoryUsage();
    
    // Calculate requests per minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = Array.from(this.requestCounts.entries())
      .filter(([timestamp]) => parseInt(timestamp) > oneMinuteAgo)
      .reduce((sum, [, count]) => sum + count, 0);
    
    // Calculate average response time
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;
    
    return {
      timestamp: now,
      database: {
        healthy: dbMetrics.totalQueries > 0 && dbMetrics.failedQueries / dbMetrics.totalQueries < 0.1,
        responseTime: avgResponseTime,
        activeConnections: dbMetrics.activeConnections,
        queuedQueries: dbMetrics.waitingClients,
        cacheHitRatio: 0.85 // Placeholder - would calculate from actual cache stats
      },
      application: {
        memoryUsage,
        uptime: process.uptime(),
        activeUsers: await this.getActiveUserCount(),
        requestsPerMinute: recentRequests
      },
      research: {
        activeResearchTasks: await this.getActiveResearchCount(),
        completedToday: await this.getCompletedResearchToday(),
        averageResponseTime: await this.getResearchResponseTime(),
        errorRate: await this.getResearchErrorRate()
      },
      chat: {
        activeConversations: await this.getActiveConversationCount(),
        messagesPerMinute: await this.getMessagesPerMinute(),
        averageResponseTime: await this.getChatResponseTime()
      }
    };
  }
  
  private analyzeMetrics(metrics: SystemMetrics): void {
    // Database health checks
    if (!metrics.database.healthy) {
      this.createAlert('critical', 'database', 'Database health check failed');
    }
    
    if (metrics.database.responseTime > 2000) {
      this.createAlert('warning', 'database', `High database response time: ${metrics.database.responseTime}ms`);
    }
    
    if (metrics.database.activeConnections > 18) {
      this.createAlert('warning', 'database', 'High database connection usage');
    }
    
    // Memory usage checks
    const memoryUsageMB = metrics.application.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 800) {
      this.createAlert('warning', 'application', `High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
    }
    
    // Research system checks
    if (metrics.research.errorRate > 0.2) {
      this.createAlert('error', 'research', `High research error rate: ${(metrics.research.errorRate * 100).toFixed(1)}%`);
    }
    
    // Performance checks
    if (metrics.application.requestsPerMinute > 1000) {
      this.createAlert('info', 'application', 'High request volume detected');
    }
  }
  
  private createAlert(severity: Alert['severity'], component: string, message: string): void {
    const alert: Alert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      component,
      message,
      timestamp: Date.now(),
      resolved: false
    };
    
    this.alerts.push(alert);
    console.log(`🚨 Alert [${severity.toUpperCase()}] ${component}: ${message}`);
    this.emit('alert_created', alert);
    
    // Auto-resolve info alerts after 5 minutes
    if (severity === 'info') {
      setTimeout(() => this.resolveAlert(alert.id), 300000);
    }
  }
  
  private startAlertProcessing(): void {
    setInterval(() => {
      // Clean up old resolved alerts
      const oneHourAgo = Date.now() - 3600000;
      this.alerts = this.alerts.filter(alert => 
        !alert.resolved || alert.timestamp > oneHourAgo
      );
      
      // Check for duplicate alerts and resolve old ones
      const activeAlerts = this.alerts.filter(a => !a.resolved);
      const duplicates = new Map<string, Alert[]>();
      
      activeAlerts.forEach(alert => {
        const key = `${alert.component}-${alert.message}`;
        if (!duplicates.has(key)) {
          duplicates.set(key, []);
        }
        duplicates.get(key)!.push(alert);
      });
      
      // Resolve older duplicate alerts
      duplicates.forEach(alerts => {
        if (alerts.length > 1) {
          alerts.slice(0, -1).forEach(alert => this.resolveAlert(alert.id));
        }
      });
    }, 300000); // Every 5 minutes
  }
  
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
      this.emit('alert_resolved', alert);
    }
  }
  
  // Helper methods for metric collection
  private async getActiveUserCount(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(
        'SELECT COUNT(DISTINCT user_id) FROM user_sessions WHERE expires_at > NOW()',
        [],
        { cache: true, cacheTTL: 30000 }
      );
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }
  
  private async getActiveResearchCount(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(
        'SELECT COUNT(*) FROM research_sessions WHERE created_at > NOW() - INTERVAL \'1 hour\' AND status = \'active\'',
        [],
        { cache: true, cacheTTL: 30000 }
      );
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }
  
  private async getCompletedResearchToday(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(
        'SELECT COUNT(*) FROM research_sessions WHERE DATE(created_at) = CURRENT_DATE AND status = \'completed\'',
        [],
        { cache: true, cacheTTL: 300000 }
      );
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }
  
  private async getResearchResponseTime(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(
        'SELECT AVG(processing_time_ms) FROM research_sessions WHERE created_at > NOW() - INTERVAL \'1 hour\'',
        [],
        { cache: true, cacheTTL: 60000 }
      );
      return result[0]?.avg || 0;
    } catch {
      return 0;
    }
  }
  
  private async getResearchErrorRate(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'error') as errors,
          COUNT(*) as total
        FROM research_sessions 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `, [], { cache: true, cacheTTL: 60000 });
      
      const row = result[0];
      return row && row.total > 0 ? row.errors / row.total : 0;
    } catch {
      return 0;
    }
  }
  
  private async getActiveConversationCount(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(
        'SELECT COUNT(*) FROM conversations WHERE last_message_at > NOW() - INTERVAL \'1 hour\'',
        [],
        { cache: true, cacheTTL: 60000 }
      );
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }
  
  private async getMessagesPerMinute(): Promise<number> {
    try {
      const result = await enhancedDbManager.query(
        'SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL \'1 minute\'',
        [],
        { cache: true, cacheTTL: 10000 }
      );
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }
  
  private async getChatResponseTime(): Promise<number> {
    // This would require tracking actual response times in your chat system
    return 1500; // Placeholder
  }
  
  // Public API methods
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    checks: Record<string, boolean>;
    alerts: Alert[];
  } {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    
    const checks = {
      database: latestMetrics?.database.healthy ?? false,
      memory: latestMetrics ? latestMetrics.application.memoryUsage.heapUsed < 800 * 1024 * 1024 : false,
      responseTime: latestMetrics ? latestMetrics.database.responseTime < 2000 : false,
      research: latestMetrics ? latestMetrics.research.errorRate < 0.1 : false
    };
    
    const hasкритical = activeAlerts.some(a => a.severity === 'critical');
    const hasError = activeAlerts.some(a => a.severity === 'error');
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (hasKritical || !Object.values(checks).every(Boolean)) {
      status = 'critical';
    } else if (hasError || activeAlerts.length > 5) {
      status = 'degraded';
    }
    
    return { status, checks, alerts: activeAlerts };
  }
  
  getMetricsHistory(hours = 1): SystemMetrics[] {
    const cutoff = Date.now() - (hours * 3600000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }
  
  recordRequest(path: string): void {
    const minute = Math.floor(Date.now() / 60000).toString();
    this.requestCounts.set(minute, (this.requestCounts.get(minute) || 0) + 1);
    
    // Clean old entries
    const fiveMinutesAgo = Math.floor((Date.now() - 300000) / 60000).toString();
    for (const key of this.requestCounts.keys()) {
      if (key < fiveMinutesAgo) {
        this.requestCounts.delete(key);
      }
    }
  }
  
  async generateReport(): Promise<{
    summary: any;
    performance: any;
    alerts: any;
    recommendations: string[];
  }> {
    const health = this.getSystemHealth();
    const recentMetrics = this.getMetricsHistory(24);
    const dbStats = await enhancedDbManager.getDatabaseStats();
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on metrics
    if (health.status !== 'healthy') {
      recommendations.push('System health is degraded - check active alerts');
    }
    
    if (recentMetrics.length > 0) {
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.database.responseTime, 0) / recentMetrics.length;
      if (avgResponseTime > 1000) {
        recommendations.push('Consider optimizing database queries - average response time is high');
      }
      
      const maxMemory = Math.max(...recentMetrics.map(m => m.application.memoryUsage.heapUsed));
      if (maxMemory > 700 * 1024 * 1024) {
        recommendations.push('Monitor memory usage - approaching limits');
      }
    }
    
    return {
      summary: {
        status: health.status,
        uptime: process.uptime(),
        totalAlerts: this.alerts.length,
        activeAlerts: health.alerts.length
      },
      performance: {
        averageResponseTime: recentMetrics.length > 0 
          ? recentMetrics.reduce((sum, m) => sum + m.database.responseTime, 0) / recentMetrics.length 
          : 0,
        requestsPerHour: recentMetrics.reduce((sum, m) => sum + m.application.requestsPerMinute * 60, 0),
        memoryUsage: process.memoryUsage()
      },
      alerts: {
        critical: health.alerts.filter(a => a.severity === 'critical').length,
        error: health.alerts.filter(a => a.severity === 'error').length,
        warning: health.alerts.filter(a => a.severity === 'warning').length
      },
      recommendations
    };
  }
  
  shutdown(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.removeAllListeners();
    console.log('🔒 Monitoring system shutdown complete');
  }
}

export const monitoringSystem = new AdvancedMonitoringSystem();
export default monitoringSystem;
