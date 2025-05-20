/**
 * DeerFlow API Service Integration - Handles the direct connection to the Python DeerFlow service
 */
import axios from 'axios';
import { log } from './logging';

// Type definitions
export interface ResearchRequest {
  query: string;
  max_step_num?: number;
  enable_background_investigation?: boolean;
  conversation_id?: string;
}

export interface ResearchResponse {
  query: string;
  result: string;
  sources: any[];
  plan: any;
  observations: string[];
  conversation_id?: string;
  error?: string;
  timestamp?: string;
}

class DeerFlowService {
  private baseUrl: string;
  private serviceAvailable: boolean = false;
  
  constructor() {
    this.baseUrl = process.env.DEERFLOW_API_URL || 'http://localhost:8000';
    this.checkServiceAvailability();
  }
  
  /**
   * Check if the DeerFlow service is available
   */
  async checkServiceAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      this.serviceAvailable = response.status === 200;
      
      if (this.serviceAvailable) {
        log('DeerFlow API service is available', 'deerflow');
      } else {
        log('DeerFlow API service health check failed', 'deerflow');
      }
      
      return this.serviceAvailable;
    } catch (error) {
      this.serviceAvailable = false;
      log(`DeerFlow API service is not available: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
      return false;
    }
  }
  
  /**
   * Perform research using the DeerFlow API
   */
  async performResearch(request: ResearchRequest): Promise<ResearchResponse> {
    // First check if service is available
    if (!this.serviceAvailable) {
      await this.checkServiceAvailability();
    }
    
    if (!this.serviceAvailable) {
      log('DeerFlow API service unavailable, using fallback', 'deerflow');
      return this.getFallbackResponse(request.query);
    }
    
    try {
      log(`Sending research request to DeerFlow API: ${request.query}`, 'deerflow');
      
      const response = await axios.post(
        `${this.baseUrl}/api/research`,
        {
          query: request.query,
          max_step_num: request.max_step_num || 3,
          enable_background_investigation: request.enable_background_investigation !== false,
          conversation_id: request.conversation_id
        },
        { timeout: 30000 }
      );
      
      if (response.status === 200 && response.data) {
        log('Research request successful', 'deerflow');
        
        // Add timestamp if not provided
        if (!response.data.timestamp) {
          response.data.timestamp = new Date().toISOString();
        }
        
        return response.data;
      } else {
        log(`Unexpected response from DeerFlow API: ${response.status}`, 'deerflow');
        return this.getFallbackResponse(request.query);
      }
    } catch (error) {
      log(`Error performing research with DeerFlow API: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
      return this.getFallbackResponse(request.query);
    }
  }
  
  /**
   * Generate a fallback response when the DeerFlow API is unavailable
   */
  private getFallbackResponse(query: string): ResearchResponse {
    return {
      query,
      result: `Unfortunately, the enhanced research service is currently unavailable. Here's a basic response for "${query}".`,
      sources: [],
      plan: {
        steps: [
          { id: 1, description: "Attempted to use research service", status: "failed" },
          { id: 2, description: "Generated basic response", status: "completed" }
        ]
      },
      observations: ["DeerFlow research service unavailable", "Fallback response generated"],
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Check if a query requires the enhanced research capabilities
   */
  shouldUseEnhancedResearch(query: string): boolean {
    // Queries that would benefit from enhanced research
    const researchKeywords = [
      'research', 'investigate', 'analyze', 'study', 'compare',
      'explain in detail', 'comprehensive', 'in-depth',
      'history of', 'background on', 'pros and cons',
      'implications of', 'consequences of', 'evidence for'
    ];
    
    const queryLower = query.toLowerCase();
    
    // Check if the query contains any research keywords
    return researchKeywords.some(keyword => queryLower.includes(keyword.toLowerCase()));
  }
}

export const deerflowService = new DeerFlowService();

/**
 * Express handler for research requests
 */
export async function handleResearchRequest(req: any, res: any) {
  try {
    const { query, maxSteps, enableBackgroundInvestigation, conversationId } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const researchRequest: ResearchRequest = {
      query,
      max_step_num: maxSteps || 3,
      enable_background_investigation: enableBackgroundInvestigation !== false,
      conversation_id: conversationId
    };
    
    const result = await deerflowService.performResearch(researchRequest);
    return res.json(result);
  } catch (error) {
    console.error('Error handling research request:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}