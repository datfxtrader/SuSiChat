#!/bin/bash

# DeerFlow Research Service Shutdown Script
echo "Stopping DeerFlow Research Service..."

# Get the PID from the file
PID_FILE=".deerflow.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat $PID_FILE)
  
  # Check if the process is running
  if ps -p $PID > /dev/null; then
    echo "Stopping DeerFlow service (PID: $PID)..."
    kill $PID
    
    # Wait for process to terminate
    for i in {1..5}; do
      if ! ps -p $PID > /dev/null; then
        break
      fi
      echo "Waiting for process to terminate... ($i/5)"
      sleep 1
    done
    
    # Force kill if still running
    if ps -p $PID > /dev/null; then
      echo "Process still running, forcing termination..."
      kill -9 $PID
    fi
    
    echo "DeerFlow service stopped"
  else
    echo "No running DeerFlow service found with PID $PID"
  fi
  
  # Remove the PID file
  rm $PID_FILE
  echo "Removed PID file"
else
  echo "No PID file found. DeerFlow service may not be running."
fi