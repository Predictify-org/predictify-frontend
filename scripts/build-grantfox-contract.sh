#!/usr/bin/env bash
# scripts/build-grantfox-contract.sh
# Build and optimize the StreamPay smart contract for the GrantFox campaign

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
CONTRACTS_DIR="$PROJECT_DIR/contracts"
CONTRACT_SRC_DIR="$CONTRACTS_DIR/contracts/streampay-stream"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"

log() { echo "[build-grantfox] $*"; }
err() { echo "[build-grantfox] ERROR: $*" >&2; exit 1; }

# Safety guard - never build in production
if [[ "${NODE_ENV:-}" == "production" ]]; then
  err "Refusing to build contracts in production. Use testnet for development."
fi

# Log build start
log "Building StreamPay contract for GrantFox campaign..."
log "Target: streampay-stream"
log "Network: ${STELLAR_NETWORK:-testnet}"

# Navigate to contract source directory
cd "$CONTRACT_SRC_DIR"

# Build with optimization for production
log "Running: cargo build --release --profile optimized..."
cargo build --release

# Check if build succeeded
if [[ ! -f "$TARGET_DIR/streampay-stream.wasm" ]]; then
  err "Contract build failed - no WASM file generated"
fi

# Optimize the WASM file for size
log "Optimizing WASM file for size..."
if command -v wasm-opt >/dev/null 2>&1; then
  log "Applying size optimization..."
  wasm-opt "$TARGET_DIR/streampay-stream.wasm" \
    --zero-fill-i128 \
    --flatten \
    --remove-imported-globals \
    --remove-unused-code \
    --optimize-level=2 \
    --shrink-level=1 \
    -o "$TARGET_DIR/streampay-stream.wasm"
  log "WASM optimization complete"
else
  log "wasm-opt not available, skipping optimization"
fi

# Get file size info
FILE_SIZE=$(stat -c%s "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null || stat -f%z "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null)
FILE_SIZE_KB=$((FILE_SIZE / 1024))

log "Build successful!"
log "WASM file: $TARGET_DIR/streampay-stream.wasm"
log "File size: ${FILE_SIZE_KB}KB"

# Verify file is valid WASM format
if command -v file >/dev/null 2>&1; then
  FILE_TYPE=$(file -b "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null || echo "unknown")
  log "File type: $FILE_TYPE"
fi

log "GrantFox contract ready for deployment"
