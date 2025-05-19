#!/bin/bash

# Start the Suna backend service in the background
cd suna-repo
nohup python run-minimal.py > suna.log 2>&1 &
echo "Started Suna backend server with DeepSeek integration (PID: $!)"
echo "Logs are being written to suna-repo/suna.log"