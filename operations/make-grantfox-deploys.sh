#!/usr/bin/env bash
# operations/make-grantfox-deploys.sh
# GrantFox campaign deployment wrapper script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

log() { echo "[grantfox-deploy] $*"; }

# GrantFox campaign configuration for smart contracts
export STELLAR_NETWORK="testnet"
export CONTRACT_NAME="streampay-stream"
export CONTRACTS_DIR="$PROJECT_DIR/contracts"
export FORCE_DEPLOY="false"

# Default env file
ENV_FILE="${ENV_FILE:-.env.testnet}"
if [[ -f "$PROJECT_DIR/$ENV_FILE" ]]; then
  log "Loading environment from $ENV_FILE"
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/$ENV_FILE"
  set +a
fi

# Verify network safety for GrantFox (testnet only)
if [[ "${NODE_ENV:-}" == "production" ]]; then
  log "ERROR: Production deployments disabled for safety"
  exit 1
fi

log "GrantFox Campaign Smart Contract Deployment"
log "Network: $STELLAR_NETWORK (GrantFox uses testnet only for safety)"
log "Contract: $CONTRACT_NAME"

# Execute deployment
bash "$SCRIPT_DIR/deploy-grantfox.sh"
