/**
 * DeerFlow Service Manager
 * 
 * This module handles starting, stopping, and checking the status of the DeerFlow Python service.
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

// Configuration
const DEERFLOW_PORT = 8000;
const DEERFLOW_URL = `http://localhost:${DEERFLOW_PORT}`;
const MAX_STARTUP_RETRIES = 5;
const RETRY_INTERVAL_MS = 2000;

// Global state
let deerflowProcess: ChildProcess | null = null;

/**
 * Check if the DeerFlow service is healthy and running
 */
export async function checkDeerFlowService(): Promise<boolean> {
  try {
    console.log(`Checking DeerFlow health at ${DEERFLOW_URL}/health`);
    const response = await axios.get(`${DEERFLOW_URL}/health`, { 
      timeout: 3000,
      validateStatus: () => true // Accept any status code to better diagnose issues
    });
    
    console.log('DeerFlow health check response:', response.status, response.data);
    return response.status === 200 && response.data?.status === 'ok';
  } catch (error) {
    console.log('DeerFlow health check failed:', error);
    return false;
  }
}

/**
 * Start the DeerFlow Python service if it's not already running
 */
export async function startDeerFlowService(): Promise<boolean> {
  console.log('Attempting to start DeerFlow service...');
  
  // Check if already running
  if (await checkDeerFlowService()) {
    console.log('DeerFlow service is already running');
    return true;
  }
  
  // Start the process if it's not already started
  if (!deerflowProcess) {
    console.log('Spawning new DeerFlow process...');
    
    try {
      // Spawn the comprehensive DeerFlow agent system for full capabilities
      deerflowProcess = spawn('python', ['deerflow_service/server.py'], {
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',  // Force unbuffered output for more immediate logs
          // Ensure API keys are passed to the Python process
          TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
          BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
          DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || ''
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Handle process output
      deerflowProcess.stdout?.on('data', (data: Buffer) => {
        console.log(`DeerFlow stdout: ${data.toString().trim()}`);
      });
      
      deerflowProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`DeerFlow stderr: ${data.toString().trim()}`);
      });
      
      // Handle process exit
      deerflowProcess.on('exit', (code) => {
        console.log(`DeerFlow process exited with code ${code}`);
        deerflowProcess = null;
      });
      
      // Check if service starts properly
      for (let i = 0; i < MAX_STARTUP_RETRIES; i++) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
        if (await checkDeerFlowService()) {
          console.log('DeerFlow service successfully started');
          return true;
        }
        console.log(`Waiting for DeerFlow service to start (attempt ${i + 1}/${MAX_STARTUP_RETRIES})...`);
      }
      
      // If we reach here, service failed to start
      console.error('Failed to start DeerFlow service after multiple attempts');
      stopDeerFlowService();
      return false;
    } catch (err) {
      console.error('Error starting DeerFlow service:', err);
      stopDeerFlowService();
      return false;
    }
  }
  
  return false;
}

/**
 * Stop the DeerFlow service if it's running
 */
export function stopDeerFlowService(): void {
  if (deerflowProcess) {
    console.log('Stopping DeerFlow service...');
    deerflowProcess.kill();
    deerflowProcess = null;
  }
}

/**
 * Get the URL to the DeerFlow service
 */
export function getDeerFlowServiceUrl(): string {
  return DEERFLOW_URL;
}