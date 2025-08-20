#!/bin/bash

echo "🚀 Starting Book Admin Tool..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Create uploads directory
mkdir -p uploads

echo "📦 Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt

echo "🔧 Starting backend server..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "🎨 Starting frontend server..."
npm start &
FRONTEND_PID=$!

echo "✅ Book Admin Tool is starting up!"
echo "📊 Backend API: http://localhost:8000"
echo "🎨 Frontend UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait $FRONTEND_PID $BACKEND_PID