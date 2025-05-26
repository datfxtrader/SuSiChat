
// services/intelligent-search-manager.ts
import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';
import { SearchEngine } from './search-engines/base';
import { NewsDataEngine } from './search-engines/newsdata';
import { TavilyEngine } from './search-engines/tavily';
import { BraveEngine } from './search-engines/brave';
import { 
  EnhancedSearchResponse, 
  SearchResult, 
  SearchFilters 
} from '../../types/search.types';

export class IntelligentSearchManager {
  private engines: Map<string, SearchEngine> = new Map();
  private searchCache: LRUCache<string, EnhancedSearchResponse>;
  private concurrencyLimit = pLimit(3);

  constructor() {
    this.searchCache = new LRUCache<string, EnhancedSearchResponse>({
      max: 100,
      ttl: 1000 * 60 * 15 // 15 minutes
    });

    this.initializeEngines();
  }

  private initializeEngines() {
    const engines = [
      new NewsDataEngine(process.env.NEWSDATA_API_KEY || ''),
      new TavilyEngine(process.env.TAVILY_API_KEY || ''),
      new BraveEngine(process.env.BRAVE_API_KEY || '')
    ];

    engines.forEach(engine => {
      if (engine.isAvailable()) {
        this.engines.set(engine.getName(), engine);
      }
    });
  }

  async performIntelligentSearch(
    query: string,
    maxResults = 10,
    searchType: 'web' | 'news' | 'all' = 'all',
    freshness = 'week',
    filters?: SearchFilters
  ): Promise<EnhancedSearchResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, maxResults, searchType, freshness, filters);

    // Check cache
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true, processingTime: Date.now() - startTime };
    }

    // Select appropriate engines
    const selectedEngines = this.selectEngines(searchType, filters?.sources);
    
    // Calculate results per engine
    const resultsPerEngine = Math.ceil(maxResults / selectedEngines.length);
    
    // Execute searches in parallel with concurrency limit
    const searchPromises = selectedEngines.map(engine =>
      this.concurrencyLimit(() =>
        engine.search(query, { maxResults: resultsPerEngine, freshness, filters })
      )
    );

    const searchResults = await Promise.allSettled(searchPromises);
    
    // Collect all results
    const allResults: SearchResult[] = [];
    const usedEngines: string[] = [];

    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allResults.push(...result.value);
        usedEngines.push(selectedEngines[index].getName());
      }
    });

    // Process and rank results
    const processedResults = this.processResults(allResults, maxResults);

    const response: EnhancedSearchResponse = {
      results: processedResults,
      totalResults: processedResults.length,
      searchEnginesUsed: usedEngines,
      query,
      searchType,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    // Cache the results
    this.searchCache.set(cacheKey, response);

    return response;
  }

  private selectEngines(searchType: string, preferredSources?: string[]): SearchEngine[] {
    const availableEngines = Array.from(this.engines.values());
    
    let filteredEngines = availableEngines;
    
    // Filter by search type
    if (searchType === 'news') {
      filteredEngines = filteredEngines.filter(e => e.getName() === 'NewsData');
    } else if (searchType === 'web') {
      filteredEngines = filteredEngines.filter(e => e.getName() !== 'NewsData');
    }
    
    // Filter by preferred sources
    if (preferredSources && preferredSources.length > 0) {
      filteredEngines = filteredEngines.filter(e => 
        preferredSources.includes(e.getName().toLowerCase())
      );
    }
    
    // Sort by priority
    return filteredEngines.sort((a, b) => b.getPriority() - a.getPriority());
  }

  private processResults(results: SearchResult[], maxResults: number): SearchResult[] {
    // Remove duplicates
    const uniqueResults = this.removeDuplicates(results);
    
    // Calculate composite scores
    const scoredResults = this.calculateCompositeScores(uniqueResults);
    
    // Sort by composite score
    scoredResults.sort((a, b) => b.score - a.score);
    
    // Return top results
    return scoredResults.slice(0, maxResults);
  }

  private removeDuplicates(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();
    
    results.forEach(result => {
      const key = this.normalizeUrl(result.url);
      if (!seen.has(key) || (seen.get(key)!.score < result.score)) {
        seen.set(key, result);
      }
    });
    
    return Array.from(seen.values());
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase();
    }
  }

  private calculateCompositeScores(results: SearchResult[]): SearchResult[] {
    const engineWeights: Record<string, number> = {
      'NewsData': 1.2,
      'Tavily': 1.1,
      'Brave': 1.0
    };
    
    return results.map(result => ({
      ...result,
      score: result.score * (engineWeights[result.source] || 1.0) * 
             (result.relevanceScore || 1.0) *
             this.getFreshnessBoost(result.publishedDate)
    }));
  }

  private getFreshnessBoost(publishedDate?: string): number {
    if (!publishedDate) return 1.0;
    
    const age = Date.now() - new Date(publishedDate).getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (age < dayInMs) return 1.3;
    if (age < 7 * dayInMs) return 1.2;
    if (age < 30 * dayInMs) return 1.1;
    return 1.0;
  }

  private generateCacheKey(
    query: string,
    maxResults: number,
    searchType: string,
    freshness: string,
    filters?: SearchFilters
  ): string {
    return `${query}:${maxResults}:${searchType}:${freshness}:${JSON.stringify(filters || {})}`;
  }

  getStatus() {
    const engines = Array.from(this.engines.values());
    return {
      availableEngines: engines.map(e => ({
        name: e.getName(),
        priority: e.getPriority(),
        available: e.isAvailable()
      })),
      cacheStats: {
        size: this.searchCache.size,
        maxSize: this.searchCache.max
      },
      timestamp: new Date().toISOString()
    };
  }
}
