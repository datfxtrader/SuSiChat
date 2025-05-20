#!/bin/bash
# Start the DeerFlow research service

echo "Starting DeerFlow research service..."
cd "$(dirname "$0")"

# Make sure API keys are available to the service
export TAVILY_API_KEY=${TAVILY_API_KEY}
export BRAVE_API_KEY=${BRAVE_API_KEY}
export DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}

# Start the service in the background
python deerflow_service/server.py &

# Save the PID to kill it later if needed
echo $! > deerflow.pid
echo "DeerFlow service started with PID: $!"