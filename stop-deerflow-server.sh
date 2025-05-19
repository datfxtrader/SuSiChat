#!/bin/bash

# DeerFlow server stop script
PID_FILE=".deerflow.pid"

if [ -f "$PID_FILE" ]; then
  pid=$(cat $PID_FILE)
  if ps -p $pid > /dev/null; then
    echo "Stopping DeerFlow server (PID: $pid)..."
    kill $pid
    echo "DeerFlow server stopped successfully"
  else
    echo "No running DeerFlow server found with PID: $pid"
  fi
  rm -f $PID_FILE
else
  echo "No DeerFlow server PID file found"
fi