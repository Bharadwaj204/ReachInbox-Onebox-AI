# Use Node.js 20 (required by cheerio and undici)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy configuration files needed for build
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy the rest of the application source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to slim down the image
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]