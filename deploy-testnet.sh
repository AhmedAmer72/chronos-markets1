#!/bin/bash
# Chronos Markets - Testnet Deployment Script
# This script deploys the Chronos Markets application to Linera Testnet

set -e

echo "🚀 Chronos Markets - Testnet Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FAUCET_URL="https://faucet.testnet-conway.linera.net"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$APP_DIR/linera-app"

# Check if Linera CLI is installed
if ! command -v linera &> /dev/null; then
    echo -e "${RED}❌ Error: Linera CLI not found${NC}"
    echo ""
    echo "Please install Linera CLI first:"
    echo "  cargo install --locked linera-service@0.15.6"
    echo ""
    exit 1
fi

# Check Linera version
LINERA_VERSION=$(linera --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "📦 Linera CLI version: $LINERA_VERSION"

# Step 1: Initialize wallet with testnet faucet
echo ""
echo -e "${YELLOW}Step 1: Initializing wallet with testnet faucet...${NC}"
echo "Faucet URL: $FAUCET_URL"

linera wallet init --faucet "$FAUCET_URL" 2>&1 || {
    echo -e "${YELLOW}⚠️ Wallet may already exist, requesting new chain...${NC}"
}

# Request a new chain
echo ""
echo -e "${YELLOW}Requesting a new chain from faucet...${NC}"
CHAIN_OUTPUT=$(linera wallet request-chain --faucet "$FAUCET_URL" 2>&1)
echo "$CHAIN_OUTPUT"

# Get chain ID
CHAIN_ID=$(linera wallet show 2>&1 | grep -oE '[a-f0-9]{64}' | head -1)
echo ""
echo -e "${GREEN}✅ Chain ID: $CHAIN_ID${NC}"

# Step 2: Sync and check balance
echo ""
echo -e "${YELLOW}Step 2: Syncing with network...${NC}"
linera sync
BALANCE=$(linera query-balance 2>&1)
echo -e "${GREEN}💰 Balance: $BALANCE${NC}"

# Step 3: Build the contracts
echo ""
echo -e "${YELLOW}Step 3: Building smart contracts...${NC}"
cd "$CONTRACT_DIR"

if [ -f "Cargo.toml" ]; then
    cargo build --release --target wasm32-unknown-unknown 2>&1
    echo -e "${GREEN}✅ Contracts built successfully${NC}"
else
    echo -e "${RED}❌ Error: No Cargo.toml found in $CONTRACT_DIR${NC}"
    exit 1
fi

# Find the WASM files
CONTRACT_WASM=$(find target -name "*contract*.wasm" -path "*/release/*" 2>/dev/null | head -1)
SERVICE_WASM=$(find target -name "*service*.wasm" -path "*/release/*" 2>/dev/null | head -1)

if [ -z "$CONTRACT_WASM" ] || [ -z "$SERVICE_WASM" ]; then
    echo -e "${RED}❌ Error: Could not find WASM files${NC}"
    echo "Looking for contract and service WASM in target directory..."
    find target -name "*.wasm" 2>/dev/null
    exit 1
fi

echo "📄 Contract WASM: $CONTRACT_WASM"
echo "📄 Service WASM: $SERVICE_WASM"

# Step 4: Deploy the application
echo ""
echo -e "${YELLOW}Step 4: Deploying application to testnet...${NC}"

APP_ID=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-argument "null" 2>&1 | grep -oE '[a-f0-9]{64}' | tail -1)

if [ -z "$APP_ID" ]; then
    echo -e "${RED}❌ Error: Failed to get Application ID${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Application deployed!${NC}"
echo -e "${GREEN}📍 Application ID: $APP_ID${NC}"

# Step 5: Save configuration
echo ""
echo -e "${YELLOW}Step 5: Saving configuration...${NC}"

cd "$APP_DIR"

# Create .env.local file
cat > .env.local << EOF
# Linera Testnet Configuration
# Generated on $(date)

VITE_LINERA_CHAIN_ID=$CHAIN_ID
VITE_LINERA_APP_ID=$APP_ID
VITE_USE_TESTNET=true
VITE_LINERA_FAUCET_URL=$FAUCET_URL
EOF

echo -e "${GREEN}✅ Configuration saved to .env.local${NC}"

# Display summary
echo ""
echo "========================================"
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo "========================================"
echo ""
echo "Chain ID:"
echo "  $CHAIN_ID"
echo ""
echo "Application ID:"
echo "  $APP_ID"
echo ""
echo "Faucet URL:"
echo "  $FAUCET_URL"
echo ""
echo "Next steps:"
echo "  1. Start the frontend: npm run dev"
echo "  2. Open http://localhost:3007"
echo "  3. Click 'Connect' to connect your wallet"
echo "  4. Start trading!"
echo ""
echo "To start the node service for local testing:"
echo "  linera service --port 8080"
echo ""
