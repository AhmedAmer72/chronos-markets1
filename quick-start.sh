#!/bin/bash

echo "🚀 Quick Start - Chronos Markets"
echo "================================"
echo ""

# Kill any existing processes
pkill -f "linera" 2>/dev/null
sleep 2

# Start devnet
echo "📡 Starting devnet..."
cd /mnt/e/AKINDO/chronos-markets1
linera net up > /tmp/chronos-devnet-quickstart.log 2>&1 &
DEVNET_PID=$!

# Wait for devnet
sleep 12

# Check if running
if ! pgrep -f "linera net up" > /dev/null; then
    echo "❌ Devnet failed to start"
    exit 1
fi

echo "✅ Devnet started (PID: $DEVNET_PID)"

# Get config
TMP_DIR=$(grep "export LINERA_WALLET" /tmp/chronos-devnet-quickstart.log | cut -d'"' -f2 | xargs dirname)

if [ -z "$TMP_DIR" ]; then
    echo "❌ Could not find devnet config"
    exit 1
fi

export LINERA_WALLET="$TMP_DIR/wallet_0.json"
export LINERA_KEYSTORE="$TMP_DIR/keystore_0.json"  
export LINERA_STORAGE="rocksdb:$TMP_DIR/client_0.db"

echo "✅ Config: $TMP_DIR"
echo ""

# Deploy application
echo "📦 Deploying application..."
cd linera-app
linera project publish-and-create > /tmp/deploy-output.log 2>&1

if [ $? -eq 0 ]; then
    APP_ID=$(grep -oP '[a-z0-9]{64}' /tmp/deploy-output.log | head -1)
    echo "$APP_ID" > ../APPLICATION_ID.txt
    echo "✅ Deployed: $APP_ID"
else
    echo "❌ Deployment failed"
    cat /tmp/deploy-output.log
    exit 1
fi

cd ..

# Start service in background
echo ""
echo "🌐 Starting GraphQL service on port 8080..."
nohup linera service --port 8080 > linera-service.log 2>&1 &
SERVICE_PID=$!
sleep 3

if lsof -i :8080 > /dev/null 2>&1; then
    echo "✅ Service started (PID: $SERVICE_PID)"
else
    echo "❌ Service failed to start"
    cat linera-service.log
    exit 1
fi

echo ""
echo "================================"
echo "✅ READY!"
echo "================================"
echo ""
echo "📡 GraphQL: http://localhost:8080"
echo "🎨 Frontend: npm run dev (in another terminal)"
echo "📦 App ID: $APP_ID"
echo ""
echo "🛑 To stop:"
echo "   pkill -f linera"
