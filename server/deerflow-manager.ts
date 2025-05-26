/**
 * DeerFlow Service Manager
 * 
 * This module handles starting, stopping, and checking the status of the DeerFlow Python service.
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

// Configuration
const DEERFLOW_PORTS = [9000, 9001, 9002, 9003, 9004]; // Try multiple ports
const DEERFLOW_HOST = 'localhost';

let activeDeerFlowUrl: string | null = null;

/**
 * Find the active DeerFlow service URL
 */
async function findActiveDeerFlowService(): Promise<string | null> {
  if (activeDeerFlowUrl) {
    try {
      const response = await axios.get(`${activeDeerFlowUrl}/health`, { timeout: 3000 });
      if (response.status === 200) return activeDeerFlowUrl;
    } catch (error) {
      activeDeerFlowUrl = null;
    }
  }

  for (const port of DEERFLOW_PORTS) {
    const url = `http://${DEERFLOW_HOST}:${port}`;
    try {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      if (response.status === 200) {
        activeDeerFlowUrl = url;
        return url;
      }
    } catch (error) {
      continue;
    }
  }
  return null;
}

/**
 * Check if the DeerFlow service is running
 */
export async function checkDeerFlowService(): Promise<boolean> {
  const url = await findActiveDeerFlowService();
  return url !== null;
}

const MAX_STARTUP_RETRIES = 5;
const RETRY_INTERVAL_MS = 2000;

// Global state
let deerflowProcess: ChildProcess | null = null;



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
      deerflowProcess = spawn('python', ['./deerflow_service/server.py'], {
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
export function getDeerFlowServiceUrl(): string | null {
  return activeDeerFlowUrl;
}