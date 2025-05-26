
import axios from 'axios';
import { EventEmitter } from 'events';
import { llmService } from './llm';

export interface SearchSource {
  id: string;
  name: string;
  type: 'web' | 'academic' | 'news' | 'social' | 'vector' | 'graph';
  client: any;
  rateLimit: number;
  reliability: number;
  cost: number;
}

export interface SearchTask {
  id: string;
  query: string;
  source: string;
  filters: Record<string, any>;
  priority: number;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  relevanceScore: number;
  credibilityScore: number;
  timestamp: Date;
  entities: any[];
  facts: any[];
}

export class AdvancedSearchOrchestrator extends EventEmitter {
  private sources: Map<string, SearchSource> = new Map();
  private activeSearches = new Map<string, AbortController>();
  private searchQueue: SearchTask[] = [];
  private maxConcurrentSearches = 10;
  private currentSearches = 0;

  constructor() {
    super();
    this.initializeSources();
  }

  private initializeSources() {
    // Web sources
    this.sources.set('brave', {
      id: 'brave',
      name: 'Brave Search',
      type: 'web',
      client: null, // Will be initialized with actual client
      rateLimit: 100,
      reliability: 0.9,
      cost: 0.001
    });

    this.sources.set('google', {
      id: 'google',
      name: 'Google Search',
      type: 'web',
      client: null,
      rateLimit: 50,
      reliability: 0.95,
      cost: 0.005
    });

    // Academic sources
    this.sources.set('semantic_scholar', {
      id: 'semantic_scholar',
      name: 'Semantic Scholar',
      type: 'academic',
      client: null,
      rateLimit: 100,
      reliability: 0.98,
      cost: 0
    });

    this.sources.set('arxiv', {
      id: 'arxiv',
      name: 'arXiv',
      type: 'academic',
      client: null,
      rateLimit: 30,
      reliability: 0.95,
      cost: 0
    });

    // News sources
    this.sources.set('newsapi', {
      id: 'newsapi',
      name: 'NewsAPI',
      type: 'news',
      client: null,
      rateLimit: 500,
      reliability: 0.85,
      cost: 0.002
    });

    this.sources.set('reuters', {
      id: 'reuters',
      name: 'Reuters API',
      type: 'news',
      client: null,
      rateLimit: 100,
      reliability: 0.95,
      cost: 0.01
    });
  }

  async orchestrateSearch(
    query: string,
    intent: string,
    entities: any[],
    options: {
      maxResults?: number;
      timeRange?: string;
      requireAcademic?: boolean;
      requireNews?: boolean;
      qualityThreshold?: number;
    } = {}
  ): Promise<SearchResult[]> {
    
    // Step 1: Query decomposition
    const subQueries = await this.decomposeQuery(query, intent);
    
    // Step 2: Create search plan
    const searchPlan = await this.createSearchPlan(query, subQueries, intent, options);
    
    // Step 3: Execute searches in parallel with rate limiting
    const results = await this.executeSearchPlan(searchPlan);
    
    // Step 4: Process and rank results
    const processedResults = await this.processSearchResults(results, query);
    
    // Step 5: Deduplicate and optimize
    const finalResults = this.deduplicateResults(processedResults);
    
    return finalResults.slice(0, options.maxResults || 20);
  }

  private async decomposeQuery(query: string, intent: string): Promise<string[]> {
    const decompositionPrompt = `
    Decompose this research query into 3-5 specific sub-questions:
    
    Query: "${query}"
    Intent: ${intent}
    
    Generate focused sub-questions that when answered comprehensively would provide a complete response.
    Return as JSON array of strings.
    `;

    const response = await llmService.generateResponse([
      { role: 'user', content: decompositionPrompt }
    ], 0.3);

    try {
      return JSON.parse(response.message);
    } catch {
      return [query]; // Fallback to original query
    }
  }

