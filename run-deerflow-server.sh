#!/bin/bash

# DeerFlow server startup script
PORT=${1:-8765}
DEERFLOW_DIR="deerflow"
LOG_FILE="deerflow.log"
PID_FILE=".deerflow.pid"

echo "Starting DeerFlow server on port $PORT..."

# Check if we have a previously running instance and stop it
if [ -f "$PID_FILE" ]; then
  old_pid=$(cat $PID_FILE)
  if ps -p $old_pid > /dev/null; then
    echo "Stopping existing DeerFlow server (PID: $old_pid)"
    kill $old_pid
    sleep 2
  fi
  rm -f $PID_FILE
fi

# Start DeerFlow server
cd $DEERFLOW_DIR
nohup python3.12 server.py --port $PORT > ../$LOG_FILE 2>&1 &

# Save PID for later management
echo $! > ../$PID_FILE

echo "DeerFlow server started (PID: $(cat ../$PID_FILE))"
echo "Logs available in: $LOG_FILE"