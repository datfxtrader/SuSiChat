
import { asyncManager, AsyncTask } from './enhanced-async-manager';
import { jobQueue } from './queue/job-processor';
import { researchFallback } from './comprehensive-fallback-system';
import { logger } from './monitoring/logger';

export interface ResearchRequest {
  query: string;
  depth: number;
  options?: {
    useParallel?: boolean;
    timeout?: number;
    priority?: number;
    enableFallback?: boolean;
  };
}

export interface ResearchResponse {
  status: string;
  report: string;
  sources: any[];
  metadata: {
    executionTime: number;
    method: string;
    fallbackUsed: boolean;
    parallel: boolean;
  };
}

export class EnhancedIntegrationLayer {
  
  async performResearch(request: ResearchRequest): Promise<ResearchResponse> {
    const startTime = Date.now();
    const { query, depth, options = {} } = request;
    
    logger.info('Research request started', {
      query: query.substring(0, 100),
      depth,
      requestId: `req_${Date.now()}`,
      component: 'integration-layer'
    });

    try {
      // Use parallel processing if enabled
      if (options.useParallel) {
        return await this.performParallelResearch(request, startTime);
      }

      // Create async task
      const task: AsyncTask<ResearchResponse> = {
        id: `research_${Date.now()}`,
        name: 'research',
        priority: options.priority || 1,
        timeout: options.timeout || 120000, // 2 minutes
        retries: 0,
        maxRetries: 2,
        execute: async () => {
          if (options.enableFallback !== false) {
            return await researchFallback.executeWithRetries();
          } else {
            // Direct execution
            const { deerflowClient } = await import('./deerflow-client');
            return await deerflowClient.performResearch(query, depth);
          }
        },
        fallback: async () => {
          // Basic fallback
          const { llmService } = await import('./llm');
          const response = await llmService.generateResponse([
            { role: 'user', content: `Research and provide information about: ${query}` }
          ]);
          
          return {
            status: 'completed_fallback',
            report: response.message,
            sources: [],
            metadata: {
              executionTime: Date.now() - startTime,
              method: 'llm_fallback',
              fallbackUsed: true,
              parallel: false
            }
          };
        }
      };

      // Execute through async manager
      const result = await asyncManager.executeTask(task);
      
      logger.performance('Research completed', Date.now() - startTime, {
        method: 'async_manager',
        component: 'integration-layer'
      });

      return result;

    } catch (error) {
      logger.error('Research failed', error, {
        query: query.substring(0, 100),
        depth,
        component: 'integration-layer'
      });

      // Final fallback
      return {
        status: 'error',
        report: `Research failed: ${error.message}. Please try again or contact support.`,
        sources: [],
        metadata: {
          executionTime: Date.now() - startTime,
          method: 'error_fallback',
          fallbackUsed: true,
          parallel: false
        }
      };
    }
  }

  private async performParallelResearch(request: ResearchRequest, startTime: number): Promise<ResearchResponse> {
    const { query, depth } = request;
    
    // Create multiple parallel research tasks
    const tasks: AsyncTask<any>[] = [
      {
        id: `research_primary_${Date.now()}`,
        name: 'research_primary',
        priority: 1,
        timeout: 60000,
        retries: 0,
        maxRetries: 1,
        execute: async () => {
          const { deerflowClient } = await import('./deerflow-client');
          return await deerflowClient.performResearch(query, depth);
        }
      },
      {
        id: `research_enhanced_${Date.now()}`,
        name: 'research_enhanced',
        priority: 2,
        timeout: 90000,
        retries: 0,
        maxRetries: 1,
        execute: async () => {
          const { enhancedDeerFlowService } = await import('./enhanced-deerflow-integration');
          return await enhancedDeerFlowService.performEnhancedResearch({
            query,
            depth: depth === 1 ? 'basic' : depth === 2 ? 'comprehensive' : 'expert'
          });
        }
      },
      {
        id: `research_web_${Date.now()}`,
        name: 'research_web',
        priority: 3,
        timeout: 30000,
        retries: 0,
        maxRetries: 1,
        execute: async () => {
          const { performWebSearch } = await import('./performWebSearch');
          const results = await performWebSearch(query);
          return {
            status: 'completed',
            report: `Web search results for: ${query}`,
            sources: results.results || [],
            metadata: { method: 'web_search' }
          };
        }
      }
    ];

    try {
      // Execute all tasks in parallel
      const results = await asyncManager.executeBatch(tasks);
      
      // Find the first successful result
      const successfulResult = results.find(result => !(result instanceof Error));
      
      if (successfulResult) {
        logger.performance('Parallel research completed', Date.now() - startTime, {
          method: 'parallel_async',
          component: 'integration-layer'
        });

        return {
          ...successfulResult,
          metadata: {
            ...successfulResult.metadata,
            executionTime: Date.now() - startTime,
            parallel: true,
            fallbackUsed: false
          }
        };
      }

      // All failed, use fallback
      throw new Error('All parallel research methods failed');

    } catch (error) {
      logger.warn('Parallel research failed, using fallback', {
        error: error.message,
        component: 'integration-layer'
      });

      // Use fallback system
      const fallbackResult = await researchFallback.executeWithRetries();
      return {
        ...fallbackResult,
        metadata: {
          executionTime: Date.now() - startTime,
          method: 'parallel_fallback',
          fallbackUsed: true,
          parallel: true
        }
      };
    }
  }

  async queueResearch(request: ResearchRequest): Promise<string> {
    // Queue research for background processing
    return await jobQueue.add('research', {
      research_question: request.query,
      research_depth: request.depth,
      options: request.options
    }, {
      priority: request.options?.priority || 0,
      maxAttempts: 3
    });
  }

  getSystemMetrics() {
    return {
      asyncManager: asyncManager.getMetrics(),
      jobQueue: jobQueue.getStats(),
      researchFallback: researchFallback.getMetrics(),
      performanceMetrics: logger.getPerformanceMetrics()
    };
  }
}

export const enhancedIntegration = new EnhancedIntegrationLayer();
