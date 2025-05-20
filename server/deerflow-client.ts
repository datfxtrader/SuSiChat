// server/deerflow-client.ts
import axios from 'axios';
import { checkDeerFlowService, startDeerFlowService } from './deerflow-manager';

const DEERFLOW_API_URL = 'http://localhost:8765';

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
    // Check if DeerFlow service is running
    const isRunning = await checkDeerFlowService();
    
    // If not running, try to start it
    if (!isRunning) {
      console.log('DeerFlow service not running, attempting to start...');
      try {
        await startDeerFlowService();
      } catch (error) {
        console.error('Failed to start DeerFlow service:', error);
        throw new Error(`Unable to start DeerFlow service: ${error.message}`);
      }
    }
    
    // Execute research query
    try {
      console.log(`Sending research query to DeerFlow: "${params.research_question}"`);
      
      const response = await axios.post(`${DEERFLOW_API_URL}/research`, params, {
        timeout: 300000, // 5-minute timeout for research queries
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error performing DeerFlow research:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(`DeerFlow API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('DeerFlow service did not respond. It may be overloaded or crashed.');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(`Error with DeerFlow request: ${error.message}`);
      }
    }
  }
}

export const deerflowClient = new DeerFlowClient();