#!/bin/bash
set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# CONFIGURATION
# ========================================
AWS_ACCOUNT_ID="019256649767"
AWS_REGION="us-east-1"
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Image names
BACKEND_IMAGE="${ECR_URL}/my-app-backend:latest"
EMAIL_IMAGE="${ECR_URL}/my-app-email:latest"
ANALYTICS_IMAGE="${ECR_URL}/my-app-analytics-worker:latest"
FEED_IMAGE="${ECR_URL}/my-app-feed-worker:latest"

# Project directory
PROJECT_DIR="/home/ubuntu/apps/Social-Media-website-Project"

echo "========================================="
echo -e "${BLUE}🚀 DEPLOYING ALL SERVICES${NC}"
echo "========================================="
echo -e "${BLUE}Project directory: ${PROJECT_DIR}${NC}"

# ========================================
# 1. Login to ECR
# ========================================
echo ""
echo -e "${YELLOW}🔐 Logging in to Amazon ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to login to ECR!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Logged in to ECR${NC}"

# ========================================
# 2. Pull Latest Images
# ========================================
echo ""
echo -e "${YELLOW}📦 Pulling latest images from ECR...${NC}"

echo "Pulling backend..."
docker pull $BACKEND_IMAGE

echo "Pulling email service..."
docker pull $EMAIL_IMAGE

echo "Pulling analytics worker..."
docker pull $ANALYTICS_IMAGE

echo "Pulling feed worker..."
docker pull $FEED_IMAGE

echo -e "${GREEN}✅ All images pulled successfully${NC}"

# ========================================
# 3. Stop and Remove Old Containers
# ========================================
echo ""
echo -e "${YELLOW}🛑 Stopping old containers...${NC}"

docker stop backend-main 2>/dev/null || true
docker stop backend-email 2>/dev/null || true
docker stop analytics-worker 2>/dev/null || true
docker stop feed-worker 2>/dev/null || true

docker rm backend-main 2>/dev/null || true
docker rm backend-email 2>/dev/null || true
docker rm analytics-worker 2>/dev/null || true
docker rm feed-worker 2>/dev/null || true

echo -e "${GREEN}✅ Old containers removed${NC}"

# ========================================
# 4. Start Backend (with backend/.env)
# ========================================
echo ""
echo -e "${YELLOW}🚀 Starting backend...${NC}"

if [ -f "${PROJECT_DIR}/backend/.env" ]; then
    echo "Using ${PROJECT_DIR}/backend/.env"
    
    # Read env file and pass variables explicitly
    source "${PROJECT_DIR}/apps/.env"
    
    docker run -d \
        --name backend-main \
        -p 5000:5000 \
        --restart unless-stopped \
        -e SUPABASE_URL="${SUPABASE_URL}" \
        -e SUPABASE_KEY="${SUPABASE_KEY}" \
        -e DATABASE_URL="${DATABASE_URL}" \
        -e REDIS_URL="${REDIS_URL}" \
        -e RABBITMQ_URL="${RABBITMQ_URL}" \
        -e JWT_SECRET="${JWT_SECRET}" \
        -e AWS_REGION="${AWS_REGION}" \
        -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
        -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
        $BACKEND_IMAGE
else
    echo -e "${RED}❌ Error: ${PROJECT_DIR}/backend/.env not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend started${NC}"

# ========================================
# 5. Start Email Service (with email-microservice/.env)
# ========================================
echo ""
echo -e "${YELLOW}🚀 Starting email service...${NC}"

if [ -f "${PROJECT_DIR}/email-microservice/.env" ]; then
    echo "Using ${PROJECT_DIR}/email-microservice/.env"
    
    # Read env file and pass variables explicitly
    source "${PROJECT_DIR}/email-microservice/.env"
    
    docker run -d \
        --name backend-email \
        -p 5001:5001 \
        --restart unless-stopped \
        -e EMAIL_HOST="${EMAIL_HOST}" \
        -e EMAIL_PORT="${EMAIL_PORT}" \
        -e EMAIL_USER="${EMAIL_USER}" \
        -e EMAIL_PASS="${EMAIL_PASS}" \
        -e EMAIL_FROM="${EMAIL_FROM}" \
        -e RABBITMQ_URL="${RABBITMQ_URL}" \
        -e SUPABASE_URL="${SUPABASE_URL}" \
        -e SUPABASE_KEY="${SUPABASE_KEY}" \
        -e REDIS_URL="${REDIS_URL}" \
        -e AWS_REGION="${AWS_REGION}" \
        -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
        -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
        $EMAIL_IMAGE
