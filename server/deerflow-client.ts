import axios, { AxiosInstance, AxiosError } from 'axios';
import { checkDeerFlowService, startDeerFlowService } from './deerflow-manager';

// Interfaces
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

const DEERFLOW_CONFIG = {
  SERVICE_URL: process.env.DEERFLOW_SERVICE_URL || 'http://localhost:9000',
  FALLBACK_PORTS: [9000, 9001, 9002, 9003, 9004],
  RETRY_DELAY: 2000,
  MAX_RETRIES: 3,
  TIMEOUT_SHORT: 10000,
  TIMEOUT_LONG: 30000,
  TIMEOUT_EXTENDED: 60000
};

export class DeerFlowClient {
  private static instance: DeerFlowClient;
  private axiosInstance: AxiosInstance;
  private serviceStatus: 'unknown' | 'running' | 'stopped' = 'unknown';
  private lastStatusCheck = 0;
  private readonly statusCheckInterval = 60000; // 1 minute

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: DEERFLOW_CONFIG.SERVICE_URL,
      validateStatus: (status) => status >= 200 && status < 500,
    });
  }

  private async findActiveService(): Promise<string | null> {
    // Try default URL first
    try {
      const response = await axios.get(`${DEERFLOW_CONFIG.SERVICE_URL}/health`, { timeout: 3000 });
      if (response.status === 200) return DEERFLOW_CONFIG.SERVICE_URL;
    } catch (error) {
      // Continue to try other ports
    }

    // Try fallback ports
    for (const port of DEERFLOW_CONFIG.FALLBACK_PORTS) {
      const url = `http://localhost:${port}`;
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        if (response.status === 200) {
          this.axiosInstance.defaults.baseURL = url;
          console.log(`✅ Found DeerFlow service at ${url}`);
          return url;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  static getInstance(): DeerFlowClient {
    if (!DeerFlowClient.instance) {
      DeerFlowClient.instance = new DeerFlowClient();
    }
    return DeerFlowClient.instance;
  }

  async performResearch(params: DeerFlowResearchParams): Promise<DeerFlowResearchResponse> {
    try {
      await this.ensureServiceRunning();

      console.log('📊 Performing DeerFlow research:', params.research_question);

      const response = await this.axiosInstance.post('/research', params, {
        timeout: DEERFLOW_CONFIG.TIMEOUT_LONG,
      });

      return response.data;
    } catch (error) {
      console.error('❌ DeerFlow research error:', error);
      return this.createErrorResponse(error);
    }
  }

  async checkResearchStatus(researchId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/research/${researchId}`, {
        timeout: DEERFLOW_CONFIG.TIMEOUT_SHORT,
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error checking research status:', error);
      throw error;
    }
  }

  async executeFullAgentResearch(params: {
    research_question: string;
    user_id: string;
    complexity?: string;
    enable_multi_agent?: boolean;
    enable_reasoning?: boolean;
    preferences?: any;
  }): Promise<any> {
    try {
      await this.ensureServiceRunning();

      console.log('🤖 Executing full agent research:', params.research_question);

      // Add request ID for tracking
      const requestId = this.generateRequestId();
      const enrichedParams = { ...params, request_id: requestId };

      const response = await this.axiosInstance.post(
        '/deerflow/full-research', 
        enrichedParams,
        { timeout: DEERFLOW_CONFIG.TIMEOUT_LONG }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Full agent research error:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        capabilities: [],
        request_id: params.user_id
      };
    }
  }

  async getCapabilities(): Promise<any> {
    try {
      // Use cached status if recent
      if (this.serviceStatus === 'running' && 
          Date.now() - this.lastStatusCheck < this.statusCheckInterval) {
        return this.getCachedCapabilities();
      }

      const response = await this.axiosInstance.get('/deerflow/capabilities', {
        timeout: DEERFLOW_CONFIG.TIMEOUT_SHORT,
      });

      this.serviceStatus = 'running';
      this.lastStatusCheck = Date.now();

      return response.data;
    } catch (error) {
      this.serviceStatus = 'stopped';
      return {
        service: 'DeerFlow Agent System',
        status: 'Service unavailable',
        capabilities: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async ensureServiceRunning(): Promise<void> {
    // Skip check if recently verified
    if (this.serviceStatus === 'running' && 
        Date.now() - this.lastStatusCheck < this.statusCheckInterval) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const isRunning = await checkDeerFlowService();

      if (isRunning) {
        this.serviceStatus = 'running';
        this.lastStatusCheck = Date.now();
        return;
      }

      if (attempts === 0) {
        console.log('🚀 Starting DeerFlow service...');
        const started = await startDeerFlowService();

        if (started) {
          // Wait for service to be ready
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, DEERFLOW_CONFIG.RETRY_DELAY));
      }
    }

    throw new Error('Failed to start DeerFlow service after multiple attempts');
  }

  private createErrorResponse(error: any): DeerFlowResearchResponse {
    const isTimeout = axios.isAxiosError(error) && error.code === 'ECONNABORTED';
    const message = isTimeout 
      ? 'Research request timed out. The query may be too complex.'
      : error instanceof Error ? error.message : 'Unknown error';

    return {
      status: { status: 'error', message },
      report: 'Failed to perform deep research due to a service error.',
      service_process_log: ['Error connecting to or using the DeerFlow service']
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCachedCapabilities(): any {
    return {
      service: 'DeerFlow Agent System',
      status: 'Operational',
      capabilities: {
        research: true,
        multi_agent: true,
        reasoning: true,
        tools: true
      },
      cached: true,
      last_check: new Date(this.lastStatusCheck).toISOString()
    };
  }

  getDeerFlowServiceUrl(): string {
    return DEERFLOW_CONFIG.SERVICE_URL;
  }
}

static getInstance(): DeerFlowClient {
    if (!DeerFlowClient.instance) {
      DeerFlowClient.instance = new DeerFlowClient();
    }
    return DeerFlowClient.instance;
  }

  async getCapabilities(): Promise<any> {
    try {
      const now = Date.now();
      if (now - this.lastStatusCheck < this.statusCheckInterval) {
        return this.getCachedCapabilities();
      }

      const response = await this.axiosInstance.get('/deerflow/capabilities', {
        timeout: DEERFLOW_CONFIG.TIMEOUT_SHORT
      });

      this.lastStatusCheck = now;
      return response.data;
    } catch (error) {
      logger.error('Failed to get DeerFlow capabilities:', error);
      return this.getCachedCapabilities();
    }
  }

  async performResearch(params: DeerFlowResearchParams, abortSignal?: AbortSignal): Promise<DeerFlowResearchResponse> {
    try {
      // Ensure service is running
      const serviceUrl = await this.findActiveService();
      if (!serviceUrl) {
        await this.startServiceIfNeeded();
      }

      const response = await this.axiosInstance.post('/research', params, {
        timeout: DEERFLOW_CONFIG.TIMEOUT_EXTENDED,
        signal: abortSignal
      });

      if (response.status === 200) {
        return response.data;
      } else {
        throw new Error(`DeerFlow research failed: ${response.status}`);
      }
    } catch (error) {
      logger.error('DeerFlow research error:', error);
      return this.createErrorResponse(error);
    }
  }
}

// Export singleton
export const deerflowClient = DeerFlowClient.getInstance();nt.getInstance();