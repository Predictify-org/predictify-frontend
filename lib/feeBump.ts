/**
 * feeBump.ts
 *
 * Detects when a Soroban/Stellar transaction submission fails due to
 * insufficient fees and automatically wraps it in a fee-bump transaction
 * using a dedicated fee-bump account.
 *
 * ## How it works
 *
 *   1. After `evaluateWithdrawalState` prepares a withdrawal, the route
 *      handler calls `maybeFeeBump(result)`.
 *   2. If the withdrawal failed with a fee-related error code
 *      (`tx_insufficient_fee`, `tx_too_late`, or an `INSUFFICIENT_FEE`
 *      failure code), we build a fee-bump envelope using the secret key
 *      in `FEE_BUMP_SECRET_KEY`.
 *   3. The bumped transaction is submitted to the configured Horizon
 *      endpoint. On success the stream's `settlementTxHash` is updated
 *      to point at the new fee-bump tx hash.
 *
 * ## Environment variables
 *
 *   - `FEE_BUMP_SECRET_KEY`  — Stellar secret key of the fee-bump payer.
 *   - `HORIZON_URL`          — Horizon endpoint (defaults to testnet).
 *   - `FEE_BUMP_MAX_FEE`     — Maximum base fee (in stroops) for the
 *                               bumped transaction. Default: 100_000.
 */

import type { Stream } from "@/app/types/openapi";

// ── Configuration ──────────────────────────────────────────────────────────

const HORIZON_URL =
  process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";

const FEE_BUMP_SECRET_KEY = process.env.FEE_BUMP_SECRET_KEY ?? "";

const FEE_BUMP_MAX_FEE = Number(process.env.FEE_BUMP_MAX_FEE ?? 100_000);

// ── Types ──────────────────────────────────────────────────────────────────

export type FeeBumpResult = {
  bumped: boolean;
  newTxHash?: string;
  error?: string;
};

type EvaluationResult = {
  stream: Stream;
  alert: boolean;
};

// ── Fee-error detection ────────────────────────────────────────────────────

/**
 * Error codes / substrings that indicate the original transaction failed
 * because of an insufficient fee.
 */
const FEE_ERROR_PATTERNS = [
  "tx_insufficient_fee",
  "tx_too_late",
  "INSUFFICIENT_FEE",
] as const;

/**
 * Returns `true` when the withdrawal result looks like it failed due to
 * an insufficient fee.
 */
export function isFeeRelatedFailure(result: EvaluationResult): boolean {
  const withdrawal = result.stream.withdrawal;
  if (!withdrawal) return false;
  if (withdrawal.state !== "failed") return false;

  const code = withdrawal.failureCode ?? "";
  return FEE_ERROR_PATTERNS.some((pattern) => code.includes(pattern));
}

// ── Fee-bump logic ─────────────────────────────────────────────────────────

/**
 * If the withdrawal result indicates a fee-related failure **and** the
 * `FEE_BUMP_SECRET_KEY` environment variable is configured, attempt to
 * wrap the original transaction envelope in a fee-bump transaction and
 * submit it.
 *
 * Returns the original `result` unchanged when:
 *   - The failure is not fee-related.
 *   - No `FEE_BUMP_SECRET_KEY` is configured.
 *   - No `settlementTxHash` is available to look up the original tx.
 *
 * On successful fee-bump submission the stream is mutated in place:
 *   - `stream.settlementTxHash` is updated to the new hash.
 *   - `stream.withdrawal.state` is reset to `"pending"`.
 *   - `stream.withdrawal.failureCode` is cleared.
 */
export async function maybeFeeBump(
  result: EvaluationResult,
  fetcher: typeof fetch = fetch,
): Promise<{ result: EvaluationResult; feeBump: FeeBumpResult }> {
  // ── Guard: not a fee failure ──────────────────────────────────────────
  if (!isFeeRelatedFailure(result)) {
    return { result, feeBump: { bumped: false } };
  }

  // ── Guard: no secret key configured ───────────────────────────────────
  if (!FEE_BUMP_SECRET_KEY) {
    return {
      result,
      feeBump: {
        bumped: false,
        error: "FEE_BUMP_SECRET_KEY is not configured",
      },
    };
  }

  const txHash = result.stream.settlementTxHash ?? result.stream.withdrawal?.settlementTxHash;
  if (!txHash) {
    return {
      result,
      feeBump: {
        bumped: false,
        error: "No settlement tx hash available to fee-bump",
      },
    };
  }

  // ── 1. Fetch the original transaction envelope from Horizon ───────────
  let originalEnvelopeXdr: string;
  try {
    const txRes = await fetcher(
      `${HORIZON_URL}/transactions/${txHash}`,
      { cache: "no-store" },
    );
    if (!txRes.ok) {
      return {
        result,
        feeBump: {
          bumped: false,
          error: `Failed to fetch original tx: HTTP ${txRes.status}`,
        },
      };
    }
    const txData = (await txRes.json()) as { envelope_xdr?: string };
    if (!txData.envelope_xdr) {
      return {
        result,
        feeBump: {
          bumped: false,
          error: "Original transaction has no envelope_xdr",
        },
      };
    }
    originalEnvelopeXdr = txData.envelope_xdr;
  } catch (err) {
    return {
      result,
      feeBump: {
        bumped: false,
        error: `Error fetching original tx: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  // ── 2. Build and submit the fee-bump transaction ──────────────────────
  try {
    const submitRes = await fetcher(`${HORIZON_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        tx: buildFeeBumpEnvelope(originalEnvelopeXdr),
      }).toString(),
    });

    if (!submitRes.ok) {
      const errorBody = await submitRes.text().catch(() => "unknown");
      return {
        result,
        feeBump: {
          bumped: false,
          error: `Fee-bump submission failed: HTTP ${submitRes.status} — ${errorBody}`,
        },
      };
    }

    const submitData = (await submitRes.json()) as { hash?: string };
    const newHash = submitData.hash;

    if (!newHash) {
      return {
        result,
        feeBump: {
          bumped: false,
          error: "Fee-bump submission succeeded but returned no hash",
        },
      };
    }

    // ── 3. Update the stream with the new tx hash ─────────────────────
    result.stream.settlementTxHash = newHash;
    if (result.stream.withdrawal) {
      result.stream.withdrawal.state = "pending";
      result.stream.withdrawal.failureCode = undefined;
      result.stream.withdrawal.settlementTxHash = newHash;
      result.stream.withdrawal.attempts = 0;
    }

    return {
      result,
      feeBump: { bumped: true, newTxHash: newHash },
    };
  } catch (err) {
    return {
      result,
      feeBump: {
        bumped: false,
        error: `Fee-bump submission error: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}

// ── Envelope builder ───────────────────────────────────────────────────────

/**
 * Build a fee-bump transaction envelope XDR string.
 *
 * In a production deployment this would use `@stellar/stellar-sdk` to
 * properly parse the inner envelope, construct a `FeeBumpTransaction`,
 * sign it with the fee-bump keypair, and serialise it back to XDR.
 *
 * This placeholder implementation encodes the intent so the module can
 * be unit-tested end-to-end without pulling in the full SDK at import
 * time (which would break lightweight test environments).
 *
 * **TODO**: Replace with real SDK calls when `@stellar/stellar-sdk` is
 * added to `dependencies`.
 */
function buildFeeBumpEnvelope(innerEnvelopeXdr: string): string {
  // Tag the envelope so tests can assert the correct input was used.
  return `fee_bump:${FEE_BUMP_MAX_FEE}:${innerEnvelopeXdr}`;
}
