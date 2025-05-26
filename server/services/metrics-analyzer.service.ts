
import { SearchMetrics, MetricsSummary, Alert } from '../../types/metrics.types';

export class MetricsAnalyzer {
  private readonly thresholds = {
    cache: {
      hitRate: { warning: 0.5, error: 0.3 },
      size: { warning: 0.8, error: 0.95 } // percentage of max
    },
    performance: {
      avgResponseTime: { warning: 2000, error: 5000 }, // ms
      errorRate: { warning: 0.05, error: 0.1 } // 5%, 10%
    }
  };

  analyze(metrics: SearchMetrics): MetricsSummary {
    const alerts = this.generateAlerts(metrics);
    const health = this.determineHealth(alerts);
    const recommendations = this.generateRecommendations(metrics, alerts);

    return { health, alerts, recommendations };
  }

  private generateAlerts(metrics: SearchMetrics): Alert[] {
    const alerts: Alert[] = [];

    // Cache hit rate alerts
    if (metrics.cache.hitRate < this.thresholds.cache.hitRate.error) {
      alerts.push({
        level: 'error',
        message: 'Critical: Cache hit rate is very low',
        metric: 'cache.hitRate',
        value: metrics.cache.hitRate,
        threshold: this.thresholds.cache.hitRate.error
      });
    } else if (metrics.cache.hitRate < this.thresholds.cache.hitRate.warning) {
      alerts.push({
        level: 'warning',
        message: 'Cache hit rate is below optimal level',
        metric: 'cache.hitRate',
        value: metrics.cache.hitRate,
        threshold: this.thresholds.cache.hitRate.warning
      });
    }

    // Cache size alerts
    const cacheUsageRatio = metrics.cache.size / metrics.cache.maxSize;
    if (cacheUsageRatio > this.thresholds.cache.size.error) {
      alerts.push({
        level: 'error',
        message: 'Cache is nearly full',
        metric: 'cache.size',
        value: cacheUsageRatio,
        threshold: this.thresholds.cache.size.error
      });
    }

    // Performance alerts
    if (metrics.performance.avgResponseTime > this.thresholds.performance.avgResponseTime.error) {
      alerts.push({
        level: 'error',
        message: 'Response times are critically high',
        metric: 'performance.avgResponseTime',
        value: metrics.performance.avgResponseTime,
        threshold: this.thresholds.performance.avgResponseTime.error
      });
    }

    // Error rate alerts
    if (metrics.errors.errorRate > this.thresholds.performance.errorRate.error) {
      alerts.push({
        level: 'error',
        message: 'High error rate detected',
        metric: 'errors.errorRate',
        value: metrics.errors.errorRate,
        threshold: this.thresholds.performance.errorRate.error
      });
    }

    return alerts;
  }

  private determineHealth(alerts: Alert[]): 'healthy' | 'degraded' | 'unhealthy' {
    const errorCount = alerts.filter(a => a.level === 'error').length;
    const warningCount = alerts.filter(a => a.level === 'warning').length;

    if (errorCount > 0) return 'unhealthy';
    if (warningCount > 1) return 'degraded';
    return 'healthy';
  }

  private generateRecommendations(metrics: SearchMetrics, alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    // Cache recommendations
    if (metrics.cache.hitRate < 0.7) {
      recommendations.push('Consider increasing cache TTL to improve hit rate');
    }
    if (metrics.cache.evictions > metrics.cache.size * 0.1) {
      recommendations.push('High eviction rate detected. Consider increasing cache size');
    }

    // Performance recommendations
    if (metrics.performance.p95ResponseTime > 3000) {
      recommendations.push('P95 response time is high. Review slow queries and API performance');
    }

    // Usage recommendations
    const topQuery = metrics.usage.topQueries[0];
    if (topQuery && topQuery.count > metrics.usage.totalSearches * 0.2) {
      recommendations.push(`Query "${topQuery.query}" accounts for >20% of searches. Consider optimization`);
    }

    // Error recommendations
    if (metrics.errors.errorRate > 0.01) {
      const topError = Object.entries(metrics.errors.errorsByType)
        .sort(([,a], [,b]) => b - a)[0];
      if (topError) {
        recommendations.push(`Most common error type: ${topError[0]}. Investigate root cause`);
      }
    }

    return recommendations;
  }
}
