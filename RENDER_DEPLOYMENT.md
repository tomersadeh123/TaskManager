# Render Deployment with Grafana Logging

## 🚀 Deploy Your App with Logging to Render

### Step 1: Add Environment Variables in Render

Go to your Render dashboard → Your service → Environment and add:

```bash
# Required for Grafana logging
GRAFANA_LOKI_URL=https://1294788:glc_eyJvIjoiMTQ5OTg1MSIsIm4iOiJzdGFjay0xMzM2OTk0LWludGVncmF0aW9uLW15bmV4dHBvcmplY3QiLCJrIjoiNVJSWjF0RTFOSEg5WjE1STIzejVKTU8wIiwibSI6eyJyIjoicHJvZC11cy13ZXN0LTAifX0=@logs-prod-021.grafana.net/api/prom/push

# Your existing environment variables
MONGO_URI=mongodb+srv://tomersad:g7OVdtS4o7F1q7km@taskmanager.fqjiug7.mongodb.net/tasks
JWT_SECRET=your_super_secret_jwt_key_make_it_very_long_and_random_123456789abcdefghijklmnop
JWT_EXPIRES_IN=24h
CLOUDINARY_URL=cloudinary://457224212982251:0PbbpvU_Q84rHKd69VGq5My8BCQ@dlqwfvi9n
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=tomersadeh7@gmail.com
SMTP_PASSWORD=your-app-password
NODE_ENV=production
```

### Step 2: Deploy to Render

Your updated Dockerfile will automatically:
1. ✅ Download and install Promtail in the container
2. ✅ Copy the Promtail configuration  
3. ✅ Start both Promtail and your Next.js app
4. ✅ Ship logs to Grafana Cloud

### Step 3: Verify Deployment

After deployment:
1. Check Render logs for successful startup:
   ```
   Starting production server with logging...
   Configuring Promtail with environment variables...
   Starting Promtail...
   Starting Next.js application...
   ```

2. Use your production app to generate logs
3. Check Grafana Cloud for production logs with label `environment=production`

### Step 4: Monitor Production Logs

Use these LogQL queries in Grafana:

```logql
# Production logs only
{environment="production"}

# Production errors
{environment="production", job="nextjs-errors"}

# Production API performance
{environment="production", job="nextjs-access"} | json | duration > 500

# User activity in production
{environment="production"} |= "Business Event"
```

## 🔧 Troubleshooting Production

### Common Issues:

**1. Promtail not starting:**
- Check Render logs for Promtail error messages
- Verify `GRAFANA_LOKI_URL` environment variable is set correctly

**2. No logs appearing in Grafana:**
- Check if logs are being written: look for file creation messages
- Verify network connectivity from Render to Grafana Cloud

**3. Permission issues:**
- The Dockerfile handles all permissions automatically
- Logs directory is created with proper ownership

### Debug Commands (if needed):
If you need to debug, you can add temporary logging to the startup script:

```bash
# Add these lines to start-production.sh for debugging
echo "Environment variables:"
env | grep GRAFANA
echo "Log directory contents:"
ls -la /app/logs/
```

## 📊 Production Dashboard Setup

Once logs are flowing, create production dashboards with:

### Key Production Metrics:
- **Request Volume**: `sum(rate({environment="production", job="nextjs-access"}[5m]))`
- **Error Rate**: `sum(rate({environment="production", job="nextjs-errors"}[5m]))`
- **Response Times**: `histogram_quantile(0.95, sum(rate({environment="production", job="nextjs-access"} | json | duration [5m])) by (le))`
- **Active Users**: `count(count by (userId) ({environment="production"} |= "Business Event" | json | userId != ""))`

### Alerts to Set Up:
- High error rate (>5% of requests)
- Slow response times (>2s average)
- Application downtime
- Database connection failures

Your production app will now have comprehensive logging! 🎉

## 📈 Next Steps

1. **Create Dashboards**: Build comprehensive monitoring dashboards
2. **Set Up Alerts**: Configure alerts for critical issues
3. **Log Retention**: Configure log retention in Grafana Cloud
4. **Performance Monitoring**: Track key business metrics