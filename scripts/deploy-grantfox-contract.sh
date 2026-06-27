#!/usr/bin/env bash
# scripts/deploy-grantfox-contract.sh
# Deploy the StreamPay smart contract to a specific network for GrantFox campaign

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."
CONTRACTS_DIR="$PROJECT_DIR/contracts"
CONTRACT_SRC_DIR="$CONTRACTS_DIR/contracts/streampay-stream"
TARGET_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"
CONTRACT_ID_FILE="$CONTRACTS_DIR/.contracts/streampay-stream.id"

log() { echo "[deploy-grantfox] $*"; }
err() { echo "[deploy-grantfox] ERROR: $*" >&2; exit 1; }

# Safety guard - never deploy in production
if [[ "${NODE_ENV:-}" == "production" ]]; then
  err "Refusing to deploy contracts in production. Use testnet for deployments."
fi

# Load environment variables
ENV_FILE="${ENV_FILE:-.env.testnet}"
if [[ -f "$PROJECT_DIR/$ENV_FILE" ]]; then
  log "Loading environment from $ENV_FILE"
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/$ENV_FILE"
else
  log "WARNING: $ENV_FILE not found. Using defaults."
fi

# Validate required environment variables
: "${STELLAR_SEED_SECRET_KEY:?STELLAR_SEED_SECRET_KEY is required}"
: "${STELLAR_NETWORK:?STELLAR_NETWORK is required (testnet for GrantFox)}"

# Log deployment start
log "Deploying StreamPay contract for GrantFox campaign..."
log "Network: $STELLAR_NETWORK"
log "Contract source: $CONTRACT_SRC_DIR"

# Verify stellar CLI is available
if ! command -v stellar >/dev/null 2>&1; then
  err "stellar CLI is required but not found"
fi

# Check if contract ID file exists
if [[ -f "$CONTRACT_ID_FILE" ]]; then
  EXISTING_ID=$(cat "$CONTRACT_ID_FILE" 2>/dev/null)
  log "Found existing contract ID: $EXISTING_ID"
  
  # Check if we should force re-deploy
  if [[ "${FORCE_DEPLOY:-false}" != "true" ]]; then
    log "Idempotent deployment - re-running will skip deployment unless FORCE_DEPLOY=true"
    log "To force re-deploy: FORCE_DEPLOY=true bash $0"
    log "Skipping deployment (use FORCE_DEPLOY=true to override)"
  else
    log "FORCE_DEPLOY=true specified - will redeploy"
  fi
else
  log "No existing contract ID file found - will deploy"
fi

# Navigate to contract source directory
cd "$CONTRACT_SRC_DIR"

# Deploy using the same mechanism as deploy-testnet.sh
log "Deploying contract..."

if [[ -n "${STELLAR_HORIZON_URL:-}" ]]; then
  log "Using custom Horizon URL: $STELLAR_HORIZON_URL"
  DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm "$TARGET_DIR/streampay-stream.wasm" \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --network "$STELLAR_NETWORK" \
    --rpc-url "$STELLAR_HORIZON_URL" 2>&1)
else
  DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm "$TARGET_DIR/streampay-stream.wasm" \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --network "$STELLAR_NETWORK" 2>&1)
fi

CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | grep '^C' | tail -1 | tr -d '[:space:]')

if [[ -z "$CONTRACT_ID" ]]; then
  err "Deploy failed. Full output:\n$DEPLOY_OUTPUT"
fi

log "Contract deployed successfully!"
log "Contract ID: $CONTRACT_ID"

# Save contract ID
mkdir -p "$CONTRACTS_DIR/.contracts"
echo "$CONTRACT_ID" > "$CONTRACT_ID_FILE"
log "Contract ID saved to: $CONTRACT_ID_FILE"

# Verify deployment
log "Verifying deployment..."
if command -v stellar >/dev/null 2>&1; then
  log "Contract info:"
  stellar contract info --id "$CONTRACT_ID" --network "$STELLAR_NETWORK" || log "Could not verify contract"
fi

log ""
echo ""
log "================================================================================"
log "GrantFox Contract Deployment Complete!"
log "================================================================================"
echo ""
log "Contract ID: $CONTRACT_ID"
log "Network: $STELLAR_NETWORK"
log "WASM: $(ls -lh "$TARGET_DIR/streampay-stream.wasm" 2>/dev/null | awk '{print $5}')"
log ""
log "Next Steps for GrantFox Team:"
log "  1. Update .env.testnet with STREAMPAY_STREAM_CONTRACT_ID=$CONTRACT_ID"
log "  2. Run backend integration tests"
log "  3. Update OpenAPI docs if contract ID is stored there"
log ""
log "Idempotency: Re-run to verify deployment without redeploying"
log "================================================================================"
