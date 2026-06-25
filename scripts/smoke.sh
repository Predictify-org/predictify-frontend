#!/usr/bin/env bash
# scripts/smoke.sh
# Smoke test suite for StreamPay Frontend.
#
# Validates the app boots and basic API paths respond correctly.
# Can be pointed at any running instance (local, staging, CI) via SMOKE_TARGET_URL.
#
# Usage:
#   export SMOKE_TARGET_URL=http://localhost:3000
#   bash scripts/smoke.sh
#
# Without SMOKE_TARGET_URL, the script starts a local Next.js production server
# on port 3000 (or $PORT), runs checks, and tears it down.
#
# Environment:
#   SMOKE_TARGET_URL   - Base URL of the target instance (default: starts local)
#   SMOKE_AUTH_TOKEN   - Bearer token for authenticated requests (optional)
#   PORT               - Port for local server (default: 3791)
#   ALLOWED_ORIGINS    - Required if starting local server (default: http://localhost:3791)
#   JWT_SECRET         - Required if starting local server (default: dev secret)
#   STELLAR_NETWORK    - Required if starting local server (default: testnet)

set -euo pipefail

# ── Constants ──────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
STEP=""
SMOKE_PORT="${PORT:-3791}"
RESPONSE_FILE="$(mktemp -t smoke-response-XXXXXX 2>/dev/null || echo /tmp/smoke-response.txt)"

# ── Helpers ────────────────────────────────────────────────────────────────────
log()  { echo "[smoke] $*"; }
err()  { echo "[smoke] ERROR: $*" >&2; }
pass() { PASS=$((PASS + 1)); log "PASS: $STEP"; }
fail() { FAIL=$((FAIL + 1)); log "FAIL: $STEP"; }

cleanup_temp() {
  rm -f "$RESPONSE_FILE"
}

check_dep() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "$1 is required but not installed."
    exit 1
  fi
}

# Calls curl and returns 0 if HTTP status matches expected, 1 otherwise.
# Response body is saved to $RESPONSE_FILE.
# Usage: try_curl <expected_status> <url> [method] [body]
try_curl() {
  local expected_status="$1"
  local url="$2"
  local method="${3:-GET}"
  local body="${4:-}"

  local args=(-sS -w "\n%{http_code}" --max-time 10 -o "$RESPONSE_FILE")
  if [[ -n "${SMOKE_AUTH_TOKEN:-}" ]]; then
    args+=(-H "Authorization: Bearer $SMOKE_AUTH_TOKEN")
  fi
  if [[ "$method" == "POST" ]]; then
    args+=(-X POST)
    if [[ -n "$body" ]]; then
      args+=(-H "Content-Type: application/json" -d "$body")
    fi
  fi

  local curl_output http_code
  curl_output=$(curl "${args[@]}" "$url" 2>&1) || {
    fail
    err "curl exited with code $?"
    return 1
  }

  http_code=$(echo "$curl_output" | tail -1)

  if [[ "$http_code" != "$expected_status" ]]; then
    fail
    err "Expected HTTP $expected_status, got $http_code"
    if [[ -s "$RESPONSE_FILE" ]]; then
      err "Response: $(cat "$RESPONSE_FILE")"
    fi
    return 1
  fi

  pass
}

# ── Prerequisites ──────────────────────────────────────────────────────────────
trap cleanup_temp EXIT
log "=== StreamPay Smoke Tests ==="
echo ""
check_dep curl
check_dep node

# ── Local server boot ──────────────────────────────────────────────────────────
SERVER_PID=""
cleanup_server() {
  if [[ -n "$SERVER_PID" ]]; then
    log "Shutting down local server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    log "Server stopped."
  fi
}
trap 'cleanup_server; cleanup_temp' EXIT

