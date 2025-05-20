// server/deerflow-manager.ts
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import path from 'path';

const DEERFLOW_PORT = 8765;
const DEERFLOW_URL = `http://localhost:${DEERFLOW_PORT}`;
let deerflowProcess: ChildProcess | null = null;
let isStarting = false;

const pythonExecutable = 'python3';
const deerflowScriptPath = path.join(process.cwd(), 'deerflow_service', 'server.py');
const deerflowCwd = path.join(process.cwd(), 'deerflow_service');

/**
 * Check if the DeerFlow service is healthy and running
 */
export async function checkDeerFlowService(): Promise<boolean> {
  if (isStarting) return false;
  try {
    const response = await axios.get(`${DEERFLOW_URL}/health`, { timeout: 2000 });
    return response.status === 200 && response.data.status === 'ok';
  } catch (error) {
    console.log('DeerFlow health check failed:', error.message);
    return false;
  }
}

/**
 * Start the DeerFlow Python service if it's not already running
 */
export async function startDeerFlowService(): Promise<boolean> {
  if (await checkDeerFlowService()) {
    console.log('DeerFlow service already running.');
    return true;
  }
  
  if (isStarting) {
    console.log('DeerFlow service startup already in progress.');
    return false;
  }
  
  isStarting = true;
  console.log('Starting DeerFlow service...');

  return new Promise((resolve, reject) => {
    try {
      // Forward all environment variables to the Python process, including API keys
      deerflowProcess = spawn(pythonExecutable, [deerflowScriptPath], {
        cwd: deerflowCwd,
        env: { 
          ...process.env,
          PYTHONUNBUFFERED: "1" // Ensures Python prints output immediately
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Handle process output for logging
      deerflowProcess.stdout?.on('data', (data: Buffer) => {
        console.log(`DeerFlow: ${data.toString().trim()}`);
      });

      deerflowProcess.stderr?.on('data', (data: Buffer) => {
        console.error(`DeerFlow Error: ${data.toString().trim()}`);
      });

      // Handle process errors
      deerflowProcess.on('error', (err) => {
        console.error('Failed to start DeerFlow subprocess:', err);
        isStarting = false;
        deerflowProcess = null;
        reject(err);
      });

      // Handle process exit
      deerflowProcess.on('exit', (code, signal) => {
        console.log(`DeerFlow process exited with code ${code} signal ${signal}`);
        deerflowProcess = null;
        
        if (isStarting) {
          isStarting = false;
          // The health check interval will handle rejecting the promise
        }
      });

      // Check if service has started properly
      let retries = 0;
      const maxRetries = 30; // Increased for potentially slow startup
      const checkInterval = setInterval(async () => {
        const isRunning = await checkDeerFlowService();
        
        if (isRunning) {
          clearInterval(checkInterval);
          console.log('DeerFlow service started successfully.');
          isStarting = false;
          resolve(true);
        } else if (retries >= maxRetries || (!deerflowProcess && isStarting)) {
          clearInterval(checkInterval);
          const errorMessage = deerflowProcess 
            ? 'Health check timeout.' 
            : 'Process died during startup.';
          
          console.error('Failed to start DeerFlow service:', errorMessage);
          isStarting = false;
          
          if (deerflowProcess) {
            deerflowProcess.kill();
            deerflowProcess = null;
          }
          
          reject(new Error(`Failed to start DeerFlow service: ${errorMessage}`));
        }
        
        retries++;
      }, 2000); // Check every 2 seconds
    } catch (error) {
      console.error("Error spawning DeerFlow service:", error);
      isStarting = false;
      reject(error);
    }
  });
}

/**
 * Stop the DeerFlow service if it's running
 */
export function stopDeerFlowService(): void {
  if (deerflowProcess) {
    console.log('Stopping DeerFlow service...');
    deerflowProcess.kill('SIGTERM');
    deerflowProcess = null;
  }
  isStarting = false;
}

// Ensure proper cleanup on application shutdown
process.on('exit', stopDeerFlowService);
process.on('SIGINT', () => { stopDeerFlowService(); process.exit(); });
process.on('SIGTERM', () => { stopDeerFlowService(); process.exit(); });