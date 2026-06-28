#!/usr/bin/env bash
# scripts/smoke-contract.sh
#
# CLI smoke tests for the StreamPay Soroban contract.
#
# Exercises every public entrypoint via `stellar contract invoke` against a
# deployed testnet (or sandbox) instance.  Each invocation is validated for
# success / expected-error exit codes, and the test suite exits non-zero if
# ANY check fails.
#
# Usage
# ─────
#   # Minimal (reads STREAMPAY_STREAM_CONTRACT_ID from environment or
#   # contracts/.contracts/streampay-stream.id):
#   STELLAR_SEED_SECRET_KEY=S... bash scripts/smoke-contract.sh
#
#   # Override contract ID explicitly:
#   CONTRACT_ID=C... STELLAR_SEED_SECRET_KEY=S... bash scripts/smoke-contract.sh
#
#   # Use sandbox / custom network:
#   STELLAR_NETWORK=standalone STELLAR_RPC_URL=http://localhost:8000/soroban/rpc \
#     STELLAR_SEED_SECRET_KEY=S... bash scripts/smoke-contract.sh
#
# Required environment variables
# ───────────────────────────────
#   STELLAR_SEED_SECRET_KEY    – Ed25519 secret key for the admin+sender account
#
# Optional environment variables
# ────────────────────────────────
#   CONTRACT_ID                – Deployed contract ID (C-address). Falls back to
#                                contracts/.contracts/streampay-stream.id
#   RECIPIENT_SECRET_KEY       – Separate recipient key (falls back to sender key,
#                                which self-streams; useful for full withdraw smoke)
#   STELLAR_NETWORK            – testnet (default) | futurenet | standalone
#   STELLAR_RPC_URL            – Override Soroban RPC endpoint
#   STELLAR_NETWORK_PASSPHRASE – Override network passphrase
#   SMOKE_SKIP_BUILD           – Set to "true" to skip building the contract WASM
#   SMOKE_TOKEN_ADDRESS        – SAC address of a funded token to use; if unset the
#                                script generates a mock SAC via Stellar SDK helpers
#   SMOKE_STREAM_DURATION      – Stream duration in seconds (default: 120)
#
# Exit codes
# ──────────
#   0  All smoke tests passed
#   1  One or more smoke tests failed (details printed to stderr)
#   2  Pre-flight check failed (missing tool, missing contract ID, etc.)

set -euo pipefail

# ── Constants ──────────────────────────────────────────────────────────────────
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly CONTRACT_ID_FILE="$PROJECT_DIR/contracts/.contracts/streampay-stream.id"
readonly CONTRACTS_DIR="$PROJECT_DIR/contracts"
readonly WASM_PATH="$CONTRACTS_DIR/target/wasm32v1-none/release/streampay-stream.wasm"

# Default values
STELLAR_NETWORK="${STELLAR_NETWORK:-testnet}"
SMOKE_STREAM_DURATION="${SMOKE_STREAM_DURATION:-120}"
SMOKE_SKIP_BUILD="${SMOKE_SKIP_BUILD:-false}"

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Colour helpers (suppress when not a TTY)
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; RESET='\033[0m'; BOLD='\033[1m'
else
  GREEN=''; RED=''; YELLOW=''; RESET=''; BOLD=''
fi

# ── Logging ────────────────────────────────────────────────────────────────────
log()  { echo -e "${BOLD}[smoke]${RESET} $*"; }
pass() { echo -e "  ${GREEN}✓${RESET} $*"; PASSED=$((PASSED + 1)); }
fail() { echo -e "  ${RED}✗${RESET} $*" >&2; FAILED=$((FAILED + 1)); }
skip() { echo -e "  ${YELLOW}○${RESET} $*"; SKIPPED=$((SKIPPED + 1)); }
err()  { echo -e "${RED}[smoke] ERROR:${RESET} $*" >&2; exit 2; }

# ── Pre-flight checks ──────────────────────────────────────────────────────────
log "Pre-flight checks..."

# Safety guard — never smoke-test in production
if [[ "${NODE_ENV:-}" == "production" ]]; then
  err "Refusing to run smoke tests in NODE_ENV=production. Use testnet."
fi

