#!/bin/bash
# Chronos Markets Linera App Build Script
# This script builds the contract and service, then post-processes them
# to remove bulk-memory WASM ops that Linera doesn't support.

set -e

echo "🔨 Building Chronos Markets Linera App..."

# Build the WASM modules
cargo build --release --target wasm32-unknown-unknown

echo "✅ Build completed"

# Check if wasm-opt is available
if command -v wasm-opt &> /dev/null; then
    echo "🔧 Post-processing WASM to remove bulk-memory ops..."
    
    WASM_DIR="target/wasm32-unknown-unknown/release"
    
    # Process contract
    if [ -f "$WASM_DIR/chronos_market_contract.wasm" ]; then
        cp "$WASM_DIR/chronos_market_contract.wasm" "$WASM_DIR/chronos_market_contract_orig.wasm"
        wasm-opt --enable-bulk-memory --llvm-memory-copy-fill-lowering -O2 \
            "$WASM_DIR/chronos_market_contract_orig.wasm" \
            -o "$WASM_DIR/chronos_market_contract.wasm"
        echo "  ✅ Contract processed"
    fi
    
    # Process service
    if [ -f "$WASM_DIR/chronos_market_service.wasm" ]; then
        cp "$WASM_DIR/chronos_market_service.wasm" "$WASM_DIR/chronos_market_service_orig.wasm"
        wasm-opt --enable-bulk-memory --llvm-memory-copy-fill-lowering -O2 \
            "$WASM_DIR/chronos_market_service_orig.wasm" \
            -o "$WASM_DIR/chronos_market_service.wasm"
        echo "  ✅ Service processed"
    fi
    
    # Verify no bulk-memory ops remain
    if command -v wasm2wat &> /dev/null; then
        CONTRACT_OPS=$(wasm2wat "$WASM_DIR/chronos_market_contract.wasm" 2>/dev/null | grep -c "memory.copy\|memory.fill" || true)
        SERVICE_OPS=$(wasm2wat "$WASM_DIR/chronos_market_service.wasm" 2>/dev/null | grep -c "memory.copy\|memory.fill" || true)
        echo "  📊 Bulk-memory ops: contract=$CONTRACT_OPS, service=$SERVICE_OPS"
        
        if [ "$CONTRACT_OPS" -ne 0 ] || [ "$SERVICE_OPS" -ne 0 ]; then
            echo "  ⚠️  Warning: Some bulk-memory ops remain. May fail on Linera runtime."
        fi
    fi
else
    echo "⚠️  wasm-opt not found. WASM may contain unsupported bulk-memory ops."
    echo "   Install binaryen: https://github.com/WebAssembly/binaryen/releases"
fi

echo ""
echo "📦 WASM files ready at:"
echo "   - target/wasm32-unknown-unknown/release/chronos_market_contract.wasm"
echo "   - target/wasm32-unknown-unknown/release/chronos_market_service.wasm"
echo ""
echo "📤 To deploy:"
echo "   linera publish-and-create \\"
echo "     target/wasm32-unknown-unknown/release/chronos_market_contract.wasm \\"
echo "     target/wasm32-unknown-unknown/release/chronos_market_service.wasm \\"
echo "     --json-argument 'null'"
