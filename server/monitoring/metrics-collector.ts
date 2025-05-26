
import { EventEmitter } from 'events';

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
}

interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  buckets: Map<number, number>;
}

class MetricsCollector extends EventEmitter {
  private metrics = new Map<string, Metric[]>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, HistogramData>();
  private timers = new Map<string, number[]>();

  // Counter methods
  incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}) {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      timestamp: new Date(),
      tags,
      type: 'counter'
    });
  }

  // Gauge methods
  setGauge(name: string, value: number, tags: Record<string, string> = {}) {
    const key = this.buildKey(name, tags);
    this.gauges.set(key, value);
    
    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'gauge'
    });
  }

  // Histogram methods
  recordHistogram(name: string, value: number, tags: Record<string, string> = {}) {
    const key = this.buildKey(name, tags);
    let histogram = this.histograms.get(key);
    
    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        min: value,
        max: value,
        buckets: new Map()
      };
      this.histograms.set(key, histogram);
    }

    histogram.count++;
    histogram.sum += value;
    histogram.min = Math.min(histogram.min, value);
    histogram.max = Math.max(histogram.max, value);

    // Update buckets (0.1, 0.5, 1, 2.5, 5, 10 seconds for timing)
    const buckets = [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100];
    buckets.forEach(bucket => {
      if (value <= bucket) {
        const current = histogram!.buckets.get(bucket) || 0;
        histogram!.buckets.set(bucket, current + 1);
      }
    });

    this.recordMetric({
      name,
      value,
      timestamp: new Date(),
      tags,
      type: 'histogram'
    });
  }

  // Timer methods
  startTimer(name: string, tags: Record<string, string> = {}): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.recordTimer(name, duration, tags);
    };
  }

  recordTimer(name: string, duration: number, tags: Record<string, string> = {}) {
    const key = this.buildKey(name, tags);
    const timers = this.timers.get(key) || [];
    timers.push(duration);
    
    // Keep only last 1000 measurements
    if (timers.length > 1000) {
      timers.shift();
    }
    
    this.timers.set(key, timers);
    this.recordHistogram(name, duration, tags);
  }

  // Business metrics
  recordBusinessMetric(name: string, value: number, tags: Record<string, string> = {}) {
    this.setGauge(`business.${name}`, value, tags);
  }

  recordApiCall(endpoint: string, method: string, statusCode: number, duration: number) {
    const tags = { endpoint, method, status_code: statusCode.toString() };
    
    this.incrementCounter('api.requests_total', 1, tags);
    this.recordTimer('api.request_duration', duration, tags);
    
    if (statusCode >= 400) {
      this.incrementCounter('api.errors_total', 1, tags);
    }
  }

  recordDatabaseOperation(operation: string, table: string, duration: number, success: boolean) {
    const tags = { operation, table, success: success.toString() };
    
    this.incrementCounter('db.operations_total', 1, tags);
    this.recordTimer('db.operation_duration', duration, tags);
    
    if (!success) {
      this.incrementCounter('db.errors_total', 1, tags);
    }
  }

  recordCacheOperation(operation: string, hit: boolean) {
    const tags = { operation, result: hit ? 'hit' : 'miss' };
    this.incrementCounter('cache.operations_total', 1, tags);
  }

  recordJobProcessing(jobType: string, status: string, duration?: number) {
    const tags = { job_type: jobType, status };
    
    this.incrementCounter('jobs.processed_total', 1, tags);
    
    if (duration !== undefined) {
      this.recordTimer('jobs.processing_duration', duration, tags);
    }
  }

  // Data retrieval methods
  getMetrics(name?: string, since?: Date): Metric[] {
    if (name) {
      return this.metrics.get(name)?.filter(m => !since || m.timestamp >= since) || [];
    }

    const allMetrics: Metric[] = [];
    this.metrics.forEach(metrics => {
      allMetrics.push(...metrics.filter(m => !since || m.timestamp >= since));
    });

    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getCounter(name: string, tags: Record<string, string> = {}): number {
    const key = this.buildKey(name, tags);
    return this.counters.get(key) || 0;
  }

  getGauge(name: string, tags: Record<string, string> = {}): number | undefined {
    const key = this.buildKey(name, tags);
    return this.gauges.get(key);
  }

  getHistogramStats(name: string, tags: Record<string, string> = {}) {
    const key = this.buildKey(name, tags);
    const histogram = this.histograms.get(key);
    
    if (!histogram) return null;

    return {
      count: histogram.count,
      sum: histogram.sum,
      min: histogram.min,
      max: histogram.max,
      avg: histogram.count > 0 ? histogram.sum / histogram.count : 0,
      buckets: Object.fromEntries(histogram.buckets)
    };
  }

  getTimerStats(name: string, tags: Record<string, string> = {}) {
    const key = this.buildKey(name, tags);
    const timers = this.timers.get(key);
    
    if (!timers || timers.length === 0) return null;

    const sorted = [...timers].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      avg: sum / count,
      p50: sorted[Math.floor(count * 0.5)],
      p90: sorted[Math.floor(count * 0.9)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)]
    };
  }

  // System health metrics
  getSystemHealth() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const recentErrors = this.getCounter('api.errors_total');
    const recentRequests = this.getCounter('api.requests_total');
    const errorRate = recentRequests > 0 ? recentErrors / recentRequests : 0;

    return {
      timestamp: new Date(),
      error_rate: errorRate,
      request_count: recentRequests,
      avg_response_time: this.getTimerStats('api.request_duration')?.avg || 0,
      database_health: this.getGauge('db.connection_pool_active'),
      cache_hit_rate: this.calculateCacheHitRate(),
      active_jobs: this.getGauge('jobs.active_count') || 0
    };
  }

  private calculateCacheHitRate(): number {
    const hits = this.getCounter('cache.operations_total', { result: 'hit' });
    const misses = this.getCounter('cache.operations_total', { result: 'miss' });
    const total = hits + misses;
    
    return total > 0 ? hits / total : 0;
  }

  private buildKey(name: string, tags: Record<string, string>): string {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    
    return tagString ? `${name}{${tagString}}` : name;
  }

  private recordMetric(metric: Metric) {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);
    
    // Keep only last 10000 metrics per name
    if (metrics.length > 10000) {
      metrics.shift();
    }
    
    this.metrics.set(metric.name, metrics);
    this.emit('metric', metric);
  }

  // Cleanup old metrics
  cleanup(olderThanMinutes: number = 60) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    let cleaned = 0;

    this.metrics.forEach((metrics, name) => {
      const before = metrics.length;
      const filtered = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(name, filtered);
      cleaned += before - filtered.length;
    });

    return cleaned;
  }

  // Export metrics in Prometheus format
  exportPrometheusFormat(): string {
    const lines: string[] = [];

    // Counters
    this.counters.forEach((value, key) => {
      const [name, tags] = this.parseKey(key);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${tags} ${value}`);
    });

    // Gauges
    this.gauges.forEach((value, key) => {
      const [name, tags] = this.parseKey(key);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name}${tags} ${value}`);
    });

    // Histograms
    this.histograms.forEach((histogram, key) => {
      const [name, tags] = this.parseKey(key);
      lines.push(`# TYPE ${name} histogram`);
      lines.push(`${name}_count${tags} ${histogram.count}`);
      lines.push(`${name}_sum${tags} ${histogram.sum}`);
      
      histogram.buckets.forEach((count, bucket) => {
        const bucketTags = tags.slice(0, -1) + `,le="${bucket}"}`;
        lines.push(`${name}_bucket${bucketTags} ${count}`);
      });
    });

    return lines.join('\n');
  }

  private parseKey(key: string): [string, string] {
    const bracketIndex = key.indexOf('{');
    if (bracketIndex === -1) {
      return [key, ''];
    }
    
    const name = key.substring(0, bracketIndex);
    const tags = key.substring(bracketIndex);
    return [name, tags];
  }
}

export const metricsCollector = new MetricsCollector();

// Start cleanup interval
setInterval(() => {
  metricsCollector.cleanup(60); // Clean metrics older than 1 hour
}, 10 * 60 * 1000); // Run every 10 minutes
