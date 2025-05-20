#!/bin/bash

# This script runs the DeerFlow service for advanced research capabilities
echo "Starting DeerFlow Research Service on port 8000..."
exec python3 deerflow-server.py --host 0.0.0.0 --port 8000