
// services/metrics-aggregator.service.ts
import { ServiceMetrics } from '../../types/yahoo-finance.types';

export class MetricsAggregator {
  private performanceMetrics: number[] = [];
  private readonly maxMetricsSize = 1000;

  recordResponseTime(responseTime: number): void {
    this.performanceMetrics.push(responseTime);
    if (this.performanceMetrics.length > this.maxMetricsSize) {
      this.performanceMetrics.shift();
    }
  }

  getPerformanceStats() {
    if (this.performanceMetrics.length === 0) {
      return {
        avg: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...this.performanceMetrics].sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      avg: Math.round(avg),
      p95: sorted[p95Index] || avg,
      p99: sorted[p99Index] || avg
    };
  }

  analyzeHealth(metrics: ServiceMetrics): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Cache performance
    if (metrics.cache.hitRate < 0.5) {
      issues.push('Low cache hit rate');
      score -= 20;
    }

    // Response time
    if (metrics.performance.avgResponseTime > 2000) {
      issues.push('High average response time');
      score -= 15;
    }

    // Circuit breaker
    if (metrics.reliability.circuitBreakerStatus === 'open') {
      issues.push('Circuit breaker is open');
      score -= 30;
    }

    // Error rate
    if (metrics.errors.rate > 0.1) {
      issues.push('High error rate');
      score -= 25;
    }

    // Recent failures
    if (metrics.reliability.consecutiveFailures > 3) {
      issues.push('Multiple consecutive failures');
      score -= 20;
    }

    const status = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'unhealthy';

    return { status, issues, score: Math.max(0, score) };
  }
}
