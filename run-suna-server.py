import os
import subprocess
import sys
import time
import signal

# Get the DeepSeek API key from environment
deepseek_api_key = os.environ.get("DEEPSEEK_API_KEY")
if not deepseek_api_key:
    print("Error: DEEPSEEK_API_KEY environment variable is not set")
    sys.exit(1)

print("Starting Suna backend service with DeepSeek integration...")
print(f"API key available: {'Yes' if deepseek_api_key else 'No'}")

# Set environment variables for the subprocess
env = os.environ.copy()
env["PYTHONUNBUFFERED"] = "1"  # Ensure Python output is not buffered

# Create the command to run
cmd = ["python", "run-minimal.py"]

# Function to handle exit signals
def signal_handler(sig, frame):
    print("Stopping Suna backend service...")
    if suna_process:
        suna_process.terminate()
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Start the Suna backend
os.chdir("suna-repo")
suna_process = subprocess.Popen(cmd, env=env)

print(f"Suna backend started with PID: {suna_process.pid}")
print("Suna service should be available at: http://localhost:8000")

try:
    # Keep the script running until manually terminated
    while True:
        time.sleep(1)
        # Check if process is still running
        if suna_process.poll() is not None:
            print(f"Suna process exited with code: {suna_process.returncode}")
            print("Attempting to restart...")
            suna_process = subprocess.Popen(cmd, env=env)
            print(f"Suna backend restarted with PID: {suna_process.pid}")
except KeyboardInterrupt:
    signal_handler(signal.SIGINT, None)