#!/bin/sh
set -e

echo "Starting production server with logging..."

# Create logs directory if it doesn't exist
mkdir -p /app/logs

# Replace environment variable in Promtail config
echo "Configuring Promtail with environment variables..."
envsubst < /app/promtail-config.yaml > /tmp/promtail-final.yaml

# Start Promtail in background
echo "Starting Promtail..."
/app/promtail -config.file=/tmp/promtail-final.yaml &
PROMTAIL_PID=$!

# Start Next.js application
echo "Starting Next.js application..."
exec node server.js