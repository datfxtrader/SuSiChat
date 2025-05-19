#!/bin/bash

# DeerFlow service runner script
# This script starts the DeerFlow research service on a specified port

PORT=${1:-8765}
LOG_FILE="deerflow.log"
PID_FILE=".deerflow.pid"

# Check if Python 3.11+ is available
python_version=$(python --version 2>&1 | awk '{print $2}')
py_major=$(echo $python_version | cut -d. -f1)
py_minor=$(echo $python_version | cut -d. -f2)

echo "Found Python version: $python_version"

if [ "$py_major" -lt 3 ] || ([ "$py_major" -eq 3 ] && [ "$py_minor" -lt 11 ]); then
  echo "Error: DeerFlow requires Python 3.11 or higher"
  exit 1
fi

# Check if we have a previously running instance and stop it
if [ -f "$PID_FILE" ]; then
  old_pid=$(cat $PID_FILE)
  if ps -p $old_pid > /dev/null; then
    echo "Stopping existing DeerFlow service (PID: $old_pid)"
    kill $old_pid
    sleep 2
  fi
  rm -f $PID_FILE
fi

echo "Starting DeerFlow research service on port $PORT..."

# Start DeerFlow service using our Python FastAPI service
nohup python server/deerflow-integration/deerflow_service.py --port $PORT > $LOG_FILE 2>&1 &

# Save PID for later management
echo $! > $PID_FILE

echo "DeerFlow service started (PID: $(cat $PID_FILE))"
echo "Logs available in: $LOG_FILE"