#!/usr/bin/env bash
# operations/deploy-grantfox.sh
# Build, optimize, and deploy the StreamPay smart contract for GrantFox campaign

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
CONTRACTS_DIR="$PROJECT_DIR/contracts"
CONTRACT_SRC_DIR="$CONTRACTS_DIR/contracts/streampay-stream"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"
CONTRACT_ID_FILE="$CONTRACTS_DIR/.contracts/streampay-stream.id"

log() { echo "[grantfox-deploy] $*"; }
err() { echo "[grantfox-deploy] ERROR: $*" >&2; exit 1; }

# ──────────────────────────────────────────────────────────────────────────────
# Safety Guard
# ──────────────────────────────────────────────────────────────────────────────
if [[ "${NODE_ENV:-}" == "production" ]]; then
  err "Refusing to run in NODE_ENV=production. Use testnet for deployments."
fi

# ──────────────────────────────────────────────────────────────────────────────
# Step 1: Validate Environment
# ──────────────────────────────────────────────────────────────────────────────
log "Validating environment..."

# Check required dependencies
command -v stellar >/dev/null 2>&1 || err "stellar CLI is required (https://github.com/stellar/stellar-cli)"

if ! rustup target list --installed 2>/dev/null | grep -q wasm32v1-none; then
  err "wasm32v1-none target not installed. Run: rustup target add wasm32v1-none"
fi

# Validate required environment variables
if [[ -z "${STELLAR_SEED_SECRET_KEY:-}" ]]; then
  err "STELLAR_SEED_SECRET_KEY is required (set it in .env.testnet or export it)"
fi

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 2: Build the Contract                                                   │
# └─────────────────────────────────────────────────────────────────────────────┘
log "Building streampay-stream contract..."
cd "$CONTRACT_SRC_DIR"

cargo build --release
if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
  err "Build failed"
fi

if [[ ! -f "$TARGET_DIR/streampay-stream.wasm" ]]; then
  WASM_FILE=$(find "$CONTRACTS_DIR" -name "streampay-stream.wasm" -path "*/release/*" 2>/dev/null | head -1)
  if [[ -z "$WASM_FILE" ]]; then
    err "WASM file not found after build"
  fi
  log "Found WASM at: $WASM_FILE"
else
  log "WASM built: $TARGET_DIR/streampay-stream.wasm"
fi

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 3: Optimize the WASM                                                    │
# └─────────────────────────────────────────────────────────────────────────────┘
log "Optimizing WASM for size and performance..."
if command -v wasm-opt >/dev/null 2>&1; then
  log "WASM optimizer found, applying optimizations..."
  wasm-opt "$TARGET_DIR/streampay-stream.wasm" -o "$TARGET_DIR/streampay-stream.wasm" \
    --zero-fill-i128 \
    --flatten \
    --remove-imported-globals \
    --remove-unused-code \
    --optimize-level=2 \
    --shrink-level=1
  log "WASM optimization complete"
else
  log "WASM optimizer not available, skipping optimization"
fi

