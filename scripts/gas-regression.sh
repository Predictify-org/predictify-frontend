#!/usr/bin/env bash
# scripts/gas-regression.sh
#
# Gas-budget regression gate for the Soroban contracts.
#
# Measures the size of the release WASM for each contract (a stable, CI-friendly
# proxy for on-chain resource/gas budget) and compares it against a committed
# baseline. CI fails when any contract grows by more than the allowed threshold,
# catching accidental gas/cost regressions before they ship.
#
# Usage:
#   scripts/gas-regression.sh                 # compare against baseline, fail on regression
#   scripts/gas-regression.sh --update        # rebuild and (re)write the baseline
#
# Environment:
#   GAS_REGRESSION_THRESHOLD_PCT   Max allowed growth percent (default: 5)
#   CONTRACTS_DIR                  Cargo workspace dir (default: contracts)

set -euo pipefail

THRESHOLD_PCT="${GAS_REGRESSION_THRESHOLD_PCT:-5}"
CONTRACTS_DIR="${CONTRACTS_DIR:-contracts}"
BASELINE_FILE="${CONTRACTS_DIR}/gas-baseline.txt"
WASM_TARGET="wasm32-unknown-unknown"
PROFILE_DIR="${CONTRACTS_DIR}/target/${WASM_TARGET}/release"

UPDATE_MODE=0
if [[ "${1:-}" == "--update" ]]; then
  UPDATE_MODE=1
fi

echo "==> Building contracts (${WASM_TARGET}, release)"
cargo build \
  --manifest-path "${CONTRACTS_DIR}/Cargo.toml" \
  --target "${WASM_TARGET}" \
  --release

# Collect "<contract> <wasm-byte-size>" lines, sorted for stable diffs.
measure() {
  for wasm in "${PROFILE_DIR}"/*.wasm; do
    [[ -e "${wasm}" ]] || continue
    name="$(basename "${wasm}" .wasm)"
    size="$(wc -c <"${wasm}" | tr -d ' ')"
    echo "${name} ${size}"
  done | sort
}

CURRENT="$(measure)"

if [[ "${UPDATE_MODE}" -eq 1 ]]; then
  echo "${CURRENT}" >"${BASELINE_FILE}"
  echo "==> Baseline written to ${BASELINE_FILE}:"
  cat "${BASELINE_FILE}"
  exit 0
fi

if [[ ! -f "${BASELINE_FILE}" ]]; then
  # First run: seed the baseline and pass. The next run gates against it.
  echo "${CURRENT}" >"${BASELINE_FILE}"
  echo "==> No baseline found; seeded ${BASELINE_FILE} and passing this run:"
  cat "${BASELINE_FILE}"
  exit 0
fi

echo "==> Comparing against baseline (threshold: ${THRESHOLD_PCT}%)"
regressed=0

while read -r name baseline; do
  [[ -n "${name}" ]] || continue
  current="$(echo "${CURRENT}" | awk -v n="${name}" '$1 == n { print $2 }')"

  if [[ -z "${current}" ]]; then
    echo "  ${name}: MISSING from current build" >&2
    regressed=1
    continue
  fi

  # Integer percent growth, rounded down. Guard against a zero baseline.
  if [[ "${baseline}" -eq 0 ]]; then
    delta_pct=100
  else
    delta_pct=$(( (current - baseline) * 100 / baseline ))
  fi

  if [[ "${delta_pct}" -gt "${THRESHOLD_PCT}" ]]; then
    echo "  ${name}: ${baseline} -> ${current} bytes (+${delta_pct}%) REGRESSED" >&2
    regressed=1
  else
    echo "  ${name}: ${baseline} -> ${current} bytes (${delta_pct}%) ok"
  fi
done <"${BASELINE_FILE}"

if [[ "${regressed}" -ne 0 ]]; then
  echo "==> Gas regression gate FAILED (growth exceeded ${THRESHOLD_PCT}%)." >&2
  echo "    If intentional, refresh the baseline: scripts/gas-regression.sh --update" >&2
  exit 1
fi

echo "==> Gas regression gate passed."
