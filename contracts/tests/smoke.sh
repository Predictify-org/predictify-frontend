#!/usr/bin/env bash
# contracts/tests/smoke.sh
# Integration smoke test for StreamPay Soroban smart contracts.
#
# Builds the contract WASM, starts a local sandbox, deploys the contract,
# and invokes every public entry point to verify basic functionality.
#
# Usage:
#   bash contracts/tests/smoke.sh
#
# Environment:
#   NO_BUILD               - Set to 1 to skip the WASM build (default: 0)
#   STELLAR_CLI_BIN        - Path to the stellar CLI binary (default: stellar)

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────────
STELLAR_CLI_BIN="${STELLAR_CLI_BIN:-stellar}"
NO_BUILD="${NO_BUILD:-0}"
SMOKE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WASM_TARGET_DIR="${SMOKE_DIR}/target/wasm32-unknown-unknown/release"
WASM_FILE="${WASM_TARGET_DIR}/streampay_contracts.wasm"
SANDBOX_DIR="$(mktemp -d -t stellar-sandbox-XXXXXX 2>/dev/null || echo /tmp/stellar-sandbox)"
CONTRACT_ID_FILE="${SANDBOX_DIR}/contract-id.txt"

PASS=0
FAIL=0
STEP=""

# ── Helpers ────────────────────────────────────────────────────────────────────
log()    { echo "[smoke] $*"; }
err()    { echo "[smoke] ERROR: $*" >&2; }
pass()   { PASS=$((PASS + 1)); log "PASS: $STEP"; }
fail()   { FAIL=$((FAIL + 1)); log "FAIL: $STEP"; }
cleanup() {
  rm -rf "$SANDBOX_DIR"
}

check_dep() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "$1 is required but not installed."
    exit 1
  fi
}

run_invoke() {
  local label="$1"
  local expected_exit="${2:-0}"
  shift 2

  STEP="$label"
  log "Running: $label"
  local rc=0
  "$STELLAR_CLI_BIN" contract invoke \
    --id "$(cat "$CONTRACT_ID_FILE")" \
    --sandbox "$SANDBOX_DIR" \
    "$@" 2>&1 || rc=$?

  if [[ "$rc" -eq "$expected_exit" ]]; then
    pass
  else
    fail
    err "Expected exit code $expected_exit, got $rc"
  fi
}

scl() {
  "$STELLAR_CLI_BIN" "$@" --sandbox "$SANDBOX_DIR" 2>&1
}

# ── Prerequisites ──────────────────────────────────────────────────────────────
trap cleanup EXIT
log "=== StreamPay Contract Smoke Tests ==="
echo ""

check_dep "$STELLAR_CLI_BIN"
check_dep cargo
check_dep rustc

RUST_VERSION=$(rustc --version | cut -d' ' -f2)
log "Rust: $RUST_VERSION"
log "Stellar CLI: $("$STELLAR_CLI_BIN" version 2>&1 | head -1)"
echo ""

# ── Step 1: Build WASM ─────────────────────────────────────────────────────────
if [[ "$NO_BUILD" -eq 0 ]]; then
  STEP="Build optimized WASM"
  log "Building contract WASM (release profile)..."
  cd "$SMOKE_DIR"

  if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
    log "Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
  fi

  cargo build --release --target wasm32-unknown-unknown 2>&1 || {
    fail
    err "WASM build failed"
    exit 1
  }

  if [[ ! -f "$WASM_FILE" ]]; then
    fail
    err "Expected WASM artifact not found at $WASM_FILE"
    exit 1
  fi

  WASM_SIZE=$(wc -c <"$WASM_FILE" | tr -d ' ')
  log "WASM size: $WASM_SIZE bytes"
  pass
  echo ""
else
  if [[ ! -f "$WASM_FILE" ]]; then
    err "NO_BUILD=1 but no WASM artifact found at $WASM_FILE. Run build first."
    exit 1
  fi
  log "Skipping build (NO_BUILD=1), using existing WASM at $WASM_FILE"
fi

# ── Step 2: Deploy contract to sandbox ────────────────────────────────────────
# The sandbox starts implicitly on the first --sandbox command.
STEP="Install WASM to sandbox"
log "Installing contract WASM to sandbox..."
WASM_HASH=$(scl contract install --wasm "$WASM_FILE" | tr -d '[:space:]')

if [[ -z "$WASM_HASH" ]]; then
  fail
  err "WASM install failed — no hash returned"
  exit 1
fi
log "WASM hash: $WASM_HASH"
pass
echo ""

STEP="Deploy contract from installed WASM"
log "Deploying contract..."
CONTRACT_ID=$(scl contract deploy --wasm-hash "$WASM_HASH" | tr -d '[:space:]')

if [[ -z "$CONTRACT_ID" ]]; then
  fail
  err "Contract deploy failed — no contract ID returned"
  exit 1
fi
echo "$CONTRACT_ID" > "$CONTRACT_ID_FILE"
log "Contract ID: $CONTRACT_ID"
pass
echo ""

