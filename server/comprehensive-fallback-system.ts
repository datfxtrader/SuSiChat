
import { logger } from './monitoring/logger';
import { asyncManager } from './enhanced-async-manager';

export interface FallbackStrategy<T> {
  name: string;
  priority: number;
  execute: () => Promise<T>;
  condition?: () => boolean;
  timeout?: number;
}

export interface FallbackOptions {
  maxRetries: number;
  retryDelay: number;
  cascadeOnFailure: boolean;
  logFailures: boolean;
}

export class ComprehensiveFallbackSystem<T> {
  private strategies: FallbackStrategy<T>[] = [];
  private lastSuccessful: string | null = null;
  private failureCount = new Map<string, number>();

  constructor(private options: FallbackOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    cascadeOnFailure: true,
    logFailures: true
  }) {}

  addStrategy(strategy: FallbackStrategy<T>): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => a.priority - b.priority);
    
    logger.debug(`Fallback strategy added: ${strategy.name}`, {
      priority: strategy.priority,
      component: 'fallback-system'
    });
  }

  async execute(): Promise<T> {
    const availableStrategies = this.strategies.filter(s => 
      !s.condition || s.condition()
    );

    if (availableStrategies.length === 0) {
      throw new Error('No fallback strategies available');
    }

    // Try last successful strategy first
    if (this.lastSuccessful) {
      const lastStrategy = availableStrategies.find(s => s.name === this.lastSuccessful);
      if (lastStrategy) {
        try {
          const result = await this.executeStrategy(lastStrategy);
          return result;
        } catch (error) {
          logger.warn(`Last successful strategy failed: ${this.lastSuccessful}`, {
            error: error.message,
            component: 'fallback-system'
          });
        }
      }
    }

    // Try strategies in priority order
    for (const strategy of availableStrategies) {
      if (strategy.name === this.lastSuccessful) continue; // Already tried

      try {
        const result = await this.executeStrategy(strategy);
        this.lastSuccessful = strategy.name;
        this.failureCount.delete(strategy.name);
        
        logger.info(`Fallback strategy succeeded: ${strategy.name}`, {
          component: 'fallback-system'
        });
        
        return result;

      } catch (error) {
        const failures = (this.failureCount.get(strategy.name) || 0) + 1;
        this.failureCount.set(strategy.name, failures);

        if (this.options.logFailures) {
          logger.warn(`Fallback strategy failed: ${strategy.name}`, {
            error: error.message,
            failures,
            component: 'fallback-system'
          });
        }

        if (!this.options.cascadeOnFailure) {
          throw error;
        }

        // Continue to next strategy
      }
    }

    throw new Error('All fallback strategies failed');
  }

  private async executeStrategy(strategy: FallbackStrategy<T>): Promise<T> {
    const timeout = strategy.timeout || 30000;
    
    return Promise.race([
      strategy.execute(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Strategy timeout: ${strategy.name}`)), timeout)
      )
    ]);
  }

  async executeWithRetries(): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.execute();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
          logger.warn(`Fallback system retry ${attempt}/${this.options.maxRetries} in ${delay}ms`, {
            error: error.message,
            component: 'fallback-system'
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All fallback attempts failed');
  }

  getMetrics() {
    return {
      strategiesCount: this.strategies.length,
      lastSuccessful: this.lastSuccessful,
      failureCounts: Object.fromEntries(this.failureCount),
      availableStrategies: this.strategies.map(s => ({
        name: s.name,
        priority: s.priority,
        available: !s.condition || s.condition()
      }))
    };
  }

  reset(): void {
    this.lastSuccessful = null;
    this.failureCount.clear();
    logger.info('Fallback system reset', { component: 'fallback-system' });
  }
}

// Research service fallback system
export const createResearchFallback = () => {
  const fallbackSystem = new ComprehensiveFallbackSystem<any>({
    maxRetries: 3,
    retryDelay: 2000,
    cascadeOnFailure: true,
    logFailures: true
  });

  // Primary: DeerFlow service
  fallbackSystem.addStrategy({
    name: 'deerflow-service',
    priority: 1,
    execute: async () => {
      const { deerflowClient } = await import('./deerflow-client');
      return deerflowClient.performResearch;
    },
    condition: () => {
      // Check if DeerFlow service is available
      return process.env.DEERFLOW_ENABLED !== 'false';
    }
  });

  // Secondary: Enhanced search
  fallbackSystem.addStrategy({
    name: 'enhanced-search',
    priority: 2,
    execute: async () => {
      const { enhancedDeerFlowService } = await import('./enhanced-deerflow-integration');
      return enhancedDeerFlowService.performEnhancedResearch;
    }
  });

  // Tertiary: Basic web search
  fallbackSystem.addStrategy({
    name: 'web-search',
    priority: 3,
    execute: async () => {
      const { performWebSearch } = await import('./performWebSearch');
      return performWebSearch;
    }
  });

  // Last resort: LLM only
  fallbackSystem.addStrategy({
    name: 'llm-only',
    priority: 4,
    execute: async () => {
      const { llmService } = await import('./llm');
      return (query: string) => llmService.generateResponse([
        { role: 'user', content: `Research and provide information about: ${query}` }
      ]);
    }
  });

  return fallbackSystem;
};

// Global fallback systems
export const researchFallback = createResearchFallback();
