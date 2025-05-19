#!/bin/bash

# DeerFlow Service Stop Script
# This script stops the DeerFlow service running in the background

echo "Stopping DeerFlow research service..."

# Check if the PID file exists
if [ ! -f ".deerflow.pid" ]; then
    echo "No DeerFlow service seems to be running (PID file not found)"
    exit 0
fi

# Read the PID
PID=$(cat .deerflow.pid)

# Check if the process is running
if ! ps -p $PID > /dev/null; then
    echo "Process with PID $PID is not running"
    rm .deerflow.pid
    exit 0
fi

# Kill the process
echo "Terminating DeerFlow service (PID: $PID)..."
kill $PID

# Wait for the process to terminate
sleep 2

# Check if it's still running
if ps -p $PID > /dev/null; then
    echo "Process did not terminate gracefully, forcing termination..."
    kill -9 $PID
    sleep 1
fi

# Remove the PID file
rm .deerflow.pid

echo "DeerFlow service stopped successfully!"