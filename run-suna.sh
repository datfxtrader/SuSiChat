#!/bin/bash

# Export the DeepSeek API key from the environment
export DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY

# Run the minimal Suna backend on port 8000
cd suna-repo
python run-minimal.py