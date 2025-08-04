# Promtail Configuration

This directory contains the configuration files for Promtail to ship logs to Grafana Cloud.

## 🚀 Quick Start

### For Local Development:
1. **Download Promtail:**
   ```bash
   ./download-promtail.sh
   ```

2. **Create config from template:**
   ```bash
   cp config.template.yaml config.yaml
   # Replace ${GRAFANA_LOKI_URL} with your actual URL
   ```

3. **Start Promtail:**
   ```bash
   ./start-promtail.sh
   ```

### For Production (Render):
The Dockerfile automatically handles Promtail download and setup. Just add `GRAFANA_LOKI_URL` to your environment variables.

## 📁 Files

- `config.template.yaml` - Template configuration (version controlled)
- `config.yaml` - Actual config with secrets (gitignored)
- `promtail` - Binary (gitignored, downloaded automatically)
- `start-promtail.sh` - Local startup script
- `download-promtail.sh` - Downloads Promtail binary

## 🔒 Security

- `config.yaml` and `promtail` binary are gitignored
- Use environment variables for secrets
- Template file is safe for version control