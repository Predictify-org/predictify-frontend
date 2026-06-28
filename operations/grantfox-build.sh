#!/usr/bin/env bash
# operations/grantfox-build.sh
# Build and optimize StreamPay smart contracts for GrantFox campaign

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
CONTRACTS_DIR="$PROJECT_DIR/contracts"
CONTRACT_SRC_DIR="$CONTRACTS_DIR/contracts/streampay-stream"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"

log() { echo "[grantfox-build] $*"; }
err() { echo "[grantfox-build] ERROR: $*" >&2; exit 1; }

# Build the contract with optimization for production
log "Building streampay-stream contract for GrantFox..."
cd "$CONTRACT_SRC_DIR"
cargo build --release

# Verify the WASM was built
if [[ ! -f "$TARGET_DIR/streampay-stream.wasm" ]]; then
  # Search for the WASM file
  WASM_FILE=$(find "$CONTRACTS_DIR" -name "streampay-stream.wasm" -path "*/release/*" 2>/dev/null | head -1)
  if [[ -z "$WASM_FILE" ]]; then
    err "WASM file not found after build"
  fi
  log "Found WASM at: $WASM_FILE"
else
  log "WASM built: $TARGET_DIR/streampay-stream.wasm"
fi

# Optimize the WASM file (using size optimization profile)
log "Optimizing WASM file..."
if command -v wasm-opt >/dev/null 2>&1; then
  log "WASM optimizer available, optimizing..."
  wasm-opt "$TARGET_DIR/streampay-stream.wasm" -o "$TARGET_DIR/streampay-stream.opt.wasm" \
    --zero-fill-i128 --flatten --remove-imported-globals --remove-unused-code
  mv "$TARGET_DIR/streampay-stream.opt.wasm" "$TARGET_DIR/streampay-stream.wasm"
  log "WASM optimized and saved"
else
  log "WASM optimizer not available, skipping optimization"
fi

# Display file size information
if [[ -f "$TARGET_DIR/streampay-stream.wasm" ]]; then
  FILE_SIZE=$(stat -c%s "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null || stat -f%z "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null)
  FILE_SIZE_KB=$((FILE_SIZE / 1024))
  log "Final WASM file size: ${FILE_SIZE_KB}KB"
fi

log "Build complete. Contract ready for GrantFox deployment."
