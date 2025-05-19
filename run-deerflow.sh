#!/bin/bash

# DeerFlow Service Runner Script
# This script starts the DeerFlow service as a background process

echo "Starting DeerFlow research service..."

# Check for Python environment
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not found. Please install Python 3."
    exit 1
fi

# Create a virtual environment if it doesn't exist
if [ ! -d "deerflow-venv" ]; then
    echo "Creating virtual environment for DeerFlow..."
    python3 -m venv deerflow-venv
fi

# Activate the virtual environment
source deerflow-venv/bin/activate

# Install dependencies if needed
echo "Installing required packages..."
pip install fastapi uvicorn asyncio

# Check if the service is already running
if [ -f ".deerflow.pid" ]; then
    PID=$(cat .deerflow.pid)
    if ps -p $PID > /dev/null; then
        echo "DeerFlow service is already running (PID: $PID)"
        echo "Use ./stop-deerflow.sh to stop it first"
        exit 0
    else
        echo "Removing stale PID file"
        rm .deerflow.pid
    fi
fi

# Start the service
echo "Starting DeerFlow service in background mode..."
cd server/deerflow-integration
nohup python3 deerflow_service.py > ../../deerflow.log 2>&1 &
PID=$!
cd ../..

# Save the PID
echo $PID > .deerflow.pid
echo "DeerFlow service started with PID: $PID"
echo "Logs are available in deerflow.log"

# Wait a moment to ensure it's running properly
sleep 2

# Check if the service is running
if ps -p $PID > /dev/null; then
    echo "DeerFlow service is running successfully!"
    echo "API available at: http://localhost:8000"
else
    echo "DeerFlow service failed to start. Check deerflow.log for details."
    rm .deerflow.pid
    exit 1
fi