if [[ -z "${SMOKE_TARGET_URL:-}" ]]; then
  log "SMOKE_TARGET_URL not set — starting local production server on port $SMOKE_PORT..."

  JWT_SECRET="${JWT_SECRET:-smoke-test-secret-key-at-least-32-chars!!}"
  STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
  ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:${SMOKE_PORT}}"
  NODE_ENV="${NODE_ENV:-production}"
  PORT="$SMOKE_PORT"
  export JWT_SECRET STELLAR_NETWORK ALLOWED_ORIGINS NODE_ENV PORT

  node scripts/run-from-realpath.mjs next start -p "$SMOKE_PORT" &
  SERVER_PID=$!

  # Wait for server to be ready
  log "Waiting for server to be ready..."
  local_ready_url="http://localhost:${SMOKE_PORT}/api/readyz"

  local i=0
  while true; do
    if curl -sS -o /dev/null --max-time 2 "$local_ready_url" 2>/dev/null; then
      SMOKE_TARGET_URL="http://localhost:${SMOKE_PORT}"
      log "Server ready at $SMOKE_TARGET_URL"
      break
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      err "Server process exited unexpectedly"
      exit 1
    fi
    i=$((i + 1))
    if [[ "$i" -ge 30 ]]; then
      err "Server did not become ready within 30 seconds"
      exit 1
    fi
    sleep 1
  done
else
  log "Target: $SMOKE_TARGET_URL"
fi

echo ""

# ── Smoke Tests ────────────────────────────────────────────────────────────────
ALL_PASSED=true

# Test 1: Health check
STEP="GET /api/readyz returns 200"
log "Running: $STEP"
try_curl 200 "${SMOKE_TARGET_URL}/api/readyz" || ALL_PASSED=false
echo ""

# Test 2: List streams
STEP="GET /api/streams returns 200"
log "Running: $STEP"
try_curl 200 "${SMOKE_TARGET_URL}/api/streams" || ALL_PASSED=false

if [[ "$ALL_PASSED" == "true" ]] && [[ -s "$RESPONSE_FILE" ]]; then
  if node -e "
    const fs = require('fs');
    const d = fs.readFileSync('$RESPONSE_FILE', 'utf8');
    const j = JSON.parse(d);
    if (typeof j.data === 'undefined' && typeof j.error === 'undefined') process.exit(1);
  " 2>/dev/null; then
    :
  else
    STEP="GET /api/streams response has valid shape"
    fail
    ALL_PASSED=false
  fi
fi
echo ""

# Test 3: Create a stream
STEP="POST /api/streams creates a draft stream (201)"
log "Running: $STEP"
CREATE_BODY='{"rate":"1 XLM / month","recipient":"Smoke Test Recipient","schedule":"Pays every 30 days"}'
try_curl 201 "${SMOKE_TARGET_URL}/api/streams" POST "$CREATE_BODY" || ALL_PASSED=false

STREAM_ID=""
if [[ "$ALL_PASSED" == "true" ]] && [[ -s "$RESPONSE_FILE" ]]; then
  STREAM_ID=$(node -e "
    const fs = require('fs');
    const d = fs.readFileSync('$RESPONSE_FILE', 'utf8');
    try {
      const j = JSON.parse(d);
      process.stdout.write(j.data?.id || '');
    } catch(e) { process.exit(1); }
  " 2>/dev/null || true)
fi
echo ""

# Test 4: Settle the created stream
if [[ -n "$STREAM_ID" ]]; then
  STEP="POST /api/streams/$STREAM_ID/settle settles the stream (200)"
  log "Running: $STEP"
  try_curl 200 "${SMOKE_TARGET_URL}/api/streams/${STREAM_ID}/settle" POST || ALL_PASSED=false
else
  STEP="POST /api/streams/*/settle (skipped — no stream to settle)"
  log "SKIP: $STEP"
fi
echo ""

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
if [[ "$ALL_PASSED" == "true" ]]; then
  log "=== ALL SMOKE TESTS PASSED ($PASS passed, $FAIL failed) ==="
else
  log "=== SMOKE TESTS FAILED ($PASS passed, $FAIL failed) ==="
fi

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
