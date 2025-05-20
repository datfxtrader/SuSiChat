/**
 * Client for interacting with the DeerFlow research service
 */

import axios from 'axios';
import { checkDeerFlowService, startDeerFlowService, getDeerFlowServiceUrl } from './deerflow-manager';

/**
 * Parameters for the DeerFlow research API
 */
export interface DeerFlowResearchParams {
  research_question: string;
  model_id?: string;
  include_market_data?: boolean;
  include_news?: boolean;
}

/**
 * Response structure from the DeerFlow research API
 */
export interface DeerFlowResearchResponse {
  status?: any;
  report?: string;
  visualization_path?: string;
  timestamp?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
  service_process_log?: string[];
}

/**
 * Client for interacting with the DeerFlow research service
 */
export class DeerFlowClient {
  /**
   * Ensure DeerFlow service is running and then execute a research query
   */
  async performResearch(params: DeerFlowResearchParams): Promise<DeerFlowResearchResponse> {
    try {
      // Check if DeerFlow service is running
      if (!(await checkDeerFlowService())) {
        console.log('DeerFlow service not running, starting it now...');
        
        // Start the service
        const started = await startDeerFlowService();
        if (!started) {
          throw new Error('Failed to start DeerFlow service');
        }
      }
      
      // Make the actual API call to DeerFlow
      console.log('Making request to DeerFlow service:', params);
      const serviceUrl = getDeerFlowServiceUrl();
      const response = await axios.post(`${serviceUrl}/research`, params, {
        timeout: 60000, // 60 second timeout for research requests
      });
      
      return response.data;
    } catch (error) {
      console.error('Error performing DeerFlow research:', error);
      
      // Return error response
      return {
        status: { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
        report: 'Failed to perform deep research due to a service error.',
        service_process_log: ['Error connecting to or using the DeerFlow service']
      };
    }
  }
  
  /**
   * Check the status of a research request
   */
  async checkResearchStatus(researchId: string): Promise<any> {
    try {
      const serviceUrl = getDeerFlowServiceUrl();
      // Updated endpoint path to match our Python service implementation
      const response = await axios.get(`${serviceUrl}/research/${researchId}`, {
        timeout: 5000,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error checking research status:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const deerflowClient = new DeerFlowClient();