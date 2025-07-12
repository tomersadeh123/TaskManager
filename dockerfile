# Use the official Node.js image
FROM node:20.16.0-alpine

# Set environment to production
ENV NODE_ENV=production

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev

# Copy rest of the app code
COPY . .

# Change to non-root user (optional but good practice)
USER node

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
