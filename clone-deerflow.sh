#!/bin/bash

echo "Cloning DeerFlow repository from GitHub..."
mkdir -p deerflow-repo
cd deerflow-repo
git clone https://github.com/kortixcorp/deerflow.git .

if [ $? -ne 0 ]; then
  echo "Error: Failed to clone DeerFlow repository"
  exit 1
fi

echo "Setting up DeerFlow Python environment..."
python -m pip install -r requirements.txt

echo "DeerFlow repository cloned and set up successfully!"