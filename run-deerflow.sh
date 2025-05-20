#!/bin/bash

# Script to start the DeerFlow research microservice

# Ensure we exit on any errors
set -e

echo "Starting DeerFlow Research Microservice..."

# Make sure Python 3 is available
if ! command -v python3 &>/dev/null; then
    echo "Python 3 is required but not found. Please install Python 3."
    exit 1
fi

# Export environment variables for the service
export PYTHONPATH=$PYTHONPATH:./deerflow-service

# Install required packages directly
echo "Installing basic required packages..."
pip install fastapi uvicorn httpx langgraph langchain-core

# Start the DeerFlow service
echo "Starting DeerFlow service on port 8000..."
cd deerflow-service
python3 main.py --host 0.0.0.0 --port 8000