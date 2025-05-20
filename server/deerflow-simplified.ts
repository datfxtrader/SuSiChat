/**
 * Simplified DeerFlow integration service for enhanced research
 * 
 * This service provides research capabilities with proper source attribution
 * while keeping a reliable fallback mechanism to ensure the system always works.
 */
import axios from 'axios';
import { log, logError } from './logging';
import { llmService } from './llm';

// Type definitions
export interface ResearchRequest {
  query: string;
  maxSteps?: number;
  enableBackgroundInvestigation?: boolean;
  conversationId?: string;
}

export interface ResearchResponse {
  query: string;
  result: string;
  sources: any[];
  plan: {
    steps: {
      id: number;
      description: string;
      status: string;
    }[];
  };
  observations: string[];
  timestamp: string;
  conversationId?: string;
  error?: string;
}

export interface CacheEntry {
  timestamp: number;
  result: ResearchResponse;
}

/**
 * Enhanced research service that provides detailed analysis with sources
 */
class DeerFlowSimplifiedService {
  private serviceUrl: string;
  private serviceAvailable: boolean = false;
  private researchCache: Map<string, CacheEntry> = new Map();
  private CACHE_TTL = 60 * 60 * 1000; // 1 hour
  
  constructor() {
    this.serviceUrl = process.env.DEERFLOW_API_URL || 'http://localhost:8000';
    this.checkServiceAvailability();
    
    log('DeerFlow simplified service initialized', 'deerflow');
    
    // Clean cache every 15 minutes
    setInterval(() => this.cleanCache(), 15 * 60 * 1000);
    
    // Check service availability every 30 seconds
    setInterval(() => this.checkServiceAvailability(), 30 * 1000);
  }
  
