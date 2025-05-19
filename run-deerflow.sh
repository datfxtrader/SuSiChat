#!/bin/bash

# DeerFlow Research Service Startup Script
echo "Starting DeerFlow Research Service..."

# Create virtual environment if it doesn't exist
if [ ! -d "deerflow-venv" ]; then
  echo "Creating virtual environment for DeerFlow..."
  python3 -m venv deerflow-venv
fi

# Activate virtual environment
source deerflow-venv/bin/activate

# Install required packages
pip install fastapi uvicorn pydantic python-dotenv

# Store the process ID
mkdir -p .tmp
PID_FILE=".deerflow.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat $PID_FILE)
  if ps -p $PID > /dev/null; then
    echo "DeerFlow service is already running with PID $PID"
    exit 0
  else
    echo "Removing stale PID file"
    rm $PID_FILE
  fi
fi

# Run the service in the background
cd $(dirname $0)
nohup python -m server.deerflow-integration.deerflow_service > deerflow.log 2>&1 &

# Save the PID
echo $! > $PID_FILE
echo "DeerFlow service started with PID $!"
echo "Logs will be written to deerflow.log"