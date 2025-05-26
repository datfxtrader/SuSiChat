
import { SearchEngineConfig } from '../../types/web-search.types';

export const SEARCH_ENGINE_CONFIGS: Record<string, SearchEngineConfig> = {
  tavily: {
    name: 'Tavily',
    priority: 1,
    timeout: 10000,
    maxRetries: 2,
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    }
  },
  brave: {
    name: 'Brave',
    priority: 2,
    timeout: 8000,
    maxRetries: 2,
    rateLimit: {
      requests: 50,
      window: 60000
    }
  }
};
