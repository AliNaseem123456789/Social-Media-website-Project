#!/bin/bash
echo "Starting deployment..."
cd /home/ubuntu/app
# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 019256649767.dkr.ecr.us-east-1.amazonaws.com

# Pull latest images (all 4)
echo "Pulling latest images from ECR..."
docker-compose pull

# Start containers
echo "Starting containers..."
docker-compose up -d

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

echo "========================================="
echo "Deployment complete!"
echo "========================================="

# Show running containers
echo ""
echo "Running containers:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Show health status
echo ""
echo "Container health status:"
docker ps --format "table {{.Names}}\t{{.Status}}"