#!/bin/sh
set -e

echo "Starting production server with logging..."

# Create logs directory if it doesn't exist
mkdir -p /app/logs

# Debug: Check if Promtail exists
echo "Checking for Promtail binary..."
if [ -f "/usr/local/bin/promtail" ]; then
    echo "✓ Promtail found at /usr/local/bin/promtail"
    PROMTAIL_PATH="/usr/local/bin/promtail"
elif [ -f "/app/promtail" ]; then
    echo "✓ Promtail found at /app/promtail"
    PROMTAIL_PATH="/app/promtail"
else
    echo "❌ Promtail binary not found! Listing available files:"
    ls -la /usr/local/bin/ | grep -i promtail || echo "No promtail in /usr/local/bin/"
    ls -la /app/ | grep -i promtail || echo "No promtail in /app/"
    echo "⚠️  Continuing without Promtail logging..."
    PROMTAIL_PATH=""
fi

# Replace environment variable in Promtail config
if [ -n "$PROMTAIL_PATH" ]; then
    echo "Configuring Promtail with environment variables..."
    envsubst < /app/promtail-config.yaml > /tmp/promtail-final.yaml

    # Start Promtail in background
    echo "Starting Promtail..."
    $PROMTAIL_PATH -config.file=/tmp/promtail-final.yaml &
    PROMTAIL_PID=$!
    echo "✓ Promtail started with PID $PROMTAIL_PID"
fi

# Start Next.js application
echo "Starting Next.js application..."
exec node server.js