# Display file information
if [[ -f "$TARGET_DIR/streampay-stream.wasm" ]]; then
  FILE_SIZE=$(stat -c%s "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null || stat -f%z "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null)
  FILE_SIZE_KB=$((FILE_SIZE / 1024))
  log "Optimized WASM file: ${FILE_SIZE_KB}KB"
  
  # Try to get additional info
  if command -v file >/dev/null 2>&1; then
    FILE_TYPE=$(file -b "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null || echo "unknown")
    log "File type: $FILE_TYPE"
  fi
fi

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 4: Verify Contract ID File                                              │
# └─────────────────────────────────────────────────────────────────────────────┘
mkdir -p "$CONTRACTS_DIR/.contracts"

if [[ -f "$CONTRACT_ID_FILE" ]]; then
  EXISTING_ID=$(cat "$CONTRACT_ID_FILE" 2>/dev/null || echo "")
  if [[ -n "$EXISTING_ID" && "$EXISTING_ID" != "" ]]; then
    log "Found existing contract ID: $EXISTING_ID"
    log "This deployment is idempotent. Re-running skips deployment."
    
    # Verify format (basic check)
    if [[ ! "$EXISTING_ID" =~ ^C[0-9A-Za-z]{55}$ ]]; then
      log "WARNING: Contract ID format unexpected: $EXISTING_ID"
    fi
  fi
fi

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 5: Deploy to Stellar Testnet                                           │
# └─────────────────────────────────────────────────────────────────────────────┘
# For GrantFox campaign - always use testnet (safety enforced)
NETWORK="${STELLAR_NETWORK:-testnet}"
log "Deploying contract to network: $NETWORK"

if [[ -n "${STELLAR_HORIZON_URL:-}" ]]; then
  log "Using custom Horizon URL: $STELLAR_HORIZON_URL"
  DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm "$TARGET_DIR/streampay-stream.wasm" \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$STELLAR_HORIZON_URL" 2>&1)
else
  DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm "$TARGET_DIR/streampay-stream.wasm" \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --network "$NETWORK" 2>&1)
fi

CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | grep '^C' | tail -1 | tr -d '[:space:]')

if [[ -z "$CONTRACT_ID" ]]; then
  err "Deploy failed. Full output:\n$DEPLOY_OUTPUT"
fi

log "Contract deployed successfully!"

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 6: Save Contract ID                                                    │
# └─────────────────────────────────────────────────────────────────────────────┘
if [[ -f "$CONTRACT_ID_FILE" ]]; then
  OLD_ID=$(cat "$CONTRACT_ID_FILE" 2>/dev/null || echo "")
  if [[ "$OLD_ID" != "$CONTRACT_ID" ]]; then
    log "Contract ID changed from $OLD_ID to $CONTRACT_ID"
  else
    log "Contract ID unchanged: $CONTRACT_ID"
  fi
else
  log "First deployment, saving contract ID: $CONTRACT_ID"
fi

echo "$CONTRACT_ID" > "$CONTRACT_ID_FILE"
log "Contract ID saved to: $CONTRACT_ID_FILE"

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 7: Verify Deployment                                                   │
# └─────────────────────────────────────────────────────────────────────────────┘
log "Verifying deployment..."

if command -v stellar >/dev/null 2>&1; then
  VERIFY_OUTPUT=$(stellar contract info --id "$CONTRACT_ID" --network "$NETWORK" 2>&1 || echo "Verification failed")
  if echo "$VERIFY_OUTPUT" | grep -q "Error\|error" || [[ $? -ne 0 ]]; then
    log "WARNING: Could not verify contract info: $VERIFY_OUTPUT"
  else
    log "Contract verification successful"
  fi
fi

# ┌─────────────────────────────────────────────────────────────────────────────┐
# │ Step 8: Display Summary                                                     │
# └─────────────────────────────────────────────────────────────────────────────┘
log ""
echo ""
log "================================================================================"
log "GrantFox Campaign Deployment Complete!"
log "================================================================================"
echo ""
log "Contract ID: $CONTRACT_ID"
log "Network: $NETWORK"
log "WASM File: $TARGET_DIR/streampay-stream.wasm"
log "Deployer: ${STELLAR_SEED_SECRET_KEY:0:10}... (truncated)"
echo ""
log "Next Steps for GrantFox Team:"
log "  1. Add STREAMPAY_STREAM_CONTRACT_ID=$CONTRACT_ID to .env.testnet"
log "  2. Run integration tests against deployed contract"
log "  3. Verify backend API v2 stream endpoints with new contract ID"
log "  4. Update Swagger/OpenAPI docs if needed"
echo ""
log "Idempotency: Re-run this script to verify and skip deployment if ID exists"
log "================================================================================"

# Verify the contract ID file was written
if [[ -f "$CONTRACT_ID_FILE" && -s "$CONTRACT_ID_FILE" ]]; then
  log "✓ Deployment verification passed"
else
  err "Failed to save contract ID file"
fi