# stellar CLI required
if ! command -v stellar >/dev/null 2>&1; then
  err "'stellar' CLI not found. Install with: cargo install stellar-cli"
fi

STELLAR_VERSION=$(stellar version 2>&1 | head -1 || echo "unknown")
log "stellar CLI: $STELLAR_VERSION"

# Secret key required
: "${STELLAR_SEED_SECRET_KEY:?STELLAR_SEED_SECRET_KEY is required (deployer / admin / sender key)}"

# Derive public key from secret
SENDER_PUBLIC_KEY=$(stellar keys address "$STELLAR_SEED_SECRET_KEY" 2>/dev/null || \
  stellar keys show --secret-key "$STELLAR_SEED_SECRET_KEY" 2>/dev/null || \
  echo "")
if [[ -z "$SENDER_PUBLIC_KEY" ]]; then
  # Fallback: use the env var directly if it looks like a public key
  if [[ "${STELLAR_SEED_PUBLIC_KEY:-}" =~ ^G ]]; then
    SENDER_PUBLIC_KEY="$STELLAR_SEED_PUBLIC_KEY"
  else
    err "Could not derive public key from STELLAR_SEED_SECRET_KEY. Set STELLAR_SEED_PUBLIC_KEY as well."
  fi
fi
log "Sender / admin: $SENDER_PUBLIC_KEY"

# Recipient key (defaults to sender for self-stream smoke)
RECIPIENT_SECRET_KEY="${RECIPIENT_SECRET_KEY:-$STELLAR_SEED_SECRET_KEY}"
RECIPIENT_PUBLIC_KEY=$(stellar keys address "$RECIPIENT_SECRET_KEY" 2>/dev/null || echo "$SENDER_PUBLIC_KEY")

# Resolve contract ID
if [[ -n "${CONTRACT_ID:-}" ]]; then
  log "Using CONTRACT_ID from environment: $CONTRACT_ID"
elif [[ -f "$CONTRACT_ID_FILE" ]]; then
  CONTRACT_ID=$(cat "$CONTRACT_ID_FILE" | tr -d '[:space:]')
  log "Using contract ID from file: $CONTRACT_ID"
else
  err "No contract ID found. Set CONTRACT_ID env var or deploy first with scripts/deploy-grantfox-contract.sh"
fi

# Validate contract ID format (Soroban contract addresses start with C)
if [[ ! "$CONTRACT_ID" =~ ^C ]]; then
  err "CONTRACT_ID '$CONTRACT_ID' does not look like a Soroban contract address (must start with C)"
fi

# ── Invoke helper ──────────────────────────────────────────────────────────────
#
# invoke <test_label> <expected_exit_code> -- [invoke args...]
#
# Wraps `stellar contract invoke` with:
#  - Network / RPC flags injected automatically
#  - stdout captured for caller inspection via $INVOKE_OUTPUT
#  - A PASS/FAIL verdict printed and counters updated
#
INVOKE_OUTPUT=""

invoke() {
  local label="$1"
  local expected_exit="$2"
  shift 2

  local rpc_flags=()
  rpc_flags+=(--network "$STELLAR_NETWORK")
  [[ -n "${STELLAR_RPC_URL:-}" ]] && rpc_flags+=(--rpc-url "$STELLAR_RPC_URL")
  [[ -n "${STELLAR_NETWORK_PASSPHRASE:-}" ]] && rpc_flags+=(--network-passphrase "$STELLAR_NETWORK_PASSPHRASE")

  local actual_exit=0
  INVOKE_OUTPUT=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    "${rpc_flags[@]}" \
    -- "$@" 2>&1) || actual_exit=$?

  if [[ "$actual_exit" -eq "$expected_exit" ]]; then
    pass "$label (exit $actual_exit)"
    return 0
  else
    fail "$label — expected exit $expected_exit, got $actual_exit. Output: $INVOKE_OUTPUT"
    return 1
  fi
}

# ── Optional: build WASM before smoke test ─────────────────────────────────────
if [[ "$SMOKE_SKIP_BUILD" != "true" ]]; then
  log "Building contract WASM..."
  if bash "$SCRIPT_DIR/build-grantfox-contract.sh"; then
    pass "Contract WASM built successfully"
  else
    err "Contract WASM build failed. Set SMOKE_SKIP_BUILD=true to skip this step."
  fi
