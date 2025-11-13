#!/bin/bash

echo "🚀 Starting SimuMarty WebSocket System"
echo "======================================"
echo ""

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.7+"
    exit 1
fi

echo "✅ Python found: $(python --version)"

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd python_marty
pip install -q -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi
cd ..

# Install Node dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Node.js dependencies installed"
    else
        echo "❌ Failed to install Node.js dependencies"
        exit 1
    fi
else
    echo "✅ Node.js dependencies already installed"
fi

echo ""
echo "🔌 Starting WebSocket Server..."
cd python_marty
python websocket_server.py &
WS_PID=$!
echo "✅ WebSocket server started (PID: $WS_PID)"
cd ..

# Wait for WebSocket to be ready
sleep 2

echo ""
echo "🌐 Starting Frontend Dev Server..."
npm run dev &
VITE_PID=$!
echo "✅ Frontend server started (PID: $VITE_PID)"

echo ""
echo "======================================"
echo "✅ SimuMarty is running!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "🔌 WebSocket: ws://localhost:8765"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "======================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $WS_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Register cleanup function
trap cleanup INT TERM

# Wait for user to stop
wait
