#!/usr/bin/env bash

set -eu

echo "🚀 Starting Chronos Markets..."

# Source nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# ===== STEP 1: Start Local Linera Network =====
echo "📡 Starting local Linera network..."
eval "$(linera net helper)"
linera_spawn linera net up --with-faucet

export LINERA_FAUCET_URL=http://localhost:8080

# ===== STEP 2: Initialize Wallet =====
echo "💳 Initializing wallet..."
linera wallet init --faucet="$LINERA_FAUCET_URL"
linera wallet request-chain --faucet="$LINERA_FAUCET_URL"

# ===== STEP 3: Build and Deploy Smart Contract =====
echo "🔨 Building Linera smart contract..."
cd /build/linera-app

# Build the contract
cargo build --release --target wasm32-unknown-unknown

echo "📦 Publishing and creating application..."
cd /build

# Publish and create the application, capture the output
APP_OUTPUT=$(linera project publish-and-create ./linera-app --json-argument "null" 2>&1)
echo "$APP_OUTPUT"

# Extract application ID from output
APP_ID=$(echo "$APP_OUTPUT" | grep -oP '[a-f0-9]{64}' | tail -1)
CHAIN_ID=$(linera wallet show | grep -oP 'Chain ID: \K[a-f0-9]+' | head -1)

echo "✅ Application deployed!"
echo "   App ID: $APP_ID"
echo "   Chain ID: $CHAIN_ID"

# Export for frontend
export VITE_LINERA_APP_ID=$APP_ID
export VITE_LINERA_CHAIN_ID=$CHAIN_ID
export VITE_LINERA_NODE_URL=http://localhost:8080

# ===== STEP 4: Start Linera Service =====
echo "🌐 Starting Linera service..."
linera service --port 8080 &
sleep 3

# ===== STEP 5: Build and Run Frontend =====
echo "🎨 Installing frontend dependencies..."
cd /build
npm install

echo "🚀 Starting frontend on port 5173..."
npm run dev -- --host 0.0.0.0 --port 5173

# Keep container running
wait
