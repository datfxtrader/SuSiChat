import axios, { AxiosInstance, AxiosError } from 'axios';

const DEERFLOW_CONFIG = {
  SERVICE_URL: 'http://0.0.0.0:9000',
  TIMEOUT_SHORT: 30000,
  TIMEOUT_LONG: 300000,
  TIMEOUT_EXTENDED: 600000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000
};

export interface DeerFlowResearchParams {
  research_question: string;
  model_id?: string;
  include_market_data?: boolean;
  include_news?: boolean;
  research_length?: string;
  research_tone?: string;
  min_word_count?: number;
}

export interface DeerFlowResearchResponse {
  status?: any;
  report?: string;
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

export class DeerFlowClient {
  private static instance: DeerFlowClient;
  private axiosInstance: AxiosInstance;
  private serviceStatus: 'unknown' | 'running' | 'stopped' = 'unknown';
  private lastStatusCheck = 0;
  private readonly statusCheckInterval = 60000; // 1 minute

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: DEERFLOW_CONFIG.SERVICE_URL,
      timeout: DEERFLOW_CONFIG.TIMEOUT_LONG,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`🔄 DeerFlow API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ DeerFlow API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ DeerFlow API Response: ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ DeerFlow API Error: ${error.response?.status} from ${error.config?.url}`, error.message);
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): DeerFlowClient {
    if (!DeerFlowClient.instance) {
      DeerFlowClient.instance = new DeerFlowClient();
    }
    return DeerFlowClient.instance;
  }

  async performResearch(params: DeerFlowResearchParams): Promise<DeerFlowResearchResponse> {
    try {
      console.log('📊 Performing DeerFlow research:', params.research_question);

      const response = await this.axiosInstance.post('/research', params, {
        timeout: DEERFLOW_CONFIG.TIMEOUT_LONG,
      });

      console.log('✅ DeerFlow research completed successfully');
      
      if (response.data) {
        return {
          status: 'completed',
          report: response.data.response?.report || response.data.report,
          sources: response.data.response?.sources || response.data.sources || [],
          timestamp: new Date().toISOString(),
          ...response.data
        };
      }

      return this.createErrorResponse(new Error('No data received from DeerFlow service'));
    } catch (error) {
      console.error('❌ DeerFlow research error:', error);
      return this.createErrorResponse(error);
    }
  }

  async checkResearchStatus(researchId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/research/status/${researchId}`, {
        timeout: DEERFLOW_CONFIG.TIMEOUT_SHORT
      });
      return response.data;
    } catch (error) {
      console.error('Failed to check research status:', error);
      return { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private createErrorResponse(error: any): DeerFlowResearchResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      status: 'error',
      report: `Research could not be completed due to: ${errorMessage}`,
      sources: [],
      timestamp: new Date().toISOString(),
      service_process_log: [`Error: ${errorMessage}`]
    };
  }

  getDeerFlowServiceUrl(): string {
    return DEERFLOW_CONFIG.SERVICE_URL;
  }
}

// Export singleton
export const deerflowClient = DeerFlowClient.getInstance();