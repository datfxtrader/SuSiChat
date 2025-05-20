#!/bin/bash

# Script to start the DeerFlow research microservice

# Ensure we exit on any errors
set -e

echo "Starting DeerFlow Research Microservice..."

# Create a python virtual environment if it doesn't exist
if [ ! -d "deerflow-venv" ]; then
  echo "Creating Python virtual environment for DeerFlow..."
  python3 -m venv deerflow-venv
fi

# Activate the virtual environment
source deerflow-venv/bin/activate

# Install dependencies if needed
if [ ! -f "deerflow-venv/.initialized" ]; then
  echo "Installing DeerFlow dependencies..."
  cd deerflow-service
  pip install -e .
  touch ../deerflow-venv/.initialized
  cd ..
fi

# Export environment variables
export PYTHONPATH=$PYTHONPATH:./deerflow-service

# Start the DeerFlow service
cd deerflow-service
python main.py --host 0.0.0.0 --port 8000