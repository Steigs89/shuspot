#!/bin/bash

# Git-based deployment script
# This pushes to GitHub and pulls on server

set -e

SERVER_IP="47.76.248.16"
SERVER_USER="root"

echo "🚀 Starting Git-based deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if there are uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}❌ You have uncommitted changes. Please commit first.${NC}"
    echo "Run: git add . && git commit -m 'Your commit message'"
    exit 1
fi

# Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push

# Deploy on server
echo -e "${BLUE}🔄 Deploying on server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root/shuspot

echo "Pulling latest changes..."
git pull

echo "Building application..."
npm run build

echo "Backing up current deployment..."
if [ -d "/var/www/shuspot/dist" ]; then
    mv /var/www/shuspot/dist /var/www/shuspot/dist.backup.$(date +%Y%m%d_%H%M%S)
fi

echo "Installing new deployment..."
cp -r dist /var/www/shuspot/
chown -R nginx:nginx /var/www/shuspot
chmod -R 755 /var/www/shuspot

echo "Reloading nginx..."
systemctl reload nginx

echo "✅ Deployment complete!"
EOF

echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${BLUE}🌐 Visit: https://shuspot.com${NC}"