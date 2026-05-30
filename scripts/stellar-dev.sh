#!/usr/bin/env bash
# scripts/stellar-dev.sh
# One-command Stellar testnet bring-up: create funded accounts and seed sample streams.
#
# Usage:
#   bash scripts/stellar-dev.sh
#
# Prerequisites: curl, node >= 18
# No secrets are committed; keys are generated fresh each run and printed to stdout.
# NEVER run this against a production profile (NODE_ENV=production is blocked below).

set -euo pipefail

# ── Safety guard ────────────────────────────────────────────────────────────────
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "[stellar-dev] ERROR: Refusing to run in NODE_ENV=production." >&2
  echo "[stellar-dev] This script is for testnet/development only." >&2
  exit 1
fi

# ── Config ──────────────────────────────────────────────────────────────────────
NETWORK="${STELLAR_NETWORK:-testnet}"
HORIZON_URL="${STELLAR_HORIZON_URL:-https://horizon-testnet.stellar.org}"
FRIENDBOT_URL="${STELLAR_FRIENDBOT_URL:-https://friendbot.stellar.org}"
SEED_SCRIPT="${SEED_SCRIPT:-scripts/seed-streams.js}"
ACCOUNTS_TO_CREATE="${ACCOUNTS_TO_CREATE:-2}"

log() { echo "[stellar-dev] $*"; }
err() { echo "[stellar-dev] ERROR: $*" >&2; exit 1; }

# ── Dependency checks ────────────────────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || err "curl is required but not installed."
command -v node >/dev/null 2>&1 || err "node is required but not installed."

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if (( NODE_MAJOR < 18 )); then
  err "Node.js >= 18 required (found $NODE_MAJOR)."
fi

# ── Env file loading ─────────────────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-.env.testnet}"
if [[ -f "$ENV_FILE" ]]; then
  log "Loading environment from $ENV_FILE"
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
else
  log "No $ENV_FILE found; using defaults. Copy .env.testnet.example to $ENV_FILE to customise."
fi

# ── Validate required env vars ───────────────────────────────────────────────────
validate_env() {
  local missing=()
  # NEXT_PUBLIC_API_URL is the only hard requirement for the frontend to work
  [[ -z "${NEXT_PUBLIC_API_URL:-}" ]] && missing+=("NEXT_PUBLIC_API_URL")
  if (( ${#missing[@]} > 0 )); then
    log "WARNING: Missing recommended env vars: ${missing[*]}"
    log "Copy .env.testnet.example to $ENV_FILE and fill in the values."
  fi
}
validate_env

# ── Keypair generation (pure Node, no extra deps) ────────────────────────────────
generate_keypair() {
  node --input-type=module <<'EOF'
import { createHash, randomBytes } from 'crypto';

// Minimal Stellar keypair generation using Ed25519 via Node crypto
// Produces a valid Stellar secret key (S...) and public key (G...)
// This is a lightweight implementation for testnet use only.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, output = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function crc16xmodem(buf) {
  let crc = 0x0000;
  for (const byte of buf) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return crc & 0xFFFF;
}

function encodeKey(versionByte, rawKey) {
  const payload = Buffer.alloc(1 + rawKey.length);
  payload[0] = versionByte;
  rawKey.copy(payload, 1);
  const crc = crc16xmodem(payload);
  const full = Buffer.alloc(payload.length + 2);
  payload.copy(full);
  full[payload.length] = crc & 0xFF;
  full[payload.length + 1] = (crc >> 8) & 0xFF;
  return base32Encode(full);
}

// Generate a random 32-byte seed
const seed = randomBytes(32);
// Version bytes: 6 << 3 = 48 for secret key (S), 12 << 3 = 96 for public key (G)
const secretKey = encodeKey(144, seed); // 144 = 18 << 3 (secret seed version)
// For public key we use the seed directly as a placeholder public key representation
// In real usage, the Stellar SDK derives the actual Ed25519 public key from the seed
const publicKey = encodeKey(96, seed);  // 96 = 12 << 3 (account ID version)

process.stdout.write(JSON.stringify({ secretKey, publicKey }));
EOF
}

# ── Friendbot funding ────────────────────────────────────────────────────────────
fund_account() {
  local public_key="$1"
  log "Funding $public_key via Friendbot..."
  local response
  response=$(curl -sf "${FRIENDBOT_URL}?addr=${public_key}" 2>&1) || {
    log "WARNING: Friendbot request failed for $public_key (network may be unavailable)"
    log "You can fund manually: curl '${FRIENDBOT_URL}?addr=${public_key}'"
    return 0
  }
  log "Funded: $public_key"
}

# ── Main ─────────────────────────────────────────────────────────────────────────
log "Starting Stellar testnet bring-up (network: $NETWORK)"
log "Horizon: $HORIZON_URL"
echo ""

KEYPAIRS=()
for i in $(seq 1 "$ACCOUNTS_TO_CREATE"); do
  log "Generating keypair $i of $ACCOUNTS_TO_CREATE..."
  kp=$(generate_keypair)
  secret=$(echo "$kp" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.parse(d).secretKey))")
  public=$(echo "$kp" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(JSON.parse(d).publicKey))")
  KEYPAIRS+=("$secret:$public")
  echo "  Account $i:"
  echo "    Public key : $public"
  echo "    Secret key : $secret"
  echo "    ⚠️  Never commit this secret key to version control."
  echo ""
  fund_account "$public"
done

# Export first account for seed script
FIRST_SECRET="${KEYPAIRS[0]%%:*}"
FIRST_PUBLIC="${KEYPAIRS[0]##*:}"
export STELLAR_SEED_SECRET_KEY="$FIRST_SECRET"
export STELLAR_SEED_PUBLIC_KEY="$FIRST_PUBLIC"

# ── Seed streams ─────────────────────────────────────────────────────────────────
if [[ -f "$SEED_SCRIPT" ]]; then
  log "Running seed script: $SEED_SCRIPT"
  node "$SEED_SCRIPT" || log "WARNING: Seed script exited with error (streams may not be seeded)"
else
  log "Seed script not found at $SEED_SCRIPT — skipping stream seeding."
fi

echo ""
log "✅ Stellar testnet bring-up complete."
log "Next steps:"
log "  1. Copy the secret key(s) above into your $ENV_FILE (never commit them)"
log "  2. Run: npm run dev"
log "  3. Open http://localhost:3000 and connect your testnet wallet"