  private async createSearchPlan(
    mainQuery: string,
    subQueries: string[],
    intent: string,
    options: any
  ): Promise<SearchTask[]> {
    
    const tasks: SearchTask[] = [];
    
    // Strategy based on intent
    switch (intent) {
      case 'factual':
        tasks.push(...await this.createFactualSearchPlan(mainQuery, subQueries, options));
        break;
      case 'analytical':
        tasks.push(...await this.createAnalyticalSearchPlan(mainQuery, subQueries, options));
        break;
      case 'comparative':
        tasks.push(...await this.createComparativeSearchPlan(mainQuery, subQueries, options));
        break;
      default:
        tasks.push(...await this.createExploratorySearchPlan(mainQuery, subQueries, options));
    }

    return tasks;
  }

  private async createFactualSearchPlan(
    mainQuery: string,
    subQueries: string[],
    options: any
  ): Promise<SearchTask[]> {
    
    const tasks: SearchTask[] = [];
    
    // High-reliability web search
    tasks.push({
      id: `web_${Date.now()}_1`,
      query: mainQuery,
      source: 'brave',
      filters: {
        recency: this.isTimeSensitive(mainQuery) ? '3months' : '1year',
        domainQuality: 'high'
      },
      priority: 1
    });

    // Academic sources for authoritative information
    if (this.requiresAcademicSources(mainQuery)) {
      tasks.push({
        id: `academic_${Date.now()}_1`,
        query: this.createAcademicQuery(mainQuery),
        source: 'semantic_scholar',
        filters: {
          peerReviewed: true,
          citationCount: '>10'
        },
        priority: 2
      });
    }

    // News for current events
    if (this.isNewsRelevant(mainQuery)) {
      tasks.push({
        id: `news_${Date.now()}_1`,
        query: mainQuery,
        source: 'newsapi',
        filters: {
          dateRange: 'week',
          credibility: 'high'
        },
        priority: 3
      });
    }

    // Sub-queries for comprehensive coverage
    subQueries.forEach((subQuery, index) => {
      tasks.push({
        id: `sub_${Date.now()}_${index}`,
        query: subQuery,
        source: 'brave',
        filters: { domainQuality: 'medium' },
        priority: 4 + index
      });
    });

    return tasks;
  }

  private async createAnalyticalSearchPlan(
    mainQuery: string,
    subQueries: string[],
    options: any
  ): Promise<SearchTask[]> {
    
    const tasks: SearchTask[] = [];
    
    // Multiple web sources for diverse perspectives
    const webSources = ['brave', 'google'];
    webSources.forEach((source, index) => {
      tasks.push({
        id: `web_${source}_${Date.now()}`,
        query: mainQuery,
        source,
        filters: { 
          domainQuality: 'high',
          contentType: 'analysis'
        },
        priority: 1 + index
      });
    });

    // Academic research for analytical depth
    tasks.push({
      id: `academic_analysis_${Date.now()}`,
      query: `analysis study research ${mainQuery}`,
      source: 'semantic_scholar',
      filters: {
        peerReviewed: true,
        contentType: 'research',
        citationCount: '>5'
      },
      priority: 3
    });

    return tasks;
  }

  private async createComparativeSearchPlan(
    mainQuery: string,
    subQueries: string[],
    options: any
  ): Promise<SearchTask[]> {
    
    const tasks: SearchTask[] = [];
    
    // Extract comparison entities
    const entities = await this.extractComparisonEntities(mainQuery);
    
    // Search for each entity separately
    entities.forEach((entity, index) => {
      tasks.push({
        id: `entity_${index}_${Date.now()}`,
        query: `${entity} analysis comparison`,
        source: 'brave',
        filters: { 
          domainQuality: 'high',
          contentType: 'comparison'
        },
        priority: 1 + index
      });
    });

    // Direct comparison search
    tasks.push({
      id: `comparison_${Date.now()}`,
      query: `${mainQuery} vs comparison`,
      source: 'brave',
      filters: { contentType: 'comparison' },
      priority: 10
    });

    return tasks;
  }

