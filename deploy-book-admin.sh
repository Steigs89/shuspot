#!/bin/bash

# Deploy book-admin tool to shuspot.com/book-admin

set -e

SERVER_IP="47.76.248.16"
SERVER_USER="root"

echo "📚 Deploying Book Admin Tool to shuspot.com/book-admin..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if book-admin directory exists
if [ ! -d "book-admin" ]; then
    echo -e "${RED}❌ book-admin directory not found${NC}"
    echo "Make sure you're in the project root directory"
    exit 1
fi

# Create deployment package for book-admin
echo -e "${BLUE}📦 Creating book-admin deployment package...${NC}"
cd book-admin

# Check if there's a built frontend
if [ -d "frontend/build" ]; then
    echo "Using React build from frontend/build"
    tar -czf ../book-admin-deploy.tar.gz \
        frontend/build/ \
        api/ \
        backend/ \
        ocr-data/ \
        tools/ \
        *.py \
        *.json \
        requirements.txt \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='node_modules' \
        --exclude='.git'
elif [ -d "build" ]; then
    echo "Using build from root build directory"
    tar -czf ../book-admin-deploy.tar.gz \
        build/ \
        api/ \
        backend/ \
        ocr-data/ \
        tools/ \
        *.py \
        *.json \
        requirements.txt \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='node_modules' \
        --exclude='.git'
else
    echo "Using static files (no React build found)"
    tar -czf ../book-admin-deploy.tar.gz \
        *.html \
        js/ \
        css/ \
        api/ \
        backend/ \
        ocr-data/ \
        tools/ \
        *.py \
        *.json \
        requirements.txt \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='node_modules' \
        --exclude='.git'
fi

cd ..

# Upload to server
echo -e "${BLUE}📤 Uploading book-admin to server...${NC}"
scp book-admin-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# Deploy on server
echo -e "${BLUE}🔄 Deploying book-admin on server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /tmp

echo "Creating book-admin directory..."
mkdir -p /var/www/shuspot/book-admin

echo "Extracting book-admin package..."
tar -xzf book-admin-deploy.tar.gz -C /var/www/shuspot/book-admin/

echo "Setting up Python environment for book-admin API..."
cd /var/www/shuspot/book-admin
if [ -f "requirements.txt" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

echo "Setting permissions..."
chown -R nginx:nginx /var/www/shuspot/book-admin
chmod -R 755 /var/www/shuspot/book-admin

echo "Cleaning up..."
rm -f /tmp/book-admin-deploy.tar.gz

echo "✅ Book-admin deployment complete!"
EOF

# Clean up local files
rm -f book-admin-deploy.tar.gz

echo -e "${GREEN}🎉 Book Admin Tool deployed successfully!${NC}"
echo -e "${BLUE}📚 Available at: https://shuspot.com/book-admin${NC}"
echo ""
echo "Next step: Update nginx configuration to serve /book-admin"