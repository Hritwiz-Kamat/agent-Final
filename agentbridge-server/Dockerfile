FROM node:20-slim

# Install dependencies for Lightpanda install script
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*

# Install Lightpanda binary
RUN curl -fsSL https://pkg.lightpanda.io/install.sh | bash

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/

EXPOSE 3100
EXPOSE 9222

# Start Lightpanda CDP server in background, then start AgentBridge
CMD lightpanda serve --host 0.0.0.0 --port 9222 --obey-robots & \
    node dist/index.js serve --port 3100
