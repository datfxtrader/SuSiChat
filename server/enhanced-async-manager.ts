
import { EventEmitter } from 'events';
import { logger } from './monitoring/logger';

export interface AsyncTask<T = any> {
  id: string;
  name: string;
  priority: number;
  timeout: number;
  retries: number;
  maxRetries: number;
  execute: () => Promise<T>;
  fallback?: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface AsyncPoolOptions {
  maxConcurrency: number;
  defaultTimeout: number;
  defaultRetries: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export class EnhancedAsyncManager extends EventEmitter {
  private tasks = new Map<string, AsyncTask>();
  private activeTasks = new Set<string>();
  private taskQueue: AsyncTask[] = [];
  private results = new Map<string, any>();
  private errors = new Map<string, Error>();
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();
  
  private metrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    concurrentTasks: 0,
    maxConcurrentTasks: 0
  };

  constructor(private options: AsyncPoolOptions) {
    super();
    setInterval(() => this.processQueue(), 100);
    setInterval(() => this.checkCircuitBreakers(), 5000);
  }

  // Enhanced async execution with comprehensive error handling
  async executeTask<T>(task: AsyncTask<T>): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalTasks++;
    this.metrics.concurrentTasks++;
    this.metrics.maxConcurrentTasks = Math.max(this.metrics.maxConcurrentTasks, this.metrics.concurrentTasks);

    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(task.name)) {
        throw new Error(`Circuit breaker open for ${task.name}`);
      }

      this.activeTasks.add(task.id);
      logger.performance('Task started', 0, {
        taskId: task.id,
        taskName: task.name,
        component: 'async-manager'
      });

      // Execute with timeout
      const result = await Promise.race([
        task.execute(),
        this.createTimeoutPromise(task.timeout)
      ]);

