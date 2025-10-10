#!/bin/bash

# One-command deployment script
# Commits, pushes, and deploys in one go

set -e

SERVER_IP="47.76.248.16"
SERVER_USER="root"

# Get commit message from command line argument
COMMIT_MSG="${1:-Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')}"

echo "🚀 One-command deployment starting..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Add all changes
echo -e "${BLUE}📝 Adding changes...${NC}"
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${BLUE}ℹ️  No changes to commit, proceeding with deployment...${NC}"
else
    # Commit changes
    echo -e "${BLUE}💾 Committing changes...${NC}"
    git commit -m "$COMMIT_MSG"
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
echo ""
echo "Usage examples:"
echo "./deploy-one-command.sh"
echo "./deploy-one-command.sh 'Add new feature'"