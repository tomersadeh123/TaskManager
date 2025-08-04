#!/bin/bash

# Start Promtail to ship logs to Grafana Cloud
# Run this script to start shipping logs

echo "Starting Promtail..."
echo "Logs will be shipped to Grafana Cloud"
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"

# Check if binary exists
if [[ ! -f "promtail" ]]; then
    echo "Promtail binary not found. Running download script..."
    ./download-promtail.sh
fi

# Create config from template with environment variables
if [[ -f "../.env.local" ]]; then
    echo "Loading environment variables from .env.local..."
    source ../.env.local
fi

# Create config from template
echo "Creating config from template..."
envsubst < config.template.yaml > config.yaml

./promtail -config.file=config.yaml