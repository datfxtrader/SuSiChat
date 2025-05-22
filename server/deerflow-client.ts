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
 * Parameters for the advanced agent research API
 */
export interface AgentResearchParams {
  research_question: string;
  depth?: string;
  include_reasoning?: boolean;
  learning_mode?: boolean;
  preferences?: any;
}

/**
 * Response from creating an agent research task
 */
export interface AgentResearchResponse {
  task_id: string;
  status: string;
  message: string;
}

/**
 * Detailed status of an agent research task
 */
export interface AgentTaskStatus {
  task_id: string;
  status: string;
  current_step: number;
  progress: number;
  execution_plan?: {
    strategy: string;
    steps: Array<{
      id: string;
      description: string;
      type: string;
      status: string;
    }>;
    total_estimated_time: number;
  };
  reasoning_chain?: Array<{
    step: string;
    analysis?: any;
    plan?: any;
    timestamp: number;
  }>;
  confidence_scores?: Record<string, number>;
  processing_time: number;
  metadata: {
    query: string;
    preferences: any;
    created_at: string;
  };
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

  /**
   * Create an advanced agent research task with planning and reasoning
   */
  async createAgentResearchTask(params: AgentResearchParams): Promise<AgentResearchResponse> {
    try {
      // Ensure DeerFlow service is running
      if (!(await checkDeerFlowService())) {
        console.log('DeerFlow service not running, starting it now...');
        const started = await startDeerFlowService();
        if (!started) {
          throw new Error('Failed to start DeerFlow service');
        }
      }

      console.log('Creating agent research task:', params);
      const serviceUrl = getDeerFlowServiceUrl();
      const response = await axios.post(`${serviceUrl}/agent/research`, params, {
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating agent research task:', error);
      return {
        task_id: '',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the detailed status of an agent research task
   */
  async getAgentTaskStatus(taskId: string): Promise<AgentTaskStatus | null> {
    try {
      const serviceUrl = getDeerFlowServiceUrl();
      const response = await axios.get(`${serviceUrl}/agent/task/${taskId}`, {
        timeout: 10000,
      });

      if (response.data.error) {
        console.error('Agent task status error:', response.data.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error getting agent task status:', error);
      return null;
    }
  }

  /**
   * List all active agent tasks
   */
  async listAgentTasks(): Promise<{ tasks: any[]; total: number }> {
    try {
      const serviceUrl = getDeerFlowServiceUrl();
      const response = await axios.get(`${serviceUrl}/agent/tasks`, {
        timeout: 10000,
      });

      return response.data;
    } catch (error) {
      console.error('Error listing agent tasks:', error);
      return { tasks: [], total: 0 };
    }
  }

  /**
   * Clean up completed agent tasks
   */
  async cleanupAgentTasks(maxAgeHours: number = 24): Promise<{ message: string; remaining_tasks: number }> {
    try {
      const serviceUrl = getDeerFlowServiceUrl();
      const response = await axios.post(`${serviceUrl}/agent/cleanup`, 
        { max_age_hours: maxAgeHours },
        { timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      console.error('Error cleaning up agent tasks:', error);
      return { message: 'Cleanup failed', remaining_tasks: 0 };
    }
  }
}

// Export a singleton instance
export const deerflowClient = new DeerFlowClient();