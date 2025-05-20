/**
 * DeerFlow integration service for enhanced research capabilities
 * This service provides an interface between our Node.js application and the DeerFlow Python microservice
 */

import axios from 'axios';
import { setTimeout } from 'timers/promises';
import { log } from './vite';

// Configuration for the DeerFlow service
interface DeerFlowConfig {
  baseUrl: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
}

// Research request parameters
interface ResearchRequest {
  query: string;
  max_plan_iterations?: number;
  max_step_num?: number;
  enable_background_investigation?: boolean;
  conversation_id?: string;
}

// Research response structure
interface ResearchResponse {
  query: string;
  result: string;
  sources: any[];
  plan: any;
  observations: any[];
  conversation_id?: string;
  collected_messages?: any[];
  error?: string;
}

/**
 * DeerFlow integration service for advanced research capabilities
 */
export class DeerFlowIntegrationService {
  private config: DeerFlowConfig;
  private serviceAvailable: boolean = false;

  constructor() {
    this.config = {
      baseUrl: process.env.DEERFLOW_SERVICE_URL || 'http://localhost:8000',
      timeout: 60000, // 60 seconds default timeout
      retryCount: 3,   // Number of retry attempts
      retryDelay: 1000 // 1 second delay between retries
    };

    // Check if the service is available at startup
    this.checkServiceAvailability();
  }

  /**
   * Check if the DeerFlow service is available
   * @returns Promise resolving to boolean indicating availability
   */
  async checkServiceAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 5000 // Short timeout for health check
      });
      
      this.serviceAvailable = response.status === 200;
      if (this.serviceAvailable) {
        log('DeerFlow research service is available', 'deerflow');
      } else {
        log('DeerFlow research service health check failed', 'deerflow');
      }
      
      return this.serviceAvailable;
    } catch (error) {
      this.serviceAvailable = false;
      log(`DeerFlow research service is not available: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
      return false;
    }
  }

  /**
   * Perform research using the DeerFlow service with retry logic
   * @param request Research request parameters
   * @returns Research response with results
   */
  async performResearch(request: ResearchRequest): Promise<ResearchResponse> {
    // Check if service is available, attempt to reconnect if not
    if (!this.serviceAvailable) {
      this.serviceAvailable = await this.checkServiceAvailability();
      
      if (!this.serviceAvailable) {
        return {
          query: request.query,
          result: "The advanced research service is currently unavailable. Please try again later.",
          sources: [],
          plan: {},
          observations: [],
          conversation_id: request.conversation_id,
          error: "Service unavailable"
        };
      }
    }

    // Retry logic for the research request
    let lastError: any = null;
    
    for (let attempt = 0; attempt < this.config.retryCount; attempt++) {
      try {
        const response = await axios.post(
          `${this.config.baseUrl}/api/research`,
          request,
          { timeout: this.config.timeout }
        );
        
        return response.data as ResearchResponse;
      } catch (error) {
        lastError = error;
        log(`DeerFlow research attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
        
        // Wait before retrying
        if (attempt < this.config.retryCount - 1) {
          await setTimeout(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    // Return error response after all retries fail
    return {
      query: request.query,
      result: "The research request could not be completed at this time.",
      sources: [],
      plan: {},
      observations: [],
      conversation_id: request.conversation_id,
      error: lastError instanceof Error ? lastError.message : String(lastError)
    };
  }

  /**
   * Determine if a query requires advanced research capabilities
   * @param query The user's query text
   * @returns Boolean indicating if advanced research is recommended
   */
  shouldUseAdvancedResearch(query: string): boolean {
    // Check query length - longer, more complex queries benefit from DeerFlow
    if (query.length > 100) return true;
    
    // Keywords indicating research needs
    const researchKeywords = [
      'research', 'analyze', 'investigate', 'compare', 'contrast',
      'explain in detail', 'provide context', 'deep dive', 'trends',
      'statistics', 'data', 'evidence', 'studies', 'papers',
      'academic', 'journal', 'publication', 'comprehensive',
      'thorough analysis', 'synthesize', 'market research', 'industry'
    ];
    
    // Check for research keywords
    for (const keyword of researchKeywords) {
      if (query.toLowerCase().includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }
}

// Singleton instance
export const deerflowService = new DeerFlowIntegrationService();

/**
 * Express handler for research requests
 */
export const handleResearchRequest = async (req: any, res: any) => {
  try {
    const { query, conversation_id } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Configure research parameters
    const researchRequest: ResearchRequest = {
      query,
      conversation_id,
      max_plan_iterations: req.body.max_plan_iterations || 1,
      max_step_num: req.body.max_step_num || 3,
      enable_background_investigation: req.body.enable_background_investigation !== false // Default to true
    };
    
    // Perform the research
    const result = await deerflowService.performResearch(researchRequest);
    
    // Return the research results
    return res.json(result);
  } catch (error) {
    console.error('Error handling research request:', error);
    return res.status(500).json({ 
      error: 'An error occurred while processing the research request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};