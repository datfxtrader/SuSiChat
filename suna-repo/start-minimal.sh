#!/bin/bash
# Script to start the minimal Suna backend for Tongkeeper integration

echo "Starting minimal Suna backend..."
cd "$(dirname "$0")"

# Export the DeepSeek API key from parent environment if available
if [ -n "$DEEPSEEK_API_KEY" ]; then
  export DEEPSEEK_API_KEY
fi

# Start the minimal Suna backend
python3 run-minimal.py