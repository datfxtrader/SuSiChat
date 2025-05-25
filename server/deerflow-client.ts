import axios from 'axios';
import { DeerFlowResearchParams, DeerFlowResearchResponse } from './types';
import { getDeerFlowServiceUrl } from './deerflow-manager';

/**
 * Parameters for the DeerFlow research API
 */
export interface DeerFlowResearchParams {
  research_question: string;
  query?: string; // Add query property to match usage
  model_id?: string;
  research_depth?: number;
  include_market_data?: boolean;
  include_news?: boolean;
  research_length?: string;
  research_tone?: string;
  min_word_count?: number;
}

/**
 * Response structure from the DeerFlow research API
 */
export interface DeerFlowResearchResponse {
  status?: any;
  report?: string;
  content?: string; // Add content property
  analysis?: any; // Add analysis property
  response?: {
    report?: string;
    sources?: Array<{
      title: string;
      url: string;
      domain: string;
    }>;
  };
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

export class DeerFlowClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getDeerFlowServiceUrl();
    console.log(`DeerFlow Client configured for: ${this.baseUrl}`);
  }

  async performResearch(params: DeerFlowResearchParams): Promise<DeerFlowResearchResponse> {
    try {
      console.log(`Making request to DeerFlow service: ${this.baseUrl}/research`);

      const response = await axios.post(`${this.baseUrl}/research`, params, {
        timeout: 600000, // 10 minutes
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error performing DeerFlow research:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }
}

export const deerflowClient = new DeerFlowClient();