      // Success
      this.onTaskSuccess(task, result, Date.now() - startTime);
      return result;

    } catch (error) {
      // Handle retries
      if (task.retries < task.maxRetries) {
        task.retries++;
        logger.warn(`Task ${task.name} failed, retrying (${task.retries}/${task.maxRetries})`, {
          taskId: task.id,
          error: error.message,
          component: 'async-manager'
        });
        
        // Exponential backoff
        await this.delay(Math.pow(2, task.retries) * 1000);
        return this.executeTask(task);
      }

      // Execute fallback if available
      if (task.fallback) {
        try {
          logger.info(`Executing fallback for task ${task.name}`, {
            taskId: task.id,
            component: 'async-manager'
          });
          const fallbackResult = await task.fallback();
          this.onTaskSuccess(task, fallbackResult, Date.now() - startTime, true);
          return fallbackResult;
        } catch (fallbackError) {
          logger.error(`Fallback failed for task ${task.name}`, fallbackError, {
            taskId: task.id,
            component: 'async-manager'
          });
        }
      }

      // Final failure
      this.onTaskFailure(task, error, Date.now() - startTime);
      throw error;

    } finally {
      this.activeTasks.delete(task.id);
      this.metrics.concurrentTasks--;
    }
  }

  // Batch execution with controlled parallelism
  async executeBatch<T>(tasks: AsyncTask<T>[]): Promise<(T | Error)[]> {
    const chunks = this.chunkArray(tasks, this.options.maxConcurrency);
    const results: (T | Error)[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(task => this.executeTask(task))
      );

      results.push(...chunkResults.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      ));
    }

    return results;
  }

  // Priority queue management
  addTask<T>(task: AsyncTask<T>): void {
    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    logger.debug(`Task added to queue: ${task.name}`, {
      taskId: task.id,
      priority: task.priority,
      queueLength: this.taskQueue.length,
      component: 'async-manager'
    });
  }

  // Process queue with concurrency control
  private async processQueue(): Promise<void> {
    if (this.activeTasks.size >= this.options.maxConcurrency || this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    if (task && !this.activeTasks.has(task.id)) {
      // Execute without waiting
      this.executeTask(task).catch(() => {
        // Error already handled in executeTask
      });
    }
  }

  // Circuit breaker implementation
  private isCircuitBreakerOpen(taskName: string): boolean {
    const breaker = this.circuitBreakers.get(taskName);
    if (!breaker) return false;

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      if (timeSinceLastFailure > this.options.circuitBreakerTimeout) {
        breaker.isOpen = false;
        breaker.failures = 0;
        logger.info(`Circuit breaker reset for ${taskName}`, {
          component: 'async-manager'
        });
      }
    }

    return breaker.isOpen;
  }

  private onTaskSuccess<T>(task: AsyncTask<T>, result: T, executionTime: number, wasFallback = false): void {
    this.metrics.completedTasks++;
    this.updateAverageExecutionTime(executionTime);
    
    // Reset circuit breaker on success
    const breaker = this.circuitBreakers.get(task.name);
    if (breaker) {
      breaker.failures = 0;
      breaker.isOpen = false;
    }

    this.results.set(task.id, result);
    
    if (task.onSuccess) {
      task.onSuccess(result);
    }

    logger.performance('Task completed', executionTime, {
      taskId: task.id,
      taskName: task.name,
      wasFallback,
      component: 'async-manager'
    });

    this.emit('taskCompleted', { task, result, executionTime, wasFallback });
  }

  private onTaskFailure(task: AsyncTask, error: Error, executionTime: number): void {
    this.metrics.failedTasks++;
    this.updateAverageExecutionTime(executionTime);

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(task.name) || { failures: 0, lastFailure: 0, isOpen: false };
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= this.options.circuitBreakerThreshold) {
      breaker.isOpen = true;
      logger.warn(`Circuit breaker opened for ${task.name}`, {
        failures: breaker.failures,
        component: 'async-manager'
      });
    }
    
    this.circuitBreakers.set(task.name, breaker);
    this.errors.set(task.id, error);

    if (task.onError) {
      task.onError(error);
    }

    logger.error(`Task failed: ${task.name}`, error, {
      taskId: task.id,
      executionTime,
      retries: task.retries,
      component: 'async-manager'
    });

    this.emit('taskFailed', { task, error, executionTime });
  }

  // Utility methods
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateAverageExecutionTime(executionTime: number): void {
    const totalCompleted = this.metrics.completedTasks + this.metrics.failedTasks;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (totalCompleted - 1) + executionTime) / totalCompleted;
  }

  private checkCircuitBreakers(): void {
    for (const [taskName, breaker] of this.circuitBreakers.entries()) {
      if (breaker.isOpen) {
        const timeSinceLastFailure = Date.now() - breaker.lastFailure;
        if (timeSinceLastFailure > this.options.circuitBreakerTimeout) {
          breaker.isOpen = false;
          breaker.failures = 0;
          logger.info(`Circuit breaker auto-reset for ${taskName}`, {
            component: 'async-manager'
          });
        }
      }
    }
  }

  // Public API methods
  getMetrics() {
    return {
      ...this.metrics,
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([name, breaker]) => ({
        name,
        isOpen: breaker.isOpen,
        failures: breaker.failures
      }))
    };
  }

  getTaskResult<T>(taskId: string): T | undefined {
    return this.results.get(taskId);
  }

  getTaskError(taskId: string): Error | undefined {
    return this.errors.get(taskId);
  }

  clearCompleted(): void {
    // Clear results and errors for completed tasks
    const activeTasks = Array.from(this.activeTasks);
    for (const [taskId] of this.results) {
      if (!activeTasks.includes(taskId)) {
        this.results.delete(taskId);
        this.errors.delete(taskId);
      }
    }
  }
}

// Global instance
export const asyncManager = new EnhancedAsyncManager({
  maxConcurrency: 10,
  defaultTimeout: 30000,
  defaultRetries: 3,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});
