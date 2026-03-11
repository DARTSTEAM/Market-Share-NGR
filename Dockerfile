# Use Node.js LTS
FROM node:20-slim

# Install git and other utilities if needed
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Ensure the server port is dynamic for Cloud Run
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Command to run the server
CMD ["node", "server/index.mjs"]