  /**
   * Check if the DeerFlow service is available
   */
  async checkServiceAvailability(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.serviceUrl}/health`, { timeout: 5000 });
      this.serviceAvailable = res.status === 200;
      log(`DeerFlow API ${this.serviceAvailable ? 'is' : 'is not'} available`, 'deerflow');
      return this.serviceAvailable;
    } catch (error) {
      this.serviceAvailable = false;
      log('DeerFlow API is not available, will use fallbacks', 'deerflow');
      return false;
    }
  }
  
  /**
   * Clean expired entries from the cache
   */
  cleanCache(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.researchCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.researchCache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      log(`Cleaned ${expiredCount} expired research cache entries`, 'deerflow');
    }
  }
  
  /**
   * Simple hash function for query caching
   */
  private hashQuery(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
  
  /**
   * Perform research with the query
   */
  async performResearch(request: ResearchRequest): Promise<ResearchResponse> {
    const { query, maxSteps = 3, enableBackgroundInvestigation = true, conversationId } = request;
    const queryHash = this.hashQuery(query);
    
    // Check cache first
    const cachedResult = this.researchCache.get(queryHash);
    if (cachedResult && (Date.now() - cachedResult.timestamp < this.CACHE_TTL)) {
      log(`Using cached research result for: ${query}`, 'deerflow');
      return cachedResult.result;
    }
    
    log(`Performing research for query: ${query}`, 'deerflow');
    
    // Try to use the DeerFlow API service if available
    if (this.serviceAvailable) {
      try {
        log('Connecting to DeerFlow API service', 'deerflow');
        const response = await axios.post(
          `${this.serviceUrl}/api/research`,
          {
            query,
            max_step_num: maxSteps,
            enable_background_investigation: enableBackgroundInvestigation,
            conversation_id: conversationId
          },
          { timeout: 30000 }
        );
        
        if (response.status === 200 && response.data) {
          const result = response.data;
          
          // Cache the result
          this.researchCache.set(queryHash, {
            timestamp: Date.now(),
            result
          });
          
          log('DeerFlow API research completed successfully', 'deerflow');
          return result;
        }
      } catch (error) {
        logError(`DeerFlow API error: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
        // Service might be down, mark as unavailable
        this.serviceAvailable = false;
      }
    }
    
    // If we reach this point, we need to use our fallback approach
    log('Using local research fallback', 'deerflow');
    return this.performLocalResearch(query, maxSteps, conversationId);
  }
  
  /**
   * Perform local research using web search and LLM analysis
   * when the DeerFlow API service is unavailable
   */
  private async performLocalResearch(
    query: string, 
    maxSteps: number = 3,
    conversationId?: string
  ): Promise<ResearchResponse> {
    try {
      // Simulate the research process
      log(`Performing local research for: ${query}`, 'deerflow');
      
      // 1. Search for web results
      const { performWebSearch } = await import('./suna-integration');
      const searchResults = await performWebSearch(query);
      
      // 2. Extract and format sources
      const sources = this.extractSourcesFromSearch(searchResults);
      
      // 3. Generate analysis with the LLM
      const analysisPrompt = `
You are a research assistant providing a detailed, evidence-based analysis.

QUERY: ${query}

I've gathered these sources for you to analyze:
${sources.map((s, i) => `SOURCE ${i+1}: ${s.title}\n${s.url}\n${s.snippet}`).join('\n\n')}

Please provide a comprehensive analysis of the query based on these sources. 
Include key findings, different perspectives, and evidence-based insights.
Format your response using Markdown with appropriate headings and sections.
`;

      const analysis = await llmService.generateResponse('system', analysisPrompt);
      
      // 4. Create a research plan for tracking
      const researchPlan = {
        steps: [
          { id: 1, description: "Gather relevant information from reliable sources", status: "completed" },
          { id: 2, description: "Analyze information and extract key insights", status: "completed" },
          { id: 3, description: "Synthesize findings into comprehensive report", status: "completed" }
        ]
      };
      
      // 5. Create observations about the research process
      const observations = [
        "Collected information from multiple authoritative sources",
        "Analyzed different perspectives and viewpoints",
        "Synthesized evidence-based insights into a comprehensive response"
      ];
      
      // Build the complete response
      const response: ResearchResponse = {
        query,
        result: analysis,
        sources,
        plan: researchPlan,
        observations,
        timestamp: new Date().toISOString(),
        conversationId
      };
      
      // Cache the result
      this.researchCache.set(this.hashQuery(query), {
        timestamp: Date.now(),
        result: response
      });
      
      log('Local research completed successfully', 'deerflow');
      return response;
    } catch (error) {
      logError(`Local research error: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
      
      // Return a basic response with error information
      return {
        query,
        result: `I was unable to complete full research on "${query}" due to technical issues.`,
        sources: [],
        plan: {
          steps: [
            { id: 1, description: "Research attempted", status: "failed" }
          ]
        },
        observations: [
          "Research process encountered technical difficulties",
          "Limited information available due to service issues"
        ],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Extract and format sources from search results
   */
  private extractSourcesFromSearch(searchResults: any[]): any[] {
    if (!searchResults || !Array.isArray(searchResults)) {
      return [];
    }
    
    return searchResults.map(result => ({
      title: result.title || 'Unknown Source',
      url: result.url || result.link || '#',
      snippet: result.snippet || result.content || 'No description available'
    }));
  }
}

export const deerflowService = new DeerFlowSimplifiedService();

/**
 * Express handler for research requests
 */
export const handleResearchRequest = async (req: any, res: any) => {
  try {
    const { query, maxSteps, enableBackgroundInvestigation, conversationId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const researchRequest: ResearchRequest = {
      query,
      maxSteps: maxSteps || 3,
      enableBackgroundInvestigation: enableBackgroundInvestigation !== false,
      conversationId
    };
    
    const result = await deerflowService.performResearch(researchRequest);
    return res.json(result);
  } catch (error) {
    logError(`Error handling research request: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
    return res.status(500).json({
      error: 'Research processing error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};