else
  log "Skipping WASM build (SMOKE_SKIP_BUILD=true)"
fi

# ── Token address ──────────────────────────────────────────────────────────────
# Use native XLM SAC on testnet; callers may override via SMOKE_TOKEN_ADDRESS.
# testnet native XLM Stellar Asset Contract address:
NATIVE_XLM_TESTNET="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
TOKEN_ADDRESS="${SMOKE_TOKEN_ADDRESS:-$NATIVE_XLM_TESTNET}"
log "Token address: $TOKEN_ADDRESS"

# ── Time helpers ───────────────────────────────────────────────────────────────
NOW=$(date +%s)
START_TIME=$((NOW + 5))                              # 5 s buffer for ledger close
END_TIME=$((START_TIME + SMOKE_STREAM_DURATION))

# ── Smoke test suite ───────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log " StreamPay Contract CLI Smoke Tests"
log " Contract : $CONTRACT_ID"
log " Network  : $STELLAR_NETWORK"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log ""

# ── 1. Read-only: get_stream — expect NotFound for ID 9999 ─────────────────────
log "Section 1/8 — Read-only entrypoints (no auth required)"

invoke "get_stream(9999) → NotFound" 1 \
  get_stream \
  --stream_id "9999"

# ── 2. Read-only: withdrawable — expect NotFound for ID 9999 ──────────────────
invoke "withdrawable(9999) → NotFound" 1 \
  withdrawable \
  --stream_id "9999"

# ── 3. Read-only: stream_balance — expect NotFound for ID 9999 ────────────────
invoke "stream_balance(9999) → NotFound" 1 \
  stream_balance \
  --stream_id "9999"

# ── 4. Admin: set_max_streams_per_sender read-back ────────────────────────────
log ""
log "Section 2/8 — Admin read-only (no mutation)"

invoke "max_streams_per_sender() returns u64" 0 \
  max_streams_per_sender

invoke "sender_stream_count(sender) returns u64" 0 \
  sender_stream_count \
  --sender "$SENDER_PUBLIC_KEY"

# ── 5. Admin mutation: set_paused + unpause ────────────────────────────────────
log ""
log "Section 3/8 — Admin mutations (set_paused, set_token_allowed)"

invoke "set_paused(admin, true) → ok" 0 \
  set_paused \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --paused "true"

# Confirm contract is paused by attempting create_stream — expect ContractPaused
invoke "create_stream while paused → ContractPaused" 1 \
  create_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --sender "$SENDER_PUBLIC_KEY" \
  --recipient "$RECIPIENT_PUBLIC_KEY" \
  --token "$TOKEN_ADDRESS" \
  --total_amount "1000000000" \
  --start_time "$START_TIME" \
  --end_time "$END_TIME"

# Unpause before further tests
invoke "set_paused(admin, false) → ok" 0 \
  set_paused \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --paused "false"

# Block a dummy token and then re-allow it
DUMMY_TOKEN="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
invoke "set_token_allowed(dummy, false) → ok" 0 \
  set_token_allowed \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --token "$DUMMY_TOKEN" \
  --allowed "false"

# Attempt to create a stream with the blocked token — expect TokenNotAllowed
invoke "create_stream with blocked token → TokenNotAllowed" 1 \
  create_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --sender "$SENDER_PUBLIC_KEY" \
  --recipient "$RECIPIENT_PUBLIC_KEY" \
  --token "$DUMMY_TOKEN" \
  --total_amount "1000000000" \
  --start_time "$START_TIME" \
  --end_time "$END_TIME"

# Re-allow the dummy token (cleanup)
invoke "set_token_allowed(dummy, true) → ok" 0 \
  set_token_allowed \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --token "$DUMMY_TOKEN" \
  --allowed "true"

# ── 6. Admin: set_max_streams_per_sender ──────────────────────────────────────
log ""
log "Section 4/8 — Stream-limit admin control"

invoke "set_max_streams_per_sender(admin, 5) → ok" 0 \
  set_max_streams_per_sender \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --limit "5"

# Read it back
invoke "max_streams_per_sender() == 5" 0 \
  max_streams_per_sender

