/**
 * DeerFlow Bridge Module
 * 
 * This module provides a bridge between the main application and the DeerFlow research service.
 * It handles communication with the Python-based DeerFlow service and translates between formats.
 */

import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Configure the DeerFlow service
const DEERFLOW_PORT = process.env.DEERFLOW_PORT || 8765;
const DEERFLOW_HOST = process.env.DEERFLOW_HOST || 'localhost';
const DEERFLOW_URL = `http://${DEERFLOW_HOST}:${DEERFLOW_PORT}`;
const USE_DEERFLOW_RESEARCH = true;

// Research request interface
export interface ResearchRequest {
  query: string;
  depth?: 'basic' | 'standard' | 'deep';
  maxSources?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  useCache?: boolean;
  userContext?: string;
}

// Source information interface
export interface Source {
  title: string;
  url: string;
  domain: string;
  contentSnippet?: string;
  relevanceScore?: number;
}

// Research response interface
export interface ResearchResponse {
  id: string;
  query: string;
  summary?: string;
  sources: Source[];
  insights: string[];
  relatedTopics?: string[];
  status: 'completed' | 'in_progress' | 'analyzing' | 'synthesizing' | 'failed';
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

/**
 * DeerFlow integration service for communication with the Python-based DeerFlow service
 */
class DeerFlowBridge {
  private serviceProcess: ChildProcess | null = null;
  private serviceReady: boolean = false;
  private serviceStarting: boolean = false;
  private setupPromise: Promise<boolean> | null = null;
  private apiUrl: string = DEERFLOW_URL;

  constructor() {
    console.log(`DeerFlow bridge configured for ${this.apiUrl}`);
  }

  /**
   * Initialize the DeerFlow service
   */
  async initService(): Promise<boolean> {
    if (this.serviceReady) {
      return true;
    }

    if (this.serviceStarting) {
      if (this.setupPromise) {
        return await this.setupPromise;
      }
      return false;
    }

    this.serviceStarting = true;
    this.setupPromise = new Promise<boolean>((resolve) => {
      console.log('[deerflow] Starting DeerFlow service...');
      
      // Execute the run-deerflow-server.sh script
      const scriptPath = path.join(process.cwd(), 'run-deerflow-server.sh');
      
      if (!fs.existsSync(scriptPath)) {
        console.error(`[deerflow] Script not found: ${scriptPath}`);
        this.serviceStarting = false;
        resolve(false);
        return;
      }
      
      this.serviceProcess = spawn('bash', [scriptPath, DEERFLOW_PORT.toString()], {
        detached: true,
        stdio: 'ignore'
      });

      // Check service availability with timeout
      let checkAttempts = 0;
      const maxAttempts = 10;
      const checkInterval = setInterval(async () => {
        checkAttempts++;
        const isAvailable = await this.checkServiceAvailable();
        
        if (isAvailable) {
          clearInterval(checkInterval);
          console.log('[deerflow] DeerFlow service started successfully');
          this.serviceReady = true;
          this.serviceStarting = false;
          resolve(true);
          return;
        }
        
        if (checkAttempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('[deerflow] Failed to start DeerFlow service - timeout');
          this.serviceStarting = false;
          
          // Clean up process
          if (this.serviceProcess && this.serviceProcess.pid) {
            try {
              process.kill(-this.serviceProcess.pid);
            } catch (error) {
              console.error('[deerflow] Error killing service process:', error);
            }
            this.serviceProcess = null;
          }
          
          resolve(false);
        }
      }, 1000);
    });

    return await this.setupPromise;
  }

  /**
   * Check if the DeerFlow service is available
   */
  private async checkServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/health`, { timeout: 2000 });
      return response.status === 200 && response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Start a new research task
   */
  async startResearch(request: ResearchRequest): Promise<{ id: string; status: string }> {
    if (!this.serviceReady) {
      await this.initService();
    }

    try {
      const response = await axios.post(`${this.apiUrl}/api/research/start`, request);
      return response.data;
    } catch (error) {
      console.error('[deerflow] Error starting research:', error);
      throw new Error('Failed to start research task');
    }
  }

  /**
   * Get the status of a research task
   */
  async getResearchStatus(taskId: string): Promise<ResearchResponse> {
    if (!this.serviceReady) {
      await this.initService();
    }

    try {
      const response = await axios.get(`${this.apiUrl}/api/research/${taskId}`);
      return this.formatResponse(response.data);
    } catch (error) {
      console.error('[deerflow] Error getting research status:', error);
      throw new Error(`Failed to get research status for task ${taskId}`);
    }
  }

  /**
   * Run a complete research task (start and wait for completion)
   */
  async runCompleteResearch(request: ResearchRequest): Promise<ResearchResponse> {
    if (!this.serviceReady) {
      await this.initService();
    }

    try {
      const response = await axios.post(`${this.apiUrl}/api/research/complete`, request, {
        timeout: 60000  // 60 second timeout for complete research
      });
      return this.formatResponse(response.data);
    } catch (error) {
      console.error('[deerflow] Error running complete research:', error);
      throw new Error('Failed to complete research task');
    }
  }

  /**
   * Stop the DeerFlow service
   */
  async stopService(): Promise<boolean> {
    if (!this.serviceProcess) {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      // Execute the stop-deerflow-server.sh script
      const scriptPath = path.join(process.cwd(), 'stop-deerflow-server.sh');
      
      if (!fs.existsSync(scriptPath)) {
        console.error(`[deerflow] Stop script not found: ${scriptPath}`);
        resolve(false);
        return;
      }
      
      const stopProcess = spawn('bash', [scriptPath], {
        stdio: 'inherit'
      });

      stopProcess.on('close', (code) => {
        this.serviceReady = false;
        this.serviceProcess = null;
        resolve(code === 0);
      });
    });
  }

  /**
   * Format the response from the DeerFlow service
   */
  private formatResponse(data: any): ResearchResponse {
    return {
      id: data.id || '',
      query: data.query || '',
      summary: data.summary || '',
      sources: (data.sources || []).map((source: any) => ({
        title: source.title || '',
        url: source.url || '',
        domain: source.domain || '',
        contentSnippet: source.content_snippet || source.contentSnippet || '',
        relevanceScore: source.relevance_score || source.relevanceScore || 0
      })),
      insights: data.insights || [],
      relatedTopics: data.related_topics || data.relatedTopics || [],
      status: data.status || 'failed',
      error: data.error || undefined,
      createdAt: data.created_at || data.createdAt || '',
      completedAt: data.completed_at || data.completedAt || ''
    };
  }
}

// Export a singleton instance
export const deerflowBridge = new DeerFlowBridge();
export const USE_DEERFLOW = USE_DEERFLOW_RESEARCH;