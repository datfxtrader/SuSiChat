
#!/bin/bash

echo "🚀 Starting DeerFlow service..."
cd "$(dirname "$0")"

# Check if there's an existing process and kill it
if [ -f deerflow.pid ]; then
  OLD_PID=$(cat deerflow.pid)
  if ps -p $OLD_PID > /dev/null; then
    echo "Stopping existing DeerFlow process (PID: $OLD_PID)"
    kill $OLD_PID
    sleep 2
  fi
fi

# Start the service
python deerflow_service/server.py &

# Save the PID
echo $! > deerflow.pid
echo "DeerFlow service started with PID: $!"

# Wait a moment for startup
sleep 3

# Check if the service is responding
if curl -s http://0.0.0.0:9000/health > /dev/null; then
  echo "✅ DeerFlow service is running and healthy!"
else
  echo "Warning: DeerFlow service started but health check failed"
fi
