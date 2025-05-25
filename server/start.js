// server/start.js - Process orchestrator for Replit
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Replit services...');

// Function to start DeerFlow service on port 5000 (internal)
function startDeerFlowService() {
  console.log('🔗 Starting DeerFlow service on port 5000 (internal)...');
  
  const deerflowProcess = spawn('node', ['run-suna-minimal.py'], {
    env: { ...process.env, PORT: 5000, INTERNAL_SERVICE: 'true' },
    stdio: 'inherit',
    cwd: process.cwd()
  });

  deerflowProcess.on('error', (error) => {
    console.log('⚠️ DeerFlow service not available, will use fallback mode');
  });

  return deerflowProcess;
}

// Start DeerFlow service (optional - system works without it)
const deerflowProcess = startDeerFlowService();

// Give DeerFlow time to start, then start main server
setTimeout(() => {
  console.log('🚀 Starting main server on port 3000...');
  
  // Start main server on port 3000 (public)
  const mainProcess = spawn('node', ['server/main.js'], {
    env: { ...process.env, PORT: 3000 },
    stdio: 'inherit'
  });

  mainProcess.on('error', (error) => {
    console.error('❌ Main server failed:', error);
    process.exit(1);
  });

  // Handle process cleanup
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down services...');
    if (deerflowProcess) deerflowProcess.kill();
    mainProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down services...');
    if (deerflowProcess) deerflowProcess.kill();
    mainProcess.kill();
    process.exit(0);
  });

}, 2000);