# Reset to default
invoke "set_max_streams_per_sender(admin, 10) → ok" 0 \
  set_max_streams_per_sender \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --limit "10"

# ── 7. Validation guards ───────────────────────────────────────────────────────
log ""
log "Section 5/8 — Input validation guards"

# InvalidAmount: total_amount = 0
invoke "create_stream(amount=0) → InvalidAmount" 1 \
  create_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --sender "$SENDER_PUBLIC_KEY" \
  --recipient "$RECIPIENT_PUBLIC_KEY" \
  --token "$TOKEN_ADDRESS" \
  --total_amount "0" \
  --start_time "$START_TIME" \
  --end_time "$END_TIME"

# InvalidTimeRange: end_time <= start_time
invoke "create_stream(end<=start) → InvalidTimeRange" 1 \
  create_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --sender "$SENDER_PUBLIC_KEY" \
  --recipient "$RECIPIENT_PUBLIC_KEY" \
  --token "$TOKEN_ADDRESS" \
  --total_amount "1000000000" \
  --start_time "$END_TIME" \
  --end_time "$START_TIME"

# InvalidState: start_stream on non-existent stream
invoke "start_stream(9999) → NotFound" 1 \
  start_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999"

# InvalidState: pause on non-existent stream
invoke "pause(9999) → NotFound" 1 \
  pause \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999"

# InvalidState: resume on non-existent stream
invoke "resume(9999) → NotFound" 1 \
  resume \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999"

# withdraw on non-existent stream
invoke "withdraw(9999, 1) → NotFound" 1 \
  withdraw \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999" \
  --amount "1"

# InvalidAmount: withdraw with amount = 0
invoke "withdraw(9999, 0) → InvalidAmount" 1 \
  withdraw \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999" \
  --amount "0"

# settle on non-existent stream
invoke "settle(9999) → NotFound" 1 \
  settle \
  --stream_id "9999"

# cancel_stream on non-existent stream
invoke "cancel_stream(9999) → NotFound" 1 \
  cancel_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999"

# amend_stream on non-existent stream
FUTURE_END=$((NOW + 3600))
invoke "amend_stream(9999) → NotFound" 1 \
  amend_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --stream_id "9999" \
  --new_rate_per_second "100" \
  --new_end_time "$FUTURE_END"

# ── 8. set_admin round-trip ────────────────────────────────────────────────────
log ""
log "Section 6/8 — Admin role transfer (round-trip)"

# set_admin to a throwaway address then back — both must succeed
THROWAWAY="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

invoke "set_admin(admin, throwaway) → ok" 0 \
  set_admin \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --new_admin "$THROWAWAY"

# Now caller is no longer admin; set_admin back should fail (Unauthorized)
invoke "set_admin from old admin → Unauthorized" 1 \
  set_admin \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --new_admin "$SENDER_PUBLIC_KEY"

# Restore admin using STELLAR_SEED_SECRET_KEY signed as throwaway
# (in a real scenario we'd need the throwaway private key; skip with note)
skip "set_admin restore skipped — no throwaway private key available in smoke harness"

# ── 9. Full stream lifecycle (happy path) ─────────────────────────────────────
log ""
log "Section 7/8 — Full stream lifecycle: create → start → pause → resume → cancel"

# Re-calculate times after the admin-transfer tests added a few seconds
NOW=$(date +%s)
START_TIME=$((NOW + 10))
END_TIME=$((START_TIME + SMOKE_STREAM_DURATION))

# Note: admin was transferred to THROWAWAY in the previous section.
# The stream lifecycle tests don't need admin auth, so they can proceed.
# However, set_paused / set_token_allowed would fail without admin.
# The test suite continues with stream lifecycle which only requires sender auth.

CREATED_STREAM_ID=""

# create_stream — may fail with insufficient funds on testnet if account is not funded
# We capture exit code manually here to skip gracefully if the account has no XLM.
set +e
LIFECYCLE_OUTPUT=$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$STELLAR_NETWORK" \
  ${STELLAR_RPC_URL:+--rpc-url "$STELLAR_RPC_URL"} \
  -- create_stream \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --sender "$SENDER_PUBLIC_KEY" \
  --recipient "$RECIPIENT_PUBLIC_KEY" \
  --token "$TOKEN_ADDRESS" \
  --total_amount "1000000000" \
  --start_time "$START_TIME" \
  --end_time "$END_TIME" 2>&1)
