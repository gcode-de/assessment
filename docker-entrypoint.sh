#!/bin/sh
set -e

echo "Starting CSV Viewer application..."

# Start the backend server
echo "Starting backend server on port 3000..."
cd /app/backend
node dist/index.js &
BACKEND_PID=$!

# Wait for the application to start
sleep 2

# Keep the container running
wait $BACKEND_PID
