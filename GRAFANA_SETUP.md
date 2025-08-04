# Grafana Logging Setup - Complete Guide

## ✅ What's Been Completed

### 1. Logger Implementation
- ✅ Comprehensive logger in `lib/logger.ts` with JSON formatting
- ✅ Separate log files: `app.log`, `error.log`, `access.log`
- ✅ Structured logging with timestamps, levels, and metadata

### 2. Promtail Configuration
- ✅ Downloaded Promtail binary (`promtail/promtail`)
- ✅ Configured `promtail/config.yaml` with your Grafana Cloud URL
- ✅ Created startup script (`promtail/start-promtail.sh`)
- ✅ Tested connection - Promtail successfully reads and ships logs

### 3. Enhanced API Logging
- ✅ Added comprehensive logging to dashboard and bills routes
- ✅ Request/response logging with timing
- ✅ Business event logging for user actions
- ✅ Error logging with stack traces

### 4. Environment Setup
- ✅ Grafana URL stored securely in `.env.local`
- ✅ Promtail config gitignored for security

## 🚀 How to Start Seeing Logs in Grafana

### Step 1: Start Your Next.js Application
```bash
npm run dev
```

### Step 2: Start Promtail (in a separate terminal)
```bash
# Option 1: Use the startup script
./promtail/start-promtail.sh

# Option 2: Run directly
cd promtail && ./promtail -config.file=config.yaml
```

### Step 3: Generate Some Logs
- Open your app at http://localhost:3000
- Login to your account
- Navigate through the app (dashboard, create bills, tasks, etc.)
- Each action will generate structured logs

### Step 4: View Logs in Grafana Cloud
1. Go to your Grafana Cloud instance
2. Navigate to **Explore** or **Dashboards**
3. Select **Loki** as your data source
4. Use these LogQL queries:

```logql
# All application logs
{job="nextjs-app"}

# Error logs only
{job="nextjs-errors"} |= "ERROR"

# HTTP requests by status code
{job="nextjs-access"} | json | __error__=""

# Business events
{job="nextjs-app"} |= "Business Event"

# API response times > 1 second
{job="nextjs-access"} | json | duration > 1000
```

## 📊 Sample Dashboard Queries

### Key Metrics:
- **Request Rate**: `sum(rate({job="nextjs-access"}[5m]))`
- **Error Rate**: `sum(rate({job="nextjs-errors"}[5m]))`
- **Response Time**: `avg_over_time({job="nextjs-access"} | json | duration [5m])`
- **User Activity**: `sum by (userId) (count_over_time({job="nextjs-app"} |= "Business Event" [1h]))`

## 🔧 Troubleshooting

### If logs aren't appearing:
1. Check Promtail is running: look for "Adding target" messages
2. Verify log files exist: `ls -la logs/`
3. Check Promtail connectivity: look for HTTP errors in Promtail output
4. Ensure your Grafana URL is correct in the config

### Common Issues:
- **Permission errors**: Make sure `promtail` binary is executable
- **Config errors**: Validate YAML syntax in `config.yaml`
- **Network issues**: Check firewall/proxy settings

## 📈 Next Steps for Production

### For Render Deployment:
1. Add `GRAFANA_LOKI_URL` to Render environment variables
2. Install Promtail in your Docker container
3. Run Promtail as a background process
4. Update log file paths for production environment

Your logging pipeline is now fully functional! 🎉