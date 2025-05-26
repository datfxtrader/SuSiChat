
import winston from 'winston';
import path from 'path';

interface LogContext {
  userId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  metadata?: any;
}

class StructuredLogger {
  private logger: winston.Logger;
  private logDir = 'logs';

  constructor() {
    this.ensureLogDirectory();
    this.initializeLogger();
  }

  private ensureLogDirectory() {
    const fs = require('fs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private initializeLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        return log;
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'deerflow-app' },
      transports: [
        // Console output with colors
        new winston.transports.Console({
          format: consoleFormat
        }),
        
        // All logs
        new winston.transports.File({
          filename: path.join(this.logDir, 'app.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }),
        
        // Error logs only
        new winston.transports.File({
          filename: path.join(this.logDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 3
        }),
        
        // Performance logs
        new winston.transports.File({
          filename: path.join(this.logDir, 'performance.log'),
          level: 'info',
          maxsize: 5 * 1024 * 1024,
          maxFiles: 3,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format((info) => {
              return info.category === 'performance' ? info : false;
            })()
          )
        })
      ]
    });
  }

  info(message: string, context: LogContext = {}) {
    this.logger.info(message, { ...context, category: 'general' });
  }

  error(message: string, error?: Error, context: LogContext = {}) {
    this.logger.error(message, {
      ...context,
      category: 'error',
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  warn(message: string, context: LogContext = {}) {
    this.logger.warn(message, { ...context, category: 'warning' });
  }

  debug(message: string, context: LogContext = {}) {
    this.logger.debug(message, { ...context, category: 'debug' });
  }

  performance(operation: string, duration: number, context: LogContext = {}) {
    this.logger.info(`Performance: ${operation}`, {
      ...context,
      category: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString()
    });

    // Track performance metrics
    this.trackPerformanceMetric(operation, duration, context);
  }

  private performanceMetrics = new Map<string, {
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    avgDuration: number;
    lastUpdated: number;
  }>();

  private trackPerformanceMetric(operation: string, duration: number, context: LogContext = {}) {
    const key = `${operation}:${context.component || 'unknown'}`;
    const existing = this.performanceMetrics.get(key) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      avgDuration: 0,
      lastUpdated: Date.now()
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.lastUpdated = Date.now();

    this.performanceMetrics.set(key, existing);

    // Log slow operations
    if (duration > 5000) { // 5 seconds
      this.warn(`Slow operation detected: ${operation}`, {
        ...context,
        duration,
        avgDuration: existing.avgDuration
      });
    }
  }

  getPerformanceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    for (const [key, value] of this.performanceMetrics.entries()) {
      metrics[key] = value;
    }
    return metrics;
  }

  clearOldMetrics(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, value] of this.performanceMetrics.entries()) {
      if (value.lastUpdated < cutoff) {
        this.performanceMetrics.delete(key);
      }
    }
  }

  audit(action: string, context: LogContext = {}) {
    this.logger.info(`Audit: ${action}`, {
      ...context,
      category: 'audit',
      action,
      timestamp: new Date().toISOString()
    });
  }

  security(event: string, context: LogContext = {}) {
    this.logger.warn(`Security: ${event}`, {
      ...context,
      category: 'security',
      event,
      timestamp: new Date().toISOString()
    });
  }

  business(metric: string, value: number, context: LogContext = {}) {
    this.logger.info(`Business Metric: ${metric}`, {
      ...context,
      category: 'business',
      metric,
      value,
      timestamp: new Date().toISOString()
    });
  }
}

export const logger = new StructuredLogger();

// Express middleware for request logging
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    component: 'http'
  });

  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    logger.performance('HTTP Request', duration, {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      component: 'http'
    });

    if (res.statusCode >= 400) {
      logger.error('Request failed', undefined, {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        component: 'http'
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
