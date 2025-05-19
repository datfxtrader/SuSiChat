#!/bin/bash

# This script runs the Suna backend with DeepSeek integration

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Set up Python environment
export PYTHONUNBUFFERED=1

# Run the minimal Suna backend
cd suna-repo
python run-minimal.py