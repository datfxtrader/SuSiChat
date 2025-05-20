#!/bin/bash

# Script to run the DeerFlow research service

echo "Starting DeerFlow Research Service on port 8000..."
python3 deerflow-server.py --host 0.0.0.0 --port 8000