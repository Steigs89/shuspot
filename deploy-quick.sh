#!/bin/bash

# Quick deployment script for Alibaba Cloud ECS
# Run this on your LOCAL machine to deploy to server

set -e

SERVER_IP="47.76.248.16"
SERVER_USER="root"
SERVER_PATH="/var/www/shuspot"

echo "🚀 Starting quick deployment to Alibaba Cloud..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Build locally
echo -e "${BLUE}📦 Building locally...${NC}"
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"
tar -czf dist-deploy.tar.gz dist/

# Upload to server
echo -e "${BLUE}📤 Uploading to server...${NC}"
scp dist-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# Deploy on server
echo -e "${BLUE}🔄 Deploying on server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /tmp
echo "Extracting deployment package..."
tar -xzf dist-deploy.tar.gz

echo "Backing up current deployment..."
if [ -d "/var/www/shuspot/dist" ]; then
    mv /var/www/shuspot/dist /var/www/shuspot/dist.backup.$(date +%Y%m%d_%H%M%S)
fi

echo "Installing new deployment..."
mv dist /var/www/shuspot/
chown -R nginx:nginx /var/www/shuspot
chmod -R 755 /var/www/shuspot

echo "Reloading nginx..."
systemctl reload nginx

echo "Cleaning up..."
rm -f /tmp/dist-deploy.tar.gz

echo "✅ Deployment complete!"
EOF

# Clean up local files
rm -f dist-deploy.tar.gz

echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${BLUE}🌐 Visit: https://shuspot.com${NC}"