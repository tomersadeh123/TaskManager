#!/bin/bash

# Start Promtail to ship logs to Grafana Cloud
# Run this script to start shipping logs

echo "Starting Promtail..."
echo "Logs will be shipped to Grafana Cloud"
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"
./promtail -config.file=config.yaml