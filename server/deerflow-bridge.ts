/**
 * DeerFlow Bridge Module
 * 
 * This module provides a bridge between the main application and the DeerFlow research service.
 * It handles communication with the Python-based DeerFlow service and translates between formats.
 */

import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { log } from './vite';

// Configuration
const DEERFLOW_SERVICE_URL = 'http://localhost:8000';
const DEERFLOW_STARTUP_TIMEOUT = 15000; // 15 seconds

// Interface definitions
export interface ResearchRequest {
  query: string;
  depth?: 'basic' | 'standard' | 'deep';
  maxSources?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  useCache?: boolean;
  userContext?: string;
}

export interface Source {
  title: string;
  url: string;
  domain: string;
  contentSnippet?: string;
  relevanceScore?: number;
}

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

  constructor() {
    this.initService();
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
        return this.setupPromise;
      }
      return false;
    }

    this.serviceStarting = true;
    this.setupPromise = new Promise<boolean>((resolve) => {
      // First try to connect to an already running service
      this.checkServiceAvailable()
        .then((available) => {
          if (available) {
            log('DeerFlow service already running', 'deerflow');
            this.serviceReady = true;
            this.serviceStarting = false;
            resolve(true);
            return;
          }

          // If not available, start the service
          log('Starting DeerFlow service...', 'deerflow');
          const scriptPath = path.join(process.cwd(), 'run-deerflow.sh');
          
          // Make sure the script is executable
          try {
            fs.chmodSync(scriptPath, '755');
          } catch (error) {
            log(`Error making script executable: ${error}`, 'deerflow');
          }
          
          this.serviceProcess = spawn(scriptPath, [], {
            detached: true,
            stdio: 'ignore'
          });

          // Wait for service to be available
          const startTime = Date.now();
          const checkInterval = setInterval(async () => {
            const available = await this.checkServiceAvailable();
            if (available) {
              clearInterval(checkInterval);
              log('DeerFlow service started successfully', 'deerflow');
              this.serviceReady = true;
              this.serviceStarting = false;
              resolve(true);
              return;
            }

            if (Date.now() - startTime > DEERFLOW_STARTUP_TIMEOUT) {
              clearInterval(checkInterval);
              log('Failed to start DeerFlow service - timeout', 'deerflow');
              this.serviceStarting = false;
              resolve(false);
            }
          }, 1000);
        })
        .catch((error) => {
          log(`Error checking DeerFlow service: ${error}`, 'deerflow');
          this.serviceStarting = false;
          resolve(false);
        });
    });

    return this.setupPromise;
  }

  /**
   * Check if the DeerFlow service is available
   */
  private async checkServiceAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${DEERFLOW_SERVICE_URL}/health`, { timeout: 3000 });
      return response.status === 200 && response.data?.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Start a new research task
   */
  async startResearch(request: ResearchRequest): Promise<{ id: string; status: string }> {
    // Ensure service is running
    const ready = await this.initService();
    if (!ready) {
      throw new Error('DeerFlow service is not available');
    }

    try {
      const response = await axios.post(`${DEERFLOW_SERVICE_URL}/research`, request);
      return response.data;
    } catch (error: any) {
      log(`Error starting research: ${error.message}`, 'deerflow');
      throw new Error(`Failed to start research: ${error.message}`);
    }
  }

  /**
   * Get the status of a research task
   */
  async getResearchStatus(taskId: string): Promise<ResearchResponse> {
    // Ensure service is running
    const ready = await this.initService();
    if (!ready) {
      throw new Error('DeerFlow service is not available');
    }

    try {
      const response = await axios.get(`${DEERFLOW_SERVICE_URL}/research/${taskId}`);
      return this.formatResponse(response.data);
    } catch (error: any) {
      log(`Error getting research status: ${error.message}`, 'deerflow');
      throw new Error(`Failed to get research status: ${error.message}`);
    }
  }

  /**
   * Run a complete research task (start and wait for completion)
   */
  async runCompleteResearch(request: ResearchRequest): Promise<ResearchResponse> {
    // Ensure service is running
    const ready = await this.initService();
    if (!ready) {
      throw new Error('DeerFlow service is not available');
    }

    try {
      const response = await axios.post(`${DEERFLOW_SERVICE_URL}/research/complete`, request);
      return this.formatResponse(response.data);
    } catch (error: any) {
      log(`Error running complete research: ${error.message}`, 'deerflow');
      throw new Error(`Failed to run complete research: ${error.message}`);
    }
  }

  /**
   * Stop the DeerFlow service
   */
  async stopService(): Promise<boolean> {
    if (!this.serviceReady) {
      return true; // Service not running
    }

    try {
      const scriptPath = path.join(process.cwd(), 'stop-deerflow.sh');
      
      // Make sure the script is executable
      try {
        fs.chmodSync(scriptPath, '755');
      } catch (error) {
        log(`Error making script executable: ${error}`, 'deerflow');
      }
      
      const stopProcess = spawn(scriptPath, [], {
        stdio: 'ignore'
      });
      
      return new Promise<boolean>((resolve) => {
        stopProcess.on('exit', () => {
          this.serviceReady = false;
          this.serviceProcess = null;
          resolve(true);
        });
        
        // Set a timeout in case the stop script hangs
        setTimeout(() => {
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      log(`Error stopping DeerFlow service: ${error}`, 'deerflow');
      return false;
    }
  }

  /**
   * Format the response from the DeerFlow service
   */
  private formatResponse(data: any): ResearchResponse {
    // Convert field names to match our frontend expectations
    return {
      id: data.id,
      query: data.query,
      summary: data.summary,
      sources: Array.isArray(data.sources) ? data.sources : [],
      insights: Array.isArray(data.insights) ? data.insights : [],
      relatedTopics: data.related_topics || [],
      status: data.status,
      error: data.error,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    };
  }
}

// Create singleton instance
export const deerflowBridge = new DeerFlowBridge();