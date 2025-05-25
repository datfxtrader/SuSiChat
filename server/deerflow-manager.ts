/**
 * DeerFlow Service Manager
 * 
 * This module handles starting, stopping, and checking the status of the DeerFlow Python service.
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

export class DeerFlowManager {
  private static readonly DEERFLOW_PORT = process.env.DEERFLOW_PORT || 9000;
  private static readonly DEERFLOW_HOST = '0.0.0.0';
  private static readonly HEALTH_CHECK_URL = `http://${DeerFlowManager.DEERFLOW_HOST}:${DeerFlowManager.DEERFLOW_PORT}/health`;
  private static deerflowProcess: ChildProcess | null = null;
  private static readonly MAX_STARTUP_RETRIES = 5;
  private static readonly RETRY_INTERVAL_MS = 2000;

  static async checkDeerFlowService(): Promise<boolean> {
    try {
      console.log(`🔍 Checking DeerFlow health at ${DeerFlowManager.HEALTH_CHECK_URL}`);

      const response = await axios.get(DeerFlowManager.HEALTH_CHECK_URL, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      });

      console.log(`✅ DeerFlow health check response:`, response.data);
      return response.data?.status === 'ok' || response.data?.status === 'healthy';
    } catch (error) {
      console.log(`⚠️ DeerFlow health check failed:`, error.message);
      return false;
    }
  }

  /**
   * Start the DeerFlow Python service if it's not already running
   */
  static async startDeerFlowService(): Promise<boolean> {
    console.log('Attempting to start DeerFlow service...');

    // Check if already running
    if (await DeerFlowManager.checkDeerFlowService()) {
      console.log('DeerFlow service is already running');
      return true;
    }

    // Start the process if it's not already started
    if (!DeerFlowManager.deerflowProcess) {
      console.log('Spawning new DeerFlow process...');

      try {
        // Spawn the comprehensive DeerFlow agent system for full capabilities
        DeerFlowManager.deerflowProcess = spawn('python', ['./deerflow_service/server.py'], {
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',  // Force unbuffered output for more immediate logs
            // Ensure API keys are passed to the Python process
            TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
            BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || ''
          },
          stdio: ['ignore', 'pipe', 'pipe']
        });

        // Handle process output
        DeerFlowManager.deerflowProcess.stdout?.on('data', (data: Buffer) => {
          console.log(`DeerFlow stdout: ${data.toString().trim()}`);
        });

        DeerFlowManager.deerflowProcess.stderr?.on('data', (data: Buffer) => {
          console.error(`DeerFlow stderr: ${data.toString().trim()}`);
        });

        // Handle process exit
        DeerFlowManager.deerflowProcess.on('exit', (code) => {
          console.log(`DeerFlow process exited with code ${code}`);
          DeerFlowManager.deerflowProcess = null;
        });

        // Check if service starts properly
        for (let i = 0; i < DeerFlowManager.MAX_STARTUP_RETRIES; i++) {
          await new Promise(resolve => setTimeout(resolve, DeerFlowManager.RETRY_INTERVAL_MS));
          if (await DeerFlowManager.checkDeerFlowService()) {
            console.log('DeerFlow service successfully started');
            return true;
          }
          console.log(`Waiting for DeerFlow service to start (attempt ${i + 1}/${DeerFlowManager.MAX_STARTUP_RETRIES})...`);
        }

        // If we reach here, service failed to start
        console.error('Failed to start DeerFlow service after multiple attempts');
        DeerFlowManager.stopDeerFlowService();
        return false;
      } catch (err) {
        console.error('Error starting DeerFlow service:', err);
        DeerFlowManager.stopDeerFlowService();
        return false;
      }
    }

    return false;
  }

  /**
   * Stop the DeerFlow service if it's running
   */
  static stopDeerFlowService(): void {
    if (DeerFlowManager.deerflowProcess) {
      console.log('Stopping DeerFlow service...');
      DeerFlowManager.deerflowProcess.kill();
      DeerFlowManager.deerflowProcess = null;
    }
  }
}

export const getDeerFlowServiceUrl = () => {
  return `http://${DeerFlowManager.DEERFLOW_HOST}:${DeerFlowManager.DEERFLOW_PORT}`;
};