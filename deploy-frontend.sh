#!/bin/bash

# Frontend deployment script
# Commits, pushes to GitHub, and deploys to Alibaba Cloud ECS

set -e

SERVER_IP="47.76.248.16"
SERVER_USER="root"
COMMIT_MSG="${1:-Deploy: $(date '+%Y-%m-%d %H:%M:%S')}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Deploying frontend..."

# Git commit + push
echo -e "${BLUE}📝 Staging changes...${NC}"
git add .

if git diff --cached --quiet; then
  echo -e "${BLUE}ℹ️  Nothing new to commit, deploying current HEAD...${NC}"
else
  echo -e "${BLUE}💾 Committing: $COMMIT_MSG${NC}"
  git commit -m "$COMMIT_MSG"
fi

echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
git push

# Build + deploy on server
echo -e "${BLUE}🔄 Deploying on server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /root/shuspot
echo "Pulling latest..."
git pull
echo "Building..."
npm run build
echo "Backing up..."
[ -d "/var/www/shuspot/dist" ] && mv /var/www/shuspot/dist /var/www/shuspot/dist.backup.$(date +%Y%m%d_%H%M%S)
echo "Installing..."
cp -r dist /var/www/shuspot/
chown -R nginx:nginx /var/www/shuspot
chmod -R 755 /var/www/shuspot
echo "Reloading nginx..."
systemctl reload nginx
echo "✅ Done!"
EOF

echo -e "${GREEN}🎉 Deployed successfully!${NC}"
echo -e "${BLUE}🌐 https://shuspot.com${NC}"
