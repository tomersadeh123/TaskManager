#!/bin/bash

echo "Downloading Promtail for local development..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PROMTAIL_URL="https://github.com/grafana/loki/releases/latest/download/promtail-darwin-amd64.zip"
    PROMTAIL_FILE="promtail-darwin-amd64.zip"
    PROMTAIL_BINARY="promtail-darwin-amd64"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    PROMTAIL_URL="https://github.com/grafana/loki/releases/latest/download/promtail-linux-amd64.zip"
    PROMTAIL_FILE="promtail-linux-amd64.zip"
    PROMTAIL_BINARY="promtail-linux-amd64"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

# Change to promtail directory
cd "$(dirname "$0")"

# Download if not exists
if [[ ! -f "promtail" ]]; then
    echo "Downloading from $PROMTAIL_URL..."
    curl -O -L "$PROMTAIL_URL"
    
    echo "Extracting..."
    unzip "$PROMTAIL_FILE"
    
    echo "Setting up binary..."
    chmod +x "$PROMTAIL_BINARY"
    mv "$PROMTAIL_BINARY" promtail
    
    echo "Cleaning up..."
    rm "$PROMTAIL_FILE"
    
    echo "✅ Promtail downloaded successfully!"
else
    echo "✅ Promtail already exists"
fi