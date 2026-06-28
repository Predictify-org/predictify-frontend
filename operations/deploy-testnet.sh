#!/usr/bin/env bash
# operations/deploy-testnet.sh
# Build and deploy the streampay-stream Soroban contract to Stellar testnet.
#
# Usage:
#   STELLAR_SEED_SECRET_KEY=S... bash operations/deploy-testnet.sh
#
# Prerequisites:
#   - stellar CLI (https://github.com/stellar/stellar-cli)
#   - Rust toolchain with wasm32v1-none target
#
# Environment variables:
#   STELLAR_NETWORK             Network name (default: testnet)
#   STELLAR_SEED_SECRET_KEY     Deployer account secret key (required)
#   STELLAR_HORIZON_URL         Custom Horizon RPC URL (optional)
#   CONTRACT_NAME               Contract package name (default: streampay-stream)
#   CONTRACTS_DIR               Path to contracts workspace (default: contracts)
#   FORCE_DEPLOY                Re-deploy even if contract ID exists (default: false)
#
# Idempotent: stores deployed contract ID in contracts/.contracts/<name>.id.
# Re-running reads the existing ID and skips deployment unless FORCE_DEPLOY=true.

set -euo pipefail

# ── Safety guard ────────────────────────────────────────────────────────────────
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "[deploy] ERROR: Refusing to run in NODE_ENV=production." >&2
  echo "[deploy] This script is for testnet/development only." >&2
  exit 1
fi

# ── Helpers ─────────────────────────────────────────────────────────────────────
log() { echo "[deploy] $*"; }
err() { echo "[deploy] ERROR: $*" >&2; exit 1; }

# ── Path resolution (always relative to script location) ────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Config with defaults ────────────────────────────────────────────────────────
NETWORK="${STELLAR_NETWORK:-testnet}"
CONTRACT_NAME="${CONTRACT_NAME:-streampay-stream}"
CONTRACTS_DIR="${CONTRACTS_DIR:-contracts}"
FORCE_DEPLOY="${FORCE_DEPLOY:-false}"

CONTRACT_SRC_DIR="$PROJECT_DIR/$CONTRACTS_DIR/contracts/$CONTRACT_NAME"
CONTRACT_TARGET_DIR="$PROJECT_DIR/$CONTRACTS_DIR/target"
CONTRACT_IDS_DIR="$PROJECT_DIR/$CONTRACTS_DIR/.contracts"
CONTRACT_ID_FILE="$CONTRACT_IDS_DIR/$CONTRACT_NAME.id"
WASM_FILE="$CONTRACT_TARGET_DIR/wasm32v1-none/release/$CONTRACT_NAME.wasm"

# ── Env file loading (optional) ─────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-.env.testnet}"
if [[ -f "$PROJECT_DIR/$ENV_FILE" ]]; then
  log "Loading environment from $ENV_FILE"
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/$ENV_FILE"
  set +a
fi

# ── Dependency checks ───────────────────────────────────────────────────────────
command -v stellar >/dev/null 2>&1 || err "stellar CLI is required."
log "stellar CLI found"

if ! rustup target list --installed 2>/dev/null | grep -q wasm32v1-none; then
  err "wasm32v1-none target not installed. Run: rustup target add wasm32v1-none"
fi
log "wasm32v1-none target found"

# ── Required env vars ───────────────────────────────────────────────────────────
if [[ -z "${STELLAR_SEED_SECRET_KEY:-}" ]]; then
  err "STELLAR_SEED_SECRET_KEY is required (set it in $ENV_FILE or export it)"
fi

# ── Build WASM ──────────────────────────────────────────────────────────────────
log "Building $CONTRACT_NAME..."
cd "$CONTRACT_SRC_DIR"
stellar contract build 2>&1 | sed 's/^/[deploy] /'
if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
  err "Build failed"
fi
cd "$PROJECT_DIR"

if [[ ! -f "$WASM_FILE" ]]; then
  # Fallback: search for the WASM in the target tree
  WASM_FILE=$(find "$CONTRACT_TARGET_DIR" -name "$CONTRACT_NAME.wasm" -path '*/release/*' 2>/dev/null | head -1 || true)
  if [[ -z "$WASM_FILE" ]]; then
    err "WASM file not found after build (expected: $WASM_FILE)"
  fi
fi
log "WASM built: $WASM_FILE"

# ── Idempotency check ───────────────────────────────────────────────────────────
if [[ -f "$CONTRACT_ID_FILE" && "$FORCE_DEPLOY" != "true" ]]; then
  EXISTING_ID=$(cat "$CONTRACT_ID_FILE")
  log "Contract $CONTRACT_NAME already deployed at $EXISTING_ID"
  log "Set FORCE_DEPLOY=true to re-deploy"
  echo ""
  echo "Contract ID: $EXISTING_ID"
  exit 0
fi

# ── Deploy ──────────────────────────────────────────────────────────────────────
log "Deploying $CONTRACT_NAME to network: $NETWORK"

if [[ -n "${STELLAR_HORIZON_URL:-}" ]]; then
  DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --network "$NETWORK" \
    --rpc-url "$STELLAR_HORIZON_URL" 2>&1)
else
  DEPLOY_OUTPUT=$(stellar contract deploy \
    --wasm "$WASM_FILE" \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --network "$NETWORK" 2>&1)
fi

CONTRACT_ID=$(echo "$DEPLOY_OUTPUT" | grep '^C' | tail -1 | tr -d '[:space:]')

if [[ -z "$CONTRACT_ID" ]]; then
  err "Deploy failed. Full output:\n$DEPLOY_OUTPUT"
fi

# Basic validation: contract IDs start with C
if [[ ! "$CONTRACT_ID" =~ ^C[0-9A-Za-z]{55}$ ]]; then
  log "WARNING: Contract ID format unexpected: $CONTRACT_ID"
fi

# ── Save contract ID ────────────────────────────────────────────────────────────
mkdir -p "$CONTRACT_IDS_DIR"
echo "$CONTRACT_ID" > "$CONTRACT_ID_FILE"
log "Contract ID saved to $CONTRACT_ID_FILE"

# ── Output summary ──────────────────────────────────────────────────────────────
echo ""
log "Deployment complete!"
echo ""
echo "Contract ID: $CONTRACT_ID"
echo "Network:     $NETWORK"
echo "WASM:        $WASM_FILE"
echo ""
log "Next steps:"
log "  1. Add STREAMPY_STREAM_CONTRACT_ID=$CONTRACT_ID to your $ENV_FILE"
log "  2. Run integration tests against the deployed contract"

# Verify the file was written
if [[ -f "$CONTRACT_ID_FILE" ]]; then
  log "Re-run this script to verify idempotency (it will skip deployment)"
fi