else
    echo -e "${YELLOW}⚠️  Warning: Email .env not found. Using backend .env as fallback.${NC}"
    
    source "${PROJECT_DIR}/backend/.env"
    
    docker run -d \
        --name backend-email \
        -p 5001:5001 \
        --restart unless-stopped \
        -e RABBITMQ_URL="${RABBITMQ_URL}" \
        -e SUPABASE_URL="${SUPABASE_URL}" \
        -e SUPABASE_KEY="${SUPABASE_KEY}" \
        -e REDIS_URL="${REDIS_URL}" \
        -e AWS_REGION="${AWS_REGION}" \
        -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
        -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
        $EMAIL_IMAGE
fi

echo -e "${GREEN}✅ Email service started${NC}"

# ========================================
# 6. Start Analytics Worker (with explicit env variables)
# ========================================
echo ""
echo -e "${YELLOW}🚀 Starting analytics worker...${NC}"

# Load backend env for workers
source "${PROJECT_DIR}/backend/.env"

docker run -d \
    --name analytics-worker \
    --restart unless-stopped \
    -e SUPABASE_URL="${SUPABASE_URL}" \
    -e SUPABASE_KEY="${SUPABASE_KEY}" \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e REDIS_URL="${REDIS_URL}" \
    -e RABBITMQ_URL="${RABBITMQ_URL}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e AWS_REGION="${AWS_REGION}" \
    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    $ANALYTICS_IMAGE

echo -e "${GREEN}✅ Analytics worker started${NC}"

# ========================================
# 7. Start Feed Worker (with explicit env variables)
# ========================================
echo ""
echo -e "${YELLOW}🚀 Starting feed worker...${NC}"

# Load backend env for workers (already loaded, but re-source for safety)
source "${PROJECT_DIR}/backend/.env"

docker run -d \
    --name feed-worker \
    --restart unless-stopped \
    -e SUPABASE_URL="${SUPABASE_URL}" \
    -e SUPABASE_KEY="${SUPABASE_KEY}" \
    -e DATABASE_URL="${DATABASE_URL}" \
    -e REDIS_URL="${REDIS_URL}" \
    -e RABBITMQ_URL="${RABBITMQ_URL}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e AWS_REGION="${AWS_REGION}" \
    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    $FEED_IMAGE

echo -e "${GREEN}✅ Feed worker started${NC}"

# ========================================
# 8. Wait for Services to Start
# ========================================
echo ""
echo -e "${YELLOW}⏳ Waiting for services to start (15 seconds)...${NC}"
sleep 15

# ========================================
# 9. Check Status
# ========================================
echo ""
echo "========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "========================================="

echo ""
echo -e "${BLUE}Running containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${BLUE}Checking health endpoints...${NC}"

# Check backend
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend: http://localhost:5000/api/health (OK)${NC}"
else
    echo -e "${RED}❌ Backend: http://localhost:5000/api/health (FAILED)${NC}"
    echo "Checking logs..."
    docker logs --tail 20 backend-main 2>&1
fi

# Check email
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Email: http://localhost:5001/health (OK)${NC}"
else
    echo -e "${RED}❌ Email: http://localhost:5001/health (FAILED)${NC}"
    echo "Checking logs..."
    docker logs --tail 20 backend-email 2>&1
fi

echo ""
echo -e "${BLUE}Recent logs:${NC}"
echo ""
echo -e "${YELLOW}--- Backend logs (last 5 lines) ---${NC}"
docker logs --tail 5 backend-main 2>&1 || echo "No logs available"

echo ""
echo -e "${YELLOW}--- Email logs (last 5 lines) ---${NC}"
docker logs --tail 5 backend-email 2>&1 || echo "No logs available"

echo ""
echo -e "${BLUE}Container Log Commands:${NC}"
echo "  docker logs backend-main"
echo "  docker logs backend-email"
echo "  docker logs analytics-worker"
echo "  docker logs feed-worker"

echo ""
echo -e "${BLUE}Follow logs in real-time:${NC}"
echo "  docker logs -f backend-main"

echo ""
echo "========================================="
echo -e "${GREEN} Deployment complete!${NC}"
echo "========================================="