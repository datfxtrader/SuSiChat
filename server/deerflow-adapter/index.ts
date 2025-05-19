/**
 * DeerFlow Adapter
 * 
 * This module provides a bridge between our application and the DeerFlow research framework.
 * It handles communication with the DeerFlow service and processes research results.
 */

import axios from 'axios';

// Configuration for DeerFlow service
interface DeerFlowConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

// Research request parameters
export interface ResearchRequest {
  query: string;
  depth?: 'basic' | 'standard' | 'deep';
  maxSources?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  useCache?: boolean;
  userContext?: string;
}

// Research response structure
export interface ResearchResponse {
  id: string;
  query: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
    domain: string;
    contentSnippet?: string;
    relevanceScore?: number;
  }>;
  insights: string[];
  relatedTopics?: string[];
  status: 'completed' | 'in_progress' | 'failed';
  error?: string;
}

/**
 * DeerFlow Adapter class for handling research operations
 */
export class DeerFlowAdapter {
  private config: DeerFlowConfig;
  private client: any;

  /**
   * Create a new DeerFlow adapter
   */
  constructor(config: Partial<DeerFlowConfig> = {}) {
    // Default configuration
    this.config = {
      baseUrl: process.env.DEERFLOW_API_URL || 'http://localhost:8000',
      apiKey: process.env.DEERFLOW_API_KEY,
      timeout: 60000,
      ...config
    };

    // Create HTTP client
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      }
    });
  }

  /**
   * Check if the DeerFlow service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('DeerFlow service health check failed:', error);
      return false;
    }
  }

  /**
   * Start a new research task
   */
  async startResearch(request: ResearchRequest): Promise<string> {
    try {
      const response = await this.client.post('/research', request);
      return response.data.id; // Return the research task ID
    } catch (error) {
      console.error('Failed to start DeerFlow research:', error);
      throw new Error('Failed to initiate research');
    }
  }

  /**
   * Get the status of a research task
   */
  async getResearchStatus(researchId: string): Promise<ResearchResponse> {
    try {
      const response = await this.client.get(`/research/${researchId}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get research status for ID ${researchId}:`, error);
      throw new Error('Failed to retrieve research status');
    }
  }

  /**
   * Wait for a research task to complete with polling
   */
  async waitForCompletion(researchId: string, pollingIntervalMs: number = 2000, timeoutMs: number = 300000): Promise<ResearchResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getResearchStatus(researchId);
      
      if (status.status === 'completed') {
        return status;
      } else if (status.status === 'failed') {
        throw new Error(`Research failed: ${status.error}`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
    }
    
    throw new Error('Research timed out');
  }

  /**
   * Run a complete research task and wait for results
   */
  async runResearch(request: ResearchRequest): Promise<ResearchResponse> {
    const researchId = await this.startResearch(request);
    return this.waitForCompletion(researchId);
  }
}

// Create a singleton instance
const deerFlowAdapter = new DeerFlowAdapter();
export default deerFlowAdapter;