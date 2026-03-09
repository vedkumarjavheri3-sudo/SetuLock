FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package info
COPY package*.json ./

# Install dependencies securely
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose API port
EXPOSE 3000

# Run PM2 or simple node server
# In production, we'd use PM2 for cluster mode if not relying on Docker swarm/k8s replicas.
# For Docker simplicity, running directly:
CMD [ "node", "server.js" ]
