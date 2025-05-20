#!/bin/bash
# Start the minimal DeerFlow research service

echo "Starting DeerFlow minimal research service..."
cd "$(dirname "$0")"

# Make sure API keys are available to the service
export TAVILY_API_KEY=${TAVILY_API_KEY}
export BRAVE_API_KEY=${BRAVE_API_KEY}
export DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}

# Start the service in the background
python run-deerflow-minimal.py &

# Save the PID to kill it later if needed
echo $! > deerflow-minimal.pid
echo "DeerFlow minimal service started with PID: $!"