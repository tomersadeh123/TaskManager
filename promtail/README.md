# Promtail Configuration

This directory contains the configuration files for Promtail to ship logs to Grafana Cloud.

## Setup Instructions

1. **Copy the template config:**
   ```bash
   cp config.template.yaml config.yaml
   ```

2. **Set up environment variable:**
   Add your Grafana Loki URL to your `.env.local` file:
   ```
   GRAFANA_LOKI_URL=https://YOUR_USER_ID:YOUR_API_TOKEN@YOUR_GRAFANA_INSTANCE/api/prom/push
   ```

3. **Replace placeholder in config.yaml:**
   The template uses `${GRAFANA_LOKI_URL}` as a placeholder. You can either:
   - Manually replace it with your actual URL in `config.yaml`
   - Use envsubst to substitute environment variables:
     ```bash
     envsubst < config.template.yaml > config.yaml
     ```

4. **Run Promtail:**
   ```bash
   ./promtail -config.file=config.yaml
   ```

## Security Note

- `config.yaml` is gitignored to prevent committing API tokens
- Always use `config.template.yaml` for version control
- Keep your API tokens in environment variables or secure configuration files