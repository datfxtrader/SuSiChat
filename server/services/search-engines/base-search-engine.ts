
import axios, { AxiosInstance } from 'axios';
import pRetry from 'p-retry';
import pTimeout from 'p-timeout';
import { RateLimiter } from '../rate-limiter.service';
import { SearchOptions, SearchResult, SearchEngineConfig } from '../../../types/web-search.types';
import { SEARCH_ENGINE_CONFIGS } from '../../config/search-engines.config';

export abstract class BaseSearchEngine {
  protected client: AxiosInstance;
  protected rateLimiter: RateLimiter;
  
  constructor(
    protected name: string,
    protected apiKey: string,
    protected config: SearchEngineConfig
  ) {
    this.client = axios.create({
      timeout: config.timeout,
      validateStatus: (status) => status < 500
    });
    
    this.rateLimiter = new RateLimiter(
      config.rateLimit.requests,
      config.rateLimit.window
    );
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    if (!this.isAvailable()) return [];

    try {
      await this.rateLimiter.checkLimit();
      
      const results = await pTimeout(
        pRetry(
          () => this.performSearch(query, options),
          {
            retries: this.config.maxRetries,
            onFailedAttempt: (error) => {
              console.log(`[${this.name}] Retry ${error.attemptNumber} failed:`, error.message);
            }
          }
        ),
        this.config.timeout,
        `${this.name} search timed out`
      );

      return results.map(r => ({ ...r, source: this.name }));
    } catch (error) {
      console.error(`[${this.name}] Search failed:`, error);
      return [];
    }
  }

  abstract performSearch(query: string, options: SearchOptions): Promise<SearchResult[]>;
  
  isAvailable(): boolean {
    return !!this.apiKey;
  }
  
  getPriority(): number {
    return this.config.priority;
  }

  getName(): string {
    return this.name;
  }

  getRateLimitStatus() {
    return this.rateLimiter.getUsage();
  }
}