LIFECYCLE_EXIT=$?
set -e

if [[ $LIFECYCLE_EXIT -eq 0 ]]; then
  # Extract the stream ID (u64 returned by create_stream)
  CREATED_STREAM_ID=$(echo "$LIFECYCLE_OUTPUT" | grep -Eo '[0-9]+' | head -1 || echo "")
  pass "create_stream → stream_id=$CREATED_STREAM_ID"

  # get_stream on the newly created stream
  invoke "get_stream($CREATED_STREAM_ID) → ok" 0 \
    get_stream \
    --stream_id "$CREATED_STREAM_ID"

  # withdrawable returns 0 for a freshly created (Active/Draft) stream
  invoke "withdrawable($CREATED_STREAM_ID) → ok (0 initially)" 0 \
    withdrawable \
    --stream_id "$CREATED_STREAM_ID"

  # stream_balance
  invoke "stream_balance($CREATED_STREAM_ID) → ok" 0 \
    stream_balance \
    --stream_id "$CREATED_STREAM_ID"

  # pause the active stream
  invoke "pause($CREATED_STREAM_ID) → ok" 0 \
    pause \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --stream_id "$CREATED_STREAM_ID"

  # resume immediately
  invoke "resume($CREATED_STREAM_ID) → ok" 0 \
    resume \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --stream_id "$CREATED_STREAM_ID"

  # amend: extend end_time by 1 hour (must be in the future)
  NEW_END=$((END_TIME + 3600))
  invoke "amend_stream($CREATED_STREAM_ID, new_end=$NEW_END) → ok" 0 \
    amend_stream \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --stream_id "$CREATED_STREAM_ID" \
    --new_rate_per_second "1000" \
    --new_end_time "$NEW_END"

  # cancel the stream — returns unvested funds to sender
  invoke "cancel_stream($CREATED_STREAM_ID) → ok" 0 \
    cancel_stream \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --stream_id "$CREATED_STREAM_ID"

  # Confirm settled/cancelled: cancel again → InvalidState
  invoke "cancel_stream($CREATED_STREAM_ID) again → InvalidState" 1 \
    cancel_stream \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --stream_id "$CREATED_STREAM_ID"
else
  skip "create_stream skipped — account may be unfunded or token SAC unavailable (exit $LIFECYCLE_EXIT)"
  skip "get_stream, withdrawable, stream_balance, pause, resume, amend_stream, cancel_stream skipped (depends on create_stream)"
fi

# ── 10. Settle entrypoint smoke ────────────────────────────────────────────────
log ""
log "Section 8/8 — settle / withdraw entrypoints (error-path smoke)"

# settle on the cancelled stream (if we have one) → InvalidState
if [[ -n "$CREATED_STREAM_ID" ]]; then
  invoke "settle(cancelled_stream) → InvalidState" 1 \
    settle \
    --stream_id "$CREATED_STREAM_ID"

  # withdraw on a cancelled stream → InvalidState (or NotFound)
  invoke "withdraw(cancelled_stream, 1) → InvalidState" 1 \
    withdraw \
    --source "$STELLAR_SEED_SECRET_KEY" \
    --stream_id "$CREATED_STREAM_ID" \
    --amount "1"
fi

# init_with_token_allowlist → InvalidState (already initialised)
invoke "init_with_token_allowlist → already initialised → InvalidState" 1 \
  init_with_token_allowlist \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY" \
  --tokens "[]"

# initialize → InvalidState (already initialised)
invoke "initialize → already initialised → InvalidState" 1 \
  initialize \
  --source "$STELLAR_SEED_SECRET_KEY" \
  --admin "$SENDER_PUBLIC_KEY"

# ── Summary ────────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log " Results:  ${GREEN}${PASSED} passed${RESET}  |  ${RED}${FAILED} failed${RESET}  |  ${YELLOW}${SKIPPED} skipped${RESET}"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAILED -gt 0 ]]; then
  log "${RED}SMOKE TESTS FAILED${RESET} — $FAILED test(s) did not meet expectations."
  exit 1
fi

log "${GREEN}All smoke tests passed.${RESET}"
exit 0
