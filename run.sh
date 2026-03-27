#!/bin/bash

echo "=========================================="
echo "  LTTS Test Portal - One-Click Startup"
echo "=========================================="
echo ""

if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing root dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "[2/3] Installing client dependencies..."
    cd client && npm install && cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo "[3/3] Installing server dependencies..."
    cd server && npm install && cd ..
fi

echo ""
echo "[High Five] Starting Development Server..."
echo "Client: http://localhost:4200"
echo "Server: http://localhost:5000"
echo ""

npm run dev
