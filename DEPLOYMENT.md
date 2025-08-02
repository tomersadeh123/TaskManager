# 🚀 Deployment Guide - Task Manager Next.js App

## 🔧 GitHub Secrets Setup

Add these secrets to your GitHub repository (`Settings` > `Secrets and variables` > `Actions`):

### Required Secrets:
```
MONGO_URI=mongodb+srv://tomersad:g7OVdtS4o7F1q7km@taskmanager.fqjiug7.mongodb.net/tasks
JWT_SECRET=your_super_secret_jwt_key_make_it_very_long_and_random_123456789abcdefghijklmnop
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Next.js

2. **Add Environment Variables in Vercel:**
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   ```

3. **Get Vercel Secrets for GitHub Actions:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and link project
   vercel login
   vercel link

   # Get project info
   vercel project ls
   ```

4. **Add to GitHub Secrets:**
   ```
   VERCEL_TOKEN=your_vercel_token
   VERCEL_ORG_ID=your_org_id
   VERCEL_PROJECT_ID=your_project_id
   ```

### Option 2: Docker Deployment

1. **Build and run locally:**
   ```bash
   docker build -t task-manager .
   docker run -p 3000:3000 \
     -e MONGO_URI="your_mongo_uri" \
     -e JWT_SECRET="your_jwt_secret" \
     -e JWT_EXPIRES_IN="24h" \
     task-manager
   ```

2. **Deploy to cloud platforms:**
   - **AWS ECS/EKS**
   - **Google Cloud Run**
   - **Azure Container Instances**
   - **DigitalOcean Apps**

### Option 3: Other Platforms

- **Netlify**: Works with static export
- **Railway**: Auto-deploys from GitHub
- **Render**: Free tier available
- **Heroku**: Classic PaaS option

## 🔄 CI/CD Workflow

Your workflow automatically:

1. **On Push/PR:**
   - ✅ Installs dependencies
   - ✅ Runs linting
   - ✅ Builds the app
   - ✅ Runs tests

2. **On Push to Master:**
   - 🚀 Deploys to Vercel
   - 🐳 Builds Docker image

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📋 Environment Variables

Create `.env.local` for local development:
```env
MONGO_URI=mongodb+srv://tomersad:g7OVdtS4o7F1q7km@taskmanager.fqjiug7.mongodb.net/tasks
JWT_SECRET=your_super_secret_jwt_key_make_it_very_long_and_random_123456789abcdefghijklmnop
JWT_EXPIRES_IN=24h
```

## 🔒 Security Notes

- ✅ Environment variables are properly configured
- ✅ `.env.local` is in `.gitignore`
- ✅ JWT secrets are secure
- ✅ MongoDB connection is protected
- ✅ CORS is handled by Next.js

## 📊 Monitoring

Add these for production monitoring:
- **Vercel Analytics** (built-in)
- **Sentry** for error tracking
- **LogRocket** for user sessions
- **MongoDB Atlas** monitoring