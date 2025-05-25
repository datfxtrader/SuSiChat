import axios from 'axios';
import { DeerFlowResearchParams, DeerFlowResearchResponse } from './types';
import { getDeerFlowServiceUrl } from './deerflow-manager';

export class DeerFlowClient {
  private baseUrl: string;

  constructor() {
    const port = process.env.DEERFLOW_PORT || 9000;
    const host = process.env.DEERFLOW_HOST || '0.0.0.0';
    this.baseUrl = `http://${host}:${port}`;

    console.log(`✅ DeerFlow Client configured for: ${this.baseUrl}`);
  }

  async performResearch(params: DeerFlowResearchParams): Promise<DeerFlowResearchResponse> {
    try {
      console.log(`📡 Making request to: ${this.baseUrl}/research`);
      console.log('📊 Request params:', JSON.stringify(params, null, 2));

      const response = await axios.post(`${this.baseUrl}/research`, params, {
        timeout: 300000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        validateStatus: (status) => status < 500
      });

      console.log(`✅ DeerFlow response status: ${response.status}`);
      console.log(`📄 Response keys:`, Object.keys(response.data));

      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(`❌ DeerFlow API error ${error.response.status}:`, error.response.data);
      } else {
        console.error('❌ DeerFlow connection error:', error.message);
      }
      throw error;
    }
  }
}

export const deerflowClient = new DeerFlowClient();