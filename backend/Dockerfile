# Use official Node.js image
# FROM node:20-alpine
FROM public.ecr.aws/docker/library/node:20-alpine
# Set working directory inside container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install ONLY production dependencies (no dev tools)
RUN npm ci --only=production

# Copy all application code
COPY . .

# Create non-root user for security (inside container only)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Switch to non-root user
USER nodejs

# Expose the port your backend uses (usually 3000)
EXPOSE 5000
CMD ["node", "server.js"]