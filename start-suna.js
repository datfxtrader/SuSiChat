// This script starts the Suna backend service using your DeepSeek API key
import { spawn } from 'child_process';
const { env } = process;

console.log('Starting Suna backend service...');

// Make sure to pass the DeepSeek API key to the Suna process
const sunaEnv = {
  ...env,
  PYTHONUNBUFFERED: '1',  // This ensures Python output is not buffered
};

// Function to wait before starting process
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Start the Suna backend process with delay
const startSuna = async () => {
  console.log('Waiting for other services to initialize...');
  await wait(3000); // Wait 3 seconds before starting
  
  const suna = spawn('python', ['suna-repo/run-minimal.py'], { 
    env: sunaEnv,
    stdio: 'inherit' // Show output in the console
  });

  suna.on('error', (err) => {
    console.error('Failed to start Suna:', err);
  });

  return suna;
};

// Start Suna with delay
const suna = await startSuna();

suna.on('close', (code) => {
  console.log(`Suna backend process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down Suna backend...');
  suna.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down Suna backend...');
  suna.kill('SIGTERM');
  process.exit();
});