  private async createExploratorySearchPlan(
    mainQuery: string,
    subQueries: string[],
    options: any
  ): Promise<SearchTask[]> {
    
    const tasks: SearchTask[] = [];
    
    // Broad web search
    tasks.push({
      id: `exploratory_${Date.now()}`,
      query: mainQuery,
      source: 'brave',
      filters: { domainQuality: 'medium' },
      priority: 1
    });

    // Each sub-query
    subQueries.forEach((subQuery, index) => {
      tasks.push({
        id: `sub_exploratory_${index}_${Date.now()}`,
        query: subQuery,
        source: 'brave',
        filters: { domainQuality: 'medium' },
        priority: 2 + index
      });
    });

    return tasks;
  }

  private async executeSearchPlan(tasks: SearchTask[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Sort tasks by priority
    tasks.sort((a, b) => a.priority - b.priority);
    
    // Execute with concurrency control
    const promises: Promise<SearchResult[]>[] = [];
    
    for (const task of tasks) {
      if (this.currentSearches < this.maxConcurrentSearches) {
        this.currentSearches++;
        const promise = this.executeSearchTask(task).finally(() => {
          this.currentSearches--;
        });
        promises.push(promise);
      } else {
        // Wait for a slot to become available
        await Promise.race(promises);
        this.currentSearches++;
        const promise = this.executeSearchTask(task).finally(() => {
          this.currentSearches--;
        });
        promises.push(promise);
      }
    }
    
    // Wait for all searches to complete
    const allResults = await Promise.allSettled(promises);
    
    allResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      }
    });
    
    return results;
  }

  private async executeSearchTask(task: SearchTask): Promise<SearchResult[]> {
    const source = this.sources.get(task.source);
    if (!source) {
      throw new Error(`Unknown search source: ${task.source}`);
    }

    const abortController = new AbortController();
    this.activeSearches.set(task.id, abortController);

    try {
      // Execute search based on source type
      let results: any[] = [];
      
      switch (source.type) {
        case 'web':
          results = await this.executeWebSearch(task, abortController.signal);
          break;
        case 'academic':
          results = await this.executeAcademicSearch(task, abortController.signal);
          break;
        case 'news':
          results = await this.executeNewsSearch(task, abortController.signal);
          break;
      }

      // Transform to standard format
      return results.map(result => this.transformToSearchResult(result, source));
      
    } finally {
      this.activeSearches.delete(task.id);
    }
  }

  private async executeWebSearch(task: SearchTask, signal: AbortSignal): Promise<any[]> {
    // Use existing web search functionality
    const { performWebSearch } = await import('./performWebSearch');
    const results = await performWebSearch(task.query);
    return results.results || [];
  }

  private async executeAcademicSearch(task: SearchTask, signal: AbortSignal): Promise<any[]> {
    // Implement academic search
    try {
      const response = await axios.get(`https://api.semanticscholar.org/graph/v1/paper/search`, {
        params: {
          query: task.query,
          limit: 10,
          fields: 'title,abstract,url,authors,citationCount,year'
        },
        signal
      });
      
      return response.data.data || [];
    } catch (error) {
      console.error('Academic search failed:', error);
      return [];
    }
  }

  private async executeNewsSearch(task: SearchTask, signal: AbortSignal): Promise<any[]> {
    // Implement news search
    try {
      const newsApiKey = process.env.NEWS_API_KEY;
      if (!newsApiKey) return [];

      const response = await axios.get(`https://newsapi.org/v2/everything`, {
        params: {
          q: task.query,
          pageSize: 10,
          sortBy: 'relevancy',
          apiKey: newsApiKey
        },
        signal
      });
      
      return response.data.articles || [];
    } catch (error) {
      console.error('News search failed:', error);
      return [];
    }
  }

  private transformToSearchResult(rawResult: any, source: SearchSource): SearchResult {
    return {
      id: `${source.id}_${Date.now()}_${Math.random()}`,
      title: rawResult.title || rawResult.name || '',
      content: rawResult.abstract || rawResult.description || rawResult.content || '',
      url: rawResult.url || rawResult.link || '',
      source: source.name,
      relevanceScore: 0.8, // Will be calculated properly
      credibilityScore: source.reliability,
      timestamp: new Date(),
      entities: [],
      facts: []
    };
  }

  private async processSearchResults(results: SearchResult[], originalQuery: string): Promise<SearchResult[]> {
    // Process each result
    for (const result of results) {
      // Calculate relevance score
      result.relevanceScore = await this.calculateRelevanceScore(result, originalQuery);
      
      // Extract entities
      result.entities = await this.extractEntities(result.content);
      
      // Extract facts
      result.facts = await this.extractFacts(result.content);
    }

    // Sort by composite score
    return results.sort((a, b) => {
      const scoreA = a.relevanceScore * 0.6 + a.credibilityScore * 0.4;
      const scoreB = b.relevanceScore * 0.6 + b.credibilityScore * 0.4;
      return scoreB - scoreA;
    });
  }

  private async calculateRelevanceScore(result: SearchResult, query: string): Promise<number> {
    // Simple keyword-based relevance for now
    const queryWords = query.toLowerCase().split(' ');
    const contentWords = (result.title + ' ' + result.content).toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.includes(word)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  private async extractEntities(content: string): Promise<any[]> {
    // Basic entity extraction - can be enhanced with NLP
    const entityPrompt = `Extract key entities (people, organizations, locations, concepts) from this text:
    
    "${content.slice(0, 500)}"
    
    Return as JSON array with format: [{"name": "entity", "type": "PERSON|ORG|LOCATION|CONCEPT"}]`;

    try {
      const response = await llmService.generateResponse([
        { role: 'user', content: entityPrompt }
      ], 0.1);
      
      return JSON.parse(response.message);
    } catch {
      return [];
    }
  }

  private async extractFacts(content: string): Promise<any[]> {
    // Basic fact extraction
    const factPrompt = `Extract key factual statements from this text:
    
    "${content.slice(0, 500)}"
    
    Return as JSON array with format: [{"statement": "fact", "confidence": 0.0-1.0}]`;

    try {
      const response = await llmService.generateResponse([
        { role: 'user', content: factPrompt }
      ], 0.1);
      
      return JSON.parse(response.message);
    } catch {
      return [];
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const deduplicated: SearchResult[] = [];
    
    for (const result of results) {
      const key = result.url || result.title;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }
    
    return deduplicated;
  }

  // Helper methods
  private isTimeSensitive(query: string): boolean {
    const timeSensitiveKeywords = ['current', 'latest', 'recent', 'today', 'now', '2024', '2025'];
    return timeSensitiveKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private requiresAcademicSources(query: string): boolean {
    const academicKeywords = ['research', 'study', 'analysis', 'scientific', 'academic', 'paper'];
    return academicKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private isNewsRelevant(query: string): boolean {
    const newsKeywords = ['news', 'current', 'recent', 'breaking', 'today', 'latest'];
    return newsKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private createAcademicQuery(query: string): string {
    return `research study analysis ${query}`;
  }

  private async extractComparisonEntities(query: string): Promise<string[]> {
    const comparisonWords = ['vs', 'versus', 'compared to', 'compare', 'difference between'];
    
    for (const word of comparisonWords) {
      if (query.toLowerCase().includes(word)) {
        const parts = query.toLowerCase().split(word);
        if (parts.length === 2) {
          return [parts[0].trim(), parts[1].trim()];
        }
      }
    }
    
    return [query];
  }
}

export const advancedSearchOrchestrator = new AdvancedSearchOrchestrator();
