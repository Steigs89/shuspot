#!/bin/bash
# scripts/start-local-tunnel.sh

echo "🚀 Starting local development with tunnel..."

# Start the backend
cd book-admin/backend
python3 -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start ngrok tunnel
ngrok http 8000 --log=stdout &
NGROK_PID=$!

echo "📋 Backend PID: $BACKEND_PID"
echo "🌐 Ngrok PID: $NGROK_PID"
echo ""
echo "To stop everything:"
echo "kill $BACKEND_PID $NGROK_PID"

# Keep script running
wait