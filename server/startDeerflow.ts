/**
 * DeerFlow Python Service Launcher
 * 
 * This module ensures the DeerFlow Python service is running,
 * auto-spawning it if needed.
 */
import { spawn } from 'child_process';
import path from 'path';
import { log } from './logging';
import axios from 'axios';

// Configuration
const DEERFLOW_PORT = 8000;
const DEERFLOW_HOST = 'localhost';
const HEALTH_CHECK_INTERVAL = 5000; // 5 seconds
const MAX_RESTART_ATTEMPTS = 3;

let deerflowProcess: any = null;
let restartAttempts = 0;
let serviceUrl = `http://${DEERFLOW_HOST}:${DEERFLOW_PORT}`;

/**
 * Start the DeerFlow Python service
 */
function startDeerflowService(): void {
  try {
    // Path to the DeerFlow script
    const scriptPath = path.resolve(process.cwd(), 'deerflow-minimal.py');
    
    log('Starting DeerFlow Python service...', 'deerflow');
    
    // Spawn the Python process
    deerflowProcess = spawn('python3', [
      scriptPath,
      '--host', '0.0.0.0',
      '--port', DEERFLOW_PORT.toString()
    ], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Log stdout
    deerflowProcess.stdout.on('data', (data: Buffer) => {
      log(`DeerFlow service: ${data.toString().trim()}`, 'deerflow');
    });
    
    // Log stderr
    deerflowProcess.stderr.on('data', (data: Buffer) => {
      log(`DeerFlow service error: ${data.toString().trim()}`, 'deerflow');
    });
    
    // Handle process exit
    deerflowProcess.on('exit', (code: number) => {
      log(`DeerFlow service exited with code ${code}`, 'deerflow');
      deerflowProcess = null;
      
      // Auto-restart if unexpected exit
      if (code !== 0 && restartAttempts < MAX_RESTART_ATTEMPTS) {
        restartAttempts++;
        log(`Attempting to restart DeerFlow service (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`, 'deerflow');
        startDeerflowService();
      }
    });
    
    log(`DeerFlow service started with PID ${deerflowProcess.pid}`, 'deerflow');
  } catch (error) {
    log(`Failed to start DeerFlow service: ${error instanceof Error ? error.message : String(error)}`, 'deerflow');
  }
}

/**
 * Check if the DeerFlow service is healthy
 */
async function checkDeerflowHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Ensure the DeerFlow service is running
 */
export async function ensureDeerflow(): Promise<void> {
  // First check if service is already running
  const isHealthy = await checkDeerflowHealth();
  
  if (isHealthy) {
    log('DeerFlow service is already running', 'deerflow');
    return;
  }
  
  // Start the service if not running
  startDeerflowService();
  
  // Set up periodic health checks
  setInterval(async () => {
    const isHealthy = await checkDeerflowHealth();
    
    if (!isHealthy && !deerflowProcess && restartAttempts < MAX_RESTART_ATTEMPTS) {
      log('DeerFlow service is down, attempting to restart', 'deerflow');
      restartAttempts++;
      startDeerflowService();
    } else if (isHealthy) {
      // Reset restart counter if service is healthy
      restartAttempts = 0;
    }
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Update the DeerFlow service URL (used by other modules)
 */
export function getDeerflowServiceUrl(): string {
  return serviceUrl;
}