#!/bin/bash

# Deployment script for Alibaba Cloud ECS
# This script builds the frontend and prepares it for deployment

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build the frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"
echo -e "${BLUE}📁 Build output is in ./dist directory${NC}"

# Create a deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_PACKAGE="shuspot-deploy-${TIMESTAMP}.tar.gz"

tar -czf "$DEPLOY_PACKAGE" \
    dist/ \
    api/ \
    api.py \
    requirements.txt \
    books.db \
    .env.production \
    --exclude='*.pyc' \
    --exclude='__pycache__' \
    --exclude='.venv'

echo -e "${GREEN}✅ Deployment package created: ${DEPLOY_PACKAGE}${NC}"

echo ""
echo -e "${GREEN}🎉 Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Upload ${DEPLOY_PACKAGE} to your ECS instance"
echo "2. SSH into your ECS instance"
echo "3. Extract the package: tar -xzf ${DEPLOY_PACKAGE}"
echo "4. Follow the instructions in ALIBABA_DEPLOYMENT.md"
echo ""
echo "Quick upload command:"
echo "scp ${DEPLOY_PACKAGE} root@YOUR_ECS_IP:/root/"
