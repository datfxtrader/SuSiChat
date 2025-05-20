#!/bin/bash
# Start the minimal DeerFlow research service

echo "Starting DeerFlow minimal research service..."
cd "$(dirname "$0")"

# Check if there's an existing process and kill it
if [ -f deerflow-minimal.pid ]; then
  OLD_PID=$(cat deerflow-minimal.pid)
  if ps -p $OLD_PID > /dev/null; then
    echo "Stopping existing DeerFlow process (PID: $OLD_PID)"
    kill $OLD_PID
    sleep 2
  fi
fi

# Make sure API keys are available to the service
export PYTHONUNBUFFERED=1
# Pass API keys explicitly rather than relying on environment inheritance
echo "Setting up API keys for DeerFlow service..."
echo "TAVILY_API_KEY availability: ${TAVILY_API_KEY:+available}"
echo "BRAVE_API_KEY availability: ${BRAVE_API_KEY:+available}"
echo "DEEPSEEK_API_KEY availability: ${DEEPSEEK_API_KEY:+available}"
export TAVILY_API_KEY="${TAVILY_API_KEY}"
export BRAVE_API_KEY="${BRAVE_API_KEY}"
export DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY}"

# Start the service in the background with output redirection
nohup python run-deerflow-minimal.py > deerflow-minimal.log 2>&1 &

# Save the PID to kill it later if needed
echo $! > deerflow-minimal.pid
echo "DeerFlow minimal service started with PID: $!"

# Give the service a moment to start up
echo "Waiting for service to initialize..."
sleep 3

# Check if the service is responding
if curl -s http://localhost:8000/health > /dev/null; then
  echo "DeerFlow service is running and healthy!"
else
  echo "Warning: DeerFlow service started but health check failed. Check logs for details."
  echo "Recent logs:"
  tail -n 10 deerflow-minimal.log
fi