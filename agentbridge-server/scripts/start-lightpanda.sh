#!/usr/bin/env bash

# AgentBridge Server — Start Lightpanda Helper
# Starts Lightpanda locally via Docker if on Windows/Mac, or direct binary on Linux
# Port 9222 will be exposed

echo "Starting Lightpanda on ws://127.0.0.1:9222..."

if command -v lightpanda >/dev/null 2>&1; then
  echo "Found local Lightpanda binary. Starting..."
  lightpanda serve --host 127.0.0.1 --port 9222 --obey-robots
else
  echo "Local Lightpanda binary not found."
  echo "Starting via Docker..."
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: Docker is not installed and lightpanda binary is missing."
    exit 1
  fi
  
  docker run -d --rm \
    --name agentbridge-lightpanda \
    -p 9222:9222 \
    lightpanda/browser:nightly \
    serve --host 0.0.0.0 --port 9222 --obey-robots
    
  echo "Lightpanda is running via Docker."
  echo "To stop: docker stop agentbridge-lightpanda"
fi
