
import { deerflowClient, DeerFlowResearchParams, DeerFlowResearchResponse } from './deerflow-client';
import { llmService } from './llm';
import { researchCache } from './optimized-research-cache';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Research depth levels
 */
export enum ResearchDepth {
  Basic = 1,      // Simple web search
  Enhanced = 2,   // More comprehensive web search with better processing
  Deep = 3        // Full DeerFlow research capabilities
}

/**
 * Research source interface
 */
export interface ResearchSource {
  title: string;
  url: string;
  domain: string;
  content?: string;
  relevanceScore?: number;
}

/**
 * Research result interface
 */
export interface ResearchResult {
  report: string;
  sources: ResearchSource[];
  depth: ResearchDepth;
  processingTime: number;
  fromCache?: boolean;
  progress?: {
    step: string;
    percent: number;
    statusMessage?: string;
  };
}

/**
 * Research parameters interface
 */
export interface ResearchParams {
  query: string;
  depth?: ResearchDepth;
  modelId?: string;
  includeMarketData?: boolean;
  includeNews?: boolean;
  researchLength?: string;
  researchTone?: string;
  minWordCount?: number;
  researchDepth?: number;
  cacheEnabled?: boolean;
  priority?: 'high' | 'normal' | 'low';
  userId?: string;
  conversationId?: string;
}

/**
 * Configuration for the optimized research service
 */
interface ResearchServiceConfig {
  cacheSize?: number;
  cacheTTL?: number;
  maxConcurrentRequests?: number;
  requestTimeout?: number;
  circuitBreakerThreshold?: number;
  axiosPoolSize?: number;
}

/**
 * Simple queue implementation
 */
class SimpleQueue {
  private queue: Array<{ task: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void; priority: number }> = [];
  private running = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
  }

  async add<T>(task: () => Promise<T>, options: { priority?: number } = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject,
        priority: options.priority || 2
      });
      
      // Sort by priority (lower number = higher priority)
      this.queue.sort((a, b) => a.priority - b.priority);
      
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const item = this.queue.shift();
    
    if (!item) {
      this.running--;
      return;
    }

    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  get size() {
    return this.queue.length;
  }

  get pending() {
    return this.running;
  }

  clear() {
    this.queue.length = 0;
  }
}

/**
 * Simple LRU Cache implementation
 */
class SimpleLRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 30 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Simple circuit breaker implementation
 */
class SimpleCircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private threshold: number;
  private timeout: number;

  constructor(threshold: number = 5, timeout: number = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

/**
 * Optimized Research Service with caching, connection pooling, and circuit breaking
 */
export class OptimizedResearchService extends EventEmitter {
  // Request management
  private activeRequests = new Map<string, AbortController>();
  private requestQueue: SimpleQueue;
  
  // Caching
  private resultsCache: SimpleLRUCache<ResearchResult>;
  private searchCache: SimpleLRUCache<any>;
  
  // Connection pooling
  private axiosInstance: AxiosInstance;
  
  // Circuit breakers
  private deerflowCircuitBreaker: SimpleCircuitBreaker;
  private webSearchCircuitBreaker: SimpleCircuitBreaker;
  
  // Deduplication
  private pendingRequests = new Map<string, Promise<ResearchResult>>();
  
  // Performance tracking
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    circuitBreakerOpens: 0
  };

  constructor(config: ResearchServiceConfig = {}) {
    super();
    
    // Initialize request queue with concurrency control
    this.requestQueue = new SimpleQueue(config.maxConcurrentRequests || 10);
    
    // Initialize caches
    this.resultsCache = new SimpleLRUCache<ResearchResult>(
      config.cacheSize || 1000,
      config.cacheTTL || 1000 * 60 * 30
    );
    
    this.searchCache = new SimpleLRUCache<any>(5000, 1000 * 60 * 15);
    
    // Initialize axios with connection pooling
    this.axiosInstance = axios.create({
      timeout: config.requestTimeout || 30000,
      maxRedirects: 5
    });
    
    // Initialize circuit breakers
    this.deerflowCircuitBreaker = new SimpleCircuitBreaker(5, 30000);
    this.webSearchCircuitBreaker = new SimpleCircuitBreaker(5, 30000);
    
    // Cleanup interval for expired requests
    setInterval(() => this.cleanupExpiredRequests(), 60000);
  }

  /**
   * Generate cache key for research params
   */
  private generateCacheKey(params: ResearchParams): string {
    const keyData = {
      query: params.query,
      depth: params.depth || ResearchDepth.Basic,
      modelId: params.modelId,
      includeMarketData: params.includeMarketData,
      includeNews: params.includeNews,
      researchLength: params.researchLength,
      researchTone: params.researchTone
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Cancel a research request
   */
  public cancelResearch(researchId: string): boolean {
    const controller = this.activeRequests.get(researchId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(researchId);
      return true;
    }
    return false;
  }

  /**
   * Perform research with optimization
   */
  async performResearch(params: ResearchParams): Promise<ResearchResult> {
    const startTime = Date.now();
    const depth = params.depth || ResearchDepth.Basic;
    const researchId = crypto.randomUUID();
    
    this.metrics.totalRequests++;
    
    // Check cache first
    if (params.cacheEnabled !== false) {
      const cacheKey = this.generateCacheKey(params);
      const cachedResult = this.resultsCache.get(cacheKey);
      
      if (cachedResult) {
        this.metrics.cacheHits++;
        this.emit('cacheHit', { query: params.query, depth });
        
        return {
          ...cachedResult,
          fromCache: true,
          processingTime: Date.now() - startTime
        };
      }
      
      this.metrics.cacheMisses++;
      
      // Check if there's already a pending request for the same query
      if (this.pendingRequests.has(cacheKey)) {
        console.log('Deduplicating request for:', params.query);
        return this.pendingRequests.get(cacheKey)!;
      }
    }
    
    // Create abort controller
    const abortController = new AbortController();
    this.activeRequests.set(researchId, abortController);
    
    // Create promise for deduplication
    const researchPromise = this.executeResearch(
      params,
      depth,
      startTime,
      researchId,
      abortController
    );
    
    // Store pending request for deduplication
    if (params.cacheEnabled !== false) {
      const cacheKey = this.generateCacheKey(params);
      this.pendingRequests.set(cacheKey, researchPromise);
      
      // Clean up pending request when done
      researchPromise.finally(() => {
        this.pendingRequests.delete(cacheKey);
      });
    }
    
    return researchPromise;
  }

  /**
   * Execute research with proper error handling and fallbacks
   */
  private async executeResearch(
    params: ResearchParams,
    depth: ResearchDepth,
    startTime: number,
    researchId: string,
    abortController: AbortController
  ): Promise<ResearchResult> {
    try {
      // Add to queue based on priority
      const priority = params.priority === 'high' ? 1 : params.priority === 'low' ? 3 : 2;
      
      const result = await this.requestQueue.add(
        async () => {
          // Check if cancelled
          if (abortController.signal.aborted) {
            throw new Error('Research cancelled');
          }
          
          // Route to appropriate research method
          switch (depth) {
            case ResearchDepth.Deep:
              return await this.performDeepResearchOptimized(params, abortController);
            case ResearchDepth.Enhanced:
              return await this.performEnhancedResearchOptimized(params, abortController);
            default:
              return await this.performBasicResearchOptimized(params, abortController);
          }
        },
        { priority }
      );
      
      // Cache successful result with optimized storage
      if (params.cacheEnabled !== false && result) {
        const cacheKey = this.generateCacheKey(params);
        this.resultsCache.set(cacheKey, result);
        
        // Also store in optimized research cache if we have user context
        if (params.userId && params.conversationId) {
          await researchCache.storeResult(params.userId, params.conversationId, {
            content: result.report,
            sources: result.sources,
            metadata: {
              depth: result.depth,
              processingTime: result.processingTime
            }
          });
        }
      }
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      
      // Clean up
      this.activeRequests.delete(researchId);
      
      return result;
      
    } catch (error) {
      console.error(`Research error at depth ${depth}:`, error);
      
      // Clean up
      this.activeRequests.delete(researchId);
      
      // Implement graceful degradation
      if (depth === ResearchDepth.Deep) {
        console.log('Falling back to Enhanced research');
        return this.performResearch({ ...params, depth: ResearchDepth.Enhanced });
      } else if (depth === ResearchDepth.Enhanced) {
        console.log('Falling back to Basic research');
        return this.performResearch({ ...params, depth: ResearchDepth.Basic });
      }
      
      // Return error result
      return {
        report: `Error performing research: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sources: [],
        depth: depth,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Optimized basic research
   */
  private async performBasicResearchOptimized(
    params: ResearchParams,
    abortController: AbortController
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Use circuit breaker for web search
      const searchResults = await this.webSearchCircuitBreaker.execute(async () => {
        const { performWebSearch } = await import('./performWebSearch');
        return performWebSearch(params.query);
      });
      
      if (!searchResults || searchResults.error) {
        throw new Error(searchResults?.error || 'Search failed');
      }
      
      // Process results
      const sources = await this.processSourcesOptimized(
        searchResults.results || [],
        params.query
      );
      
      // Generate report if we have sources
      const report = await this.generateReportOptimized(
        params.query,
        sources,
        ResearchDepth.Basic,
        abortController.signal
      );
      
      return {
        report,
        sources,
        depth: ResearchDepth.Basic,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Basic research error:', error);
      throw error;
    }
  }

  /**
   * Optimized enhanced research with parallel searches
   */
  private async performEnhancedResearchOptimized(
    params: ResearchParams,
    abortController: AbortController
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Create query variations
      const queries = this.generateQueryVariations(params.query);
      
      // Perform parallel searches with rate limiting
      const searchPromises = queries.map(query => 
        this.requestQueue.add(() => 
          this.cachedWebSearch(query, abortController.signal),
          { priority: 2 }
        )
      );
      
      // Wait for all searches with timeout
      const searchResults = await Promise.race([
        Promise.all(searchPromises),
        new Promise<any[]>((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), 20000)
        )
      ]);
      
      // Combine and deduplicate results efficiently
      const allResults = this.combineSearchResults(searchResults);
      
      // Process sources with relevance scoring
      const sources = await this.processSourcesWithRelevance(
        allResults,
        params.query
      );
      
      // Generate comprehensive report
      const report = await this.generateEnhancedReport(
        params.query,
        sources,
        abortController.signal
      );
      
      return {
        report,
        sources,
        depth: ResearchDepth.Enhanced,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Enhanced research error:', error);
      throw error;
    }
  }

  /**
   * Optimized deep research with DeerFlow
   */
  private async performDeepResearchOptimized(
    params: ResearchParams,
    abortController: AbortController
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Check if financial query for specialized handling
      if (this.isFinancialQuery(params.query)) {
        return this.performFinancialResearchOptimized(params, abortController);
      }
      
      // Use circuit breaker for DeerFlow
      const deerflowResponse = await this.deerflowCircuitBreaker.execute(async () => {
        const deerflowParams = this.buildDeerflowParams(params);
        return deerflowClient.performResearch(deerflowParams, abortController.signal);
      });
      
      // Process DeerFlow response
      const result = await this.processDeerflowResponse(
        deerflowResponse,
        params,
        startTime
      );
      
      return result;
      
    } catch (error) {
      console.error('Deep research error:', error);
      // Fall back to enhanced research
      return this.performEnhancedResearchOptimized(params, abortController);
    }
  }

  /**
   * Cached web search
   */
  private async cachedWebSearch(
    query: string,
    signal: AbortSignal
  ): Promise<any> {
    const cacheKey = `search:${query}`;
    const cached = this.searchCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const result = await this.webSearchCircuitBreaker.execute(async () => {
      const { webSearchService } = await import('./performWebSearch');
      return webSearchService.performWebSearch(query, 10);
    });
    
    if (result && !result.error) {
      this.searchCache.set(cacheKey, result);
    }
    
    return result;
  }

  /**
   * Generate query variations for better coverage
   */
  private generateQueryVariations(query: string): string[] {
    const variations = [
      query,
      `latest ${query}`,
      `${query} analysis`,
      `${query} research`,
      `${query} data statistics`
    ];
    
    // Add year for temporal queries
    const currentYear = new Date().getFullYear();
    if (!query.includes(currentYear.toString())) {
      variations.push(`${query} ${currentYear}`);
    }
    
    return [...new Set(variations)].slice(0, 5);
  }

  /**
   * Combine search results efficiently
   */
  private combineSearchResults(searchResultsArray: any[]): any[] {
    const urlMap = new Map<string, any>();
    
    for (const searchResult of searchResultsArray) {
      if (!searchResult?.results) continue;
      
      for (const result of searchResult.results) {
        if (!result?.url) continue;
        
        // Use URL as key for deduplication
        if (!urlMap.has(result.url)) {
          urlMap.set(result.url, result);
        } else {
          // Merge content if we have more info
          const existing = urlMap.get(result.url);
          if (result.content && (!existing.content || result.content.length > existing.content.length)) {
            existing.content = result.content;
          }
        }
      }
    }
    
    return Array.from(urlMap.values());
  }

  /**
   * Process sources with relevance scoring
   */
  private async processSourcesWithRelevance(
    results: any[],
    query: string
  ): Promise<ResearchSource[]> {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    
    return results
      .map(result => {
        if (!result?.url) return null;
        
        try {
          const url = new URL(result.url);
          const title = result.title || url.hostname;
          const content = result.content || result.snippet || '';
          
          // Calculate relevance score
          const titleWords = new Set(title.toLowerCase().split(/\s+/));
          const contentWords = new Set(content.toLowerCase().split(/\s+/));
          
          const titleOverlap = [...queryWords].filter(w => titleWords.has(w)).length;
          const contentOverlap = [...queryWords].filter(w => contentWords.has(w)).length;
          
          const relevanceScore = (titleOverlap * 2 + contentOverlap) / (queryWords.size * 3);
          
          return {
            title,
            url: result.url,
            domain: url.hostname,
            content,
            relevanceScore
          };
        } catch (e) {
          return null;
        }
      })
      .filter((source): source is ResearchSource => source !== null)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 10); // Keep top 10 most relevant
  }

  /**
   * Generate report using LLM with optimization
   */
  private async generateReportOptimized(
    query: string,
    sources: ResearchSource[],
    depth: ResearchDepth,
    signal: AbortSignal
  ): Promise<string> {
    if (sources.length === 0) {
      return this.generateNoResultsReport(query);
    }
    
    // Prepare source content efficiently
    const sourceContent = sources
      .slice(0, depth === ResearchDepth.Basic ? 3 : 5)
      .map((source, idx) => 
        `[${idx + 1}] ${source.title} (${source.domain})\n${source.content?.slice(0, 500) || ''}`
      )
      .join('\n\n---\n\n');
    
    try {
      if (signal.aborted) throw new Error('Cancelled');
      
      const response = await llmService.generateResearchReport(
        [
          {
            role: 'system',
            content: this.getSystemPromptForDepth(depth)
          },
          {
            role: 'user',
            content: this.getUserPromptForDepth(query, sourceContent, depth)
          }
        ],
        0.7,
        depth === ResearchDepth.Basic ? 1500 : depth === ResearchDepth.Enhanced ? 2500 : 4000
      );
      
      const report = response.message || '';
      
      // Add sources section
      return this.formatReportWithSources(report, sources);
    } catch (error) {
      console.error('Report generation error:', error);
      return this.generateFallbackReport(query, sources);
    }
  }

  /**
   * Helper methods
   */
  
  private isFinancialQuery(query: string): boolean {
    const financialPatterns = [
      /\b(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)\/\w{3}\b/i,
      /\b(forex|currency|exchange rate|stock|trading|investment|market)\b/i
    ];
    
    return financialPatterns.some(pattern => pattern.test(query));
  }
  
  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
  }
  
  private cleanupExpiredRequests(): void {
    // Clear the map if it gets too large
    if (this.activeRequests.size > 100) {
      for (const [id, controller] of this.activeRequests) {
        controller.abort();
        this.activeRequests.delete(id);
      }
    }
  }
  
  private getSystemPromptForDepth(depth: ResearchDepth): string {
    switch (depth) {
      case ResearchDepth.Deep:
        return 'You are an expert analyst providing comprehensive, data-driven research reports with advanced insights.';
      case ResearchDepth.Enhanced:
        return 'You are a research analyst providing detailed, well-structured reports with thorough analysis.';
      default:
        return 'You are a research assistant providing clear, concise summaries of findings.';
    }
  }
  
  private getUserPromptForDepth(
    query: string,
    sourceContent: string,
    depth: ResearchDepth
  ): string {
    const basePrompt = `Create a research report about "${query}" using the following sources.`;
    
    const depthInstructions = {
      [ResearchDepth.Basic]: 'Provide a concise summary with key findings.',
      [ResearchDepth.Enhanced]: 'Provide detailed analysis with comprehensive insights.',
      [ResearchDepth.Deep]: 'Provide expert-level analysis with advanced insights and implications.'
    };
    
    return `${basePrompt}\n\n${depthInstructions[depth]}\n\nSOURCES:\n${sourceContent}`;
  }
  
  private formatReportWithSources(report: string, sources: ResearchSource[]): string {
    const sourcesSection = '\n\n## Sources\n' + 
      sources.map((source, idx) => 
        `[${idx + 1}] **${source.title}**\n${source.url}`
      ).join('\n\n');
    
    return report + sourcesSection;
  }
  
  private generateNoResultsReport(query: string): string {
    return `# Research Report: ${query}

## Executive Summary

No relevant information was found for "${query}". This may be due to:
- The topic being very new or specialized
- Search terms needing refinement
- Limited availability of public information

## Recommendations

1. Try rephrasing the query with different keywords
2. Search for related or broader topics
3. Check if there are alternative terms for the concept`;
  }

  private generateFallbackReport(query: string, sources: ResearchSource[]): string {
    const sourcesList = sources.map((source, idx) => 
      `${idx + 1}. **${source.title}** (${source.domain})\n   ${source.url}`
    ).join('\n\n');

    return `# Research Report: ${query}

## Summary

Research completed but report generation encountered issues. Here are the sources found:

## Sources

${sourcesList}`;
  }
  
  /**
   * Get service metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.resultsCache.size,
      searchCacheSize: this.searchCache.size,
      activeRequests: this.activeRequests.size,
      queueSize: this.requestQueue.size,
      queuePending: this.requestQueue.pending
    };
  }
  
  /**
   * Clear caches
   */
  public clearCaches() {
    this.resultsCache.clear();
    this.searchCache.clear();
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }
  
  /**
   * Shutdown service gracefully
   */
  public async shutdown() {
    // Cancel all active requests
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
    
    // Clear queue
    this.requestQueue.clear();
    
    // Clear caches
    this.clearCaches();
    
    this.emit('shutdown');
  }
  
  private buildDeerflowParams(params: ResearchParams): DeerFlowResearchParams {
    return {
      research_question: params.query,
      model_id: params.modelId || 'deepseek-v3',
      include_market_data: params.includeMarketData !== false,
      include_news: params.includeNews !== false,
      research_length: params.researchLength || 'comprehensive',
      research_tone: params.researchTone || 'analytical',
      min_word_count: params.minWordCount || 1500,
      use_advanced_agents: true,
      enable_domain_expertise: true,
      enable_reasoning_chains: true,
      enable_adaptive_planning: true,
      enable_working_memory: true,
      enable_multi_agent_orchestration: true,
      complexity: params.researchDepth === 3 ? 'high' : params.researchDepth === 2 ? 'medium' : 'low'
    };
  }
  
  private async processDeerflowResponse(
    response: any,
    params: ResearchParams,
    startTime: number
  ): Promise<ResearchResult> {
    // Extract report and sources from various response formats
    let report = response.report || response.response?.report || '';
    let sources = this.extractDeerflowSources(response);
    
    // Handle async responses
    if (response.status?.status === 'processing' && response.status?.id) {
      const completed = await this.waitForCompletion(response.status.id, 30000);
      if (completed) {
        report = completed.report || report;
        sources = this.extractDeerflowSources(completed) || sources;
      }
    }
    
    return {
      report,
      sources,
      depth: ResearchDepth.Deep,
      processingTime: Date.now() - startTime
    };
  }
  
  private extractDeerflowSources(response: any): ResearchSource[] {
    const sourceData = response.sources || response.response?.sources || [];
    
    return sourceData
      .filter((s: any) => s && s.url)
      .map((source: any, idx: number) => ({
        title: source.title || `Source ${idx + 1}`,
        url: source.url,
        domain: source.domain || this.extractDomain(source.url),
        content: source.content || ''
      }));
  }
  
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }
  
  private async waitForCompletion(
    researchId: string,
    timeout: number
  ): Promise<any> {
    const endTime = Date.now() + timeout;
    
    while (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const status = await deerflowClient.checkResearchStatus(researchId);
        
        if (status.status?.status === 'completed') {
          return status;
        } else if (status.status?.status === 'error') {
          throw new Error(status.status.message);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }
    
    return null;
  }
  
  // Optimized financial research
  private async performFinancialResearchOptimized(
    params: ResearchParams,
    abortController: AbortController
  ): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Try specialized forex API first
      const currencyPair = this.extractCurrencyPair(params.query);
      
      if (currencyPair) {
        const forexResult = await this.requestQueue.add(
          () => this.fetchForexData(currencyPair, abortController.signal),
          { priority: 1 }
        );
        
        if (forexResult) {
          return forexResult;
        }
      }
      
      // Fall back to financial research module
      try {
        const financialResearch = await import('./financial-research');
        const result = await financialResearch.generateFinancialAnalysis(params.query);
        
        return {
          report: result.report,
          sources: result.sources.map((s: any) => ({
            title: s.title,
            url: s.url,
            domain: s.domain
          })),
          depth: ResearchDepth.Deep,
          processingTime: Date.now() - startTime
        };
      } catch (importError) {
        console.log('Financial research module not available, falling back to enhanced research');
        return this.performEnhancedResearchOptimized(params, abortController);
      }
      
    } catch (error) {
      console.error('Financial research error:', error);
      return this.performEnhancedResearchOptimized(params, abortController);
    }
  }
  
  private extractCurrencyPair(query: string): string | null {
    const match = query.match(/(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)\/(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)/i);
    return match ? match[0].toUpperCase() : null;
  }
  
  private async fetchForexData(
    currencyPair: string,
    signal: AbortSignal
  ): Promise<ResearchResult | null> {
    try {
      const response = await this.axiosInstance.post(
        'http://localhost:5000/api/forex/analyze',
        { currencyPair, timeframe: 'daily' },
        { signal }
      );
      
      if (response.status === 200 && response.data) {
        return {
          report: response.data.analysis,
          sources: response.data.sources || [],
          depth: ResearchDepth.Deep,
          processingTime: response.data.processingTime || 0
        };
      }
    } catch (error) {
      console.error('Forex API error:', error);
    }
    
    return null;
  }
  
  private async generateEnhancedReport(
    query: string,
    sources: ResearchSource[],
    signal: AbortSignal
  ): Promise<string> {
    const isFinancial = this.isFinancialQuery(query);
    
    const systemPrompt = isFinancial
      ? 'You are an expert financial analyst providing detailed market analysis with specific data.'
      : 'You are an expert research analyst providing comprehensive, well-structured reports.';
    
    const sourceContent = sources
      .slice(0, 7)
      .map((source, idx) => 
        `Source ${idx + 1} (${source.title} - ${source.domain}):\n${source.content}`
      )
      .join('\n\n---\n\n');
    
    const userPrompt = this.buildEnhancedPrompt(query, sourceContent, isFinancial);
    
    return this.generateReportOptimized(query, sources, ResearchDepth.Enhanced, signal);
  }
  
  private buildEnhancedPrompt(
    query: string,
    sourceContent: string,
    isFinancial: boolean
  ): string {
    if (isFinancial) {
      return `Create a comprehensive financial analysis report about "${query}".
Include: Executive Summary, Market Status, Technical Analysis, Fundamental Analysis, 
Expert Forecasts, Risk Assessment, and Trading Recommendations.
Use specific data and cite sources.

SOURCES:
${sourceContent}`;
    }
    
    return `Create a comprehensive research report about "${query}".
Include: Executive Summary, Current Situation, Key Trends, Detailed Analysis,
Expert Perspectives, and Future Outlook.
Cite sources and include specific data.

SOURCES:
${sourceContent}`;
  }
  
  private async processSourcesOptimized(
    results: any[],
    query: string
  ): Promise<ResearchSource[]> {
    // Batch process sources
    const processPromises = results.map(async (result) => {
      if (!result?.url) return null;
      
      try {
        const url = new URL(result.url);
        return {
          title: result.title || url.hostname,
          url: result.url,
          domain: url.hostname,
          content: result.content || result.snippet || ''
        };
      } catch {
        return null;
      }
    });
    
    const sources = await Promise.all(processPromises);
    
    return sources.filter((s): s is ResearchSource => s !== null);
  }
}

// Export singleton instance with configuration
export const researchService = new OptimizedResearchService({
  cacheSize: 1000,
  cacheTTL: 1000 * 60 * 30, // 30 minutes
  maxConcurrentRequests: 20,
  requestTimeout: 30000,
  circuitBreakerThreshold: 50,
  axiosPoolSize: 100
});