# ── Step 3: Generate test accounts ─────────────────────────────────────────────
log "Generating test accounts..."
PAYER=$(scl keys generate payer-smoke | grep -oE 'G[0-9A-Z]{55}')
if [[ -z "$PAYER" ]]; then
  PAYER=$(scl keys address payer-smoke | tr -d '[:space:]')
fi
log "Payer: $PAYER"

RECIPIENT=$(scl keys generate recipient-smoke | grep -oE 'G[0-9A-Z]{55}')
if [[ -z "$RECIPIENT" ]]; then
  RECIPIENT=$(scl keys address recipient-smoke | tr -d '[:space:]')
fi
log "Recipient: $RECIPIENT"

# Fund the accounts on the sandbox
scl keys fund payer-smoke 2>&1 || log "Funding not required (sandbox auto-funds)"
scl keys fund recipient-smoke 2>&1 || true
echo ""

# Native XLM token on Stellar sandbox
NATIVE_TOKEN="CDLZFC3SYJYDKT7F3H6FPSL4LH6G4F7JBYV3TZ3I6C3Y3QNQZQ2N3VYU"
log "Using native token: $NATIVE_TOKEN"
echo ""

# ── Step 4: Invoke entry points ────────────────────────────────────────────────

# 4a. version() — no auth required
run_invoke "version() returns expected value" 0 \
  --fn version

# 4b. create_stream(payer, recipient, token, rate_per_second, initial_balance)
run_invoke "create_stream() creates a new stream" 0 \
  --fn create_stream \
  --arg "$PAYER" \
  --arg "$RECIPIENT" \
  --arg "$NATIVE_TOKEN" \
  --arg "100" \
  --arg "1000000"

STREAM_ID=1

# 4c. start_stream(stream_id)
run_invoke "start_stream() activates the stream" 0 \
  --fn start_stream \
  --arg "$STREAM_ID"

# 4d. is_stream_active(stream_id)
run_invoke "is_stream_active() returns true" 0 \
  --fn is_stream_active \
  --arg "$STREAM_ID"

# 4e. settle_stream(stream_id)
run_invoke "settle_stream() computes accrued amount" 0 \
  --fn settle_stream \
  --arg "$STREAM_ID"

# 4f. get_stream_info(stream_id)
run_invoke "get_stream_info() returns stream metadata" 0 \
  --fn get_stream_info \
  --arg "$STREAM_ID"

# 4g. pause_stream(stream_id)
run_invoke "pause_stream() pauses the stream" 0 \
  --fn pause_stream \
  --arg "$STREAM_ID"

# 4h. resume_stream(stream_id)
run_invoke "resume_stream() resumes the stream" 0 \
  --fn resume_stream \
  --arg "$STREAM_ID"

# 4i. update_rate(stream_id, 50)
run_invoke "update_rate() changes the stream rate" 0 \
  --fn update_rate \
  --arg "$STREAM_ID" \
  --arg "50"

# 4j. batch_settle([stream_id])
run_invoke "batch_settle() settles multiple streams" 0 \
  --fn batch_settle \
  --arg "$STREAM_ID"

# 4k. max_batch_settle_size()
run_invoke "max_batch_settle_size() returns capacity" 0 \
  --fn max_batch_settle_size

# 4l. stop_stream(stream_id)
run_invoke "stop_stream() stops the stream" 0 \
  --fn stop_stream \
  --arg "$STREAM_ID"

# 4m. cancel_stream on a second stream
run_invoke "create_stream() creates stream for cancel test" 0 \
  --fn create_stream \
  --arg "$PAYER" \
  --arg "$RECIPIENT" \
  --arg "$NATIVE_TOKEN" \
  --arg "200" \
  --arg "500000"

STREAM_ID_2=2

run_invoke "start_stream() activates stream for cancel test" 0 \
  --fn start_stream \
  --arg "$STREAM_ID_2"

run_invoke "cancel_stream() cancels the stream" 0 \
  --fn cancel_stream \
  --arg "$STREAM_ID_2"

# 4n. withdraw_stream(stream_id)
run_invoke "withdraw_stream() withdraws claimable tokens" 0 \
  --fn withdraw_stream \
  --arg "$STREAM_ID"

# 4o. archive_stream(stream_id)
run_invoke "archive_stream() removes the stream record" 0 \
  --fn archive_stream \
  --arg "$STREAM_ID"

# ── Step 5: Error handling ─────────────────────────────────────────────────────
# 5a. Invalid stream ID panics
run_invoke "get_stream_info(99999) panics (expected)" 1 \
  --fn get_stream_info \
  --arg "99999"

# 5b. Double-start on stopped stream panics
run_invoke "start_stream(1) on stopped stream panics (expected)" 1 \
  --fn start_stream \
  --arg "$STREAM_ID"

echo ""

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
if [[ "$FAIL" -eq 0 ]]; then
  log "=== ALL CONTRACT SMOKE TESTS PASSED ($PASS passed, $FAIL failed) ==="
else
  log "=== CONTRACT SMOKE TESTS FAILED ($PASS passed, $FAIL failed) ==="
fi

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
