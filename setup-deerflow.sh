#!/bin/bash

echo "Setting up DeerFlow with Python 3.12..."
cd deerflow

# Check Python version
python3.12 --version

echo "Installing DeerFlow dependencies..."
python3.12 -m pip install -e .

# Check if installation was successful
if [ $? -eq 0 ]; then
  echo "DeerFlow setup completed successfully!"
  echo "You can now use DeerFlow with Python 3.12"
else
  echo "Failed to install DeerFlow. Please check the error messages above."
fi