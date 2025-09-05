#!/bin/bash

# Book Admin Deployment Script for Vercel
echo "🚀 Preparing Book Admin for Vercel Deployment..."

# Check if we're in the book-admin directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Please run this script from the book-admin directory"
    exit 1
fi

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the frontend
echo "🔨 Building frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Build for production
echo "🏗️ Building React app..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

cd ..

# Check backend requirements
echo "🐍 Checking Python backend..."
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Backend requirements.txt not found!"
    exit 1
fi

# Create .env.example for environment variables
echo "📝 Creating environment template..."
cat > .env.example << EOL
# Database Configuration
DATABASE_URL=sqlite:///./books.db

# Google Sheets Configuration (Optional)
GOOGLE_SHEETS_CREDENTIALS_PATH=./google_credentials.json
GOOGLE_SHEETS_SPREADSHEET_NAME=ShuSpot Books Master

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50000000

# CORS Configuration
ALLOWED_ORIGINS=*

# Production API URL (set this in frontend env)
REACT_APP_API_URL=https://your-backend.vercel.app/api
EOL

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "⚠️ Warning: No git repository found. Consider initializing git for easier deployment."
    echo "💡 Run: git init && git add . && git commit -m 'Initial commit'"
fi

echo "✅ Build completed successfully!"
echo ""
echo "🌐 Deployment Options:"
echo ""
echo "📊 Option 1: Separate Deployments (Recommended)"
echo "   1. Deploy backend: cd backend && vercel"
echo "   2. Deploy frontend: cd frontend && vercel"
echo "   3. Update frontend environment with backend URL"
echo ""
echo "📦 Option 2: Monorepo Deployment"
echo "   1. Run: vercel"
echo "   2. Follow the prompts"
echo ""
echo "� Don't forget to:"
echo "   ✓ Set environment variables in Vercel dashboard"
echo "   ✓ Configure CORS origins"
echo "   ✓ Upload Google credentials if using Sheets integration"
echo "   ✓ Test all functionality after deployment"
echo ""
echo "📖 See VERCEL_DEPLOYMENT.md for detailed instructions"
