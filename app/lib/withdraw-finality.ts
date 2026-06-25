/**
 * withdraw-finality.ts
 *
 * Evaluates whether a settlement transaction has reached sufficient
 * confirmation depth on the Stellar ledger before allowing a withdrawal
 * to finalize. This prevents a chain reorg from reversing a paid-out
 * withdrawal.
 *
 * ## Finality model
 *
 * Stellar closes a ledger roughly every 5 seconds. A transaction is
 * considered final once it is buried at least `MIN_CONFIRMATION_DEPTH`
 * ledgers deep (i.e. `currentLedger - txLedger >= MIN_CONFIRMATION_DEPTH`).
 *
 * The reorg window is the number of ledgers within which a reorg could
 * theoretically reverse a transaction. We require the tx to be buried
 * beyond this window before transitioning to `withdrawn`.
 *
 * ## State machine
 *
 *   pending  →  (depth reached)  →  succeeded  →  stream.status = withdrawn
 *            →  (reorg detected) →  failed      (REORG_DETECTED)
 *            →  (stalled)        →  failed      (FINALITY_TIMEOUT)
 *            →  (no tx hash)     →  failed      (SETTLEMENT_TX_MISSING)
 *
 * ## Alert conditions
 * An alert is emitted when:
 *   - No settlement tx hash is present.
 *   - A reorg is detected (tx no longer on-chain).
 *   - Finality has stalled beyond FINALITY_STALL_THRESHOLD_MS.
 */

import type { Stream, WithdrawalStatus } from "@/app/types/openapi";

// ── Configuration ─────────────────────────────────────────────────────────────

const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";

/**
 * Minimum number of ledger confirmations required before a withdrawal
 * is considered final. Stellar's reorg window is effectively 0–1 ledgers
 * in practice, but we use a conservative default of 3 for safety.
 * Override via WITHDRAWAL_MIN_CONFIRMATION_DEPTH env var.
 */
export const MIN_CONFIRMATION_DEPTH: number =
  Number(process.env.WITHDRAWAL_MIN_CONFIRMATION_DEPTH ?? 3);

/**
 * Maximum number of poll attempts before marking the withdrawal as failed.
 */
const MAX_ATTEMPTS = 10;

/**
 * Emit a stall alert when finality has not been reached within this window.
 */
const FINALITY_STALL_THRESHOLD_MS = 5 * 60_000; // 5 minutes

const PAGE_LIMIT      = 20;
const PAGE_SCAN_LIMIT = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Injectable fetch implementation.
 * Pass a mock in tests to avoid real network calls.
 */
export type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

/**
 * On-chain transaction record returned by Horizon.
 * We only use the fields relevant to finality checking.
 */
type HorizonTxRecord = {
  id?:          string;
  hash?:        string;
  successful?:  boolean;
  ledger?:      number;   // ledger sequence the tx was included in
  created_at?:  string;
};

type HorizonPage = {
  _embedded?: { records?: HorizonTxRecord[] };
  _links?:    { next?: { href?: string } };
};

/**
 * Result of a Horizon ledger-info query.
 */
type HorizonLedgerInfo = {
  sequence?: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toAttempts(value: number | undefined): number {
  return !value || value < 0 ? 0 : value;
}

/** Return the age of a withdrawal request in milliseconds. */
function getAgeMs(requestedAt: string, now: Date): number {
  const started = Date.parse(requestedAt);
  return Number.isNaN(started) ? 0 : Math.max(0, now.getTime() - started);
}

/** Extract the `cursor` query parameter from a Horizon `_links.next.href`. */
function getNextCursorFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const cursor = new URL(href).searchParams.get("cursor");
    return cursor ?? undefined;
  } catch {
    return undefined;
  }
}

// ── Horizon queries ───────────────────────────────────────────────────────────

/**
 * Fetch the current ledger sequence from Horizon.
 * Returns undefined on network error so callers can degrade gracefully.
 */
export async function fetchCurrentLedger(fetcher: FetchLike): Promise<number | undefined> {
  try {
    const res = await fetcher(`${HORIZON_URL}/ledgers?order=desc&limit=1`, {
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      _embedded?: { records?: HorizonLedgerInfo[] };
    };
    return data._embedded?.records?.[0]?.sequence;
  } catch {
    return undefined;
  }
}

/**
 * Search for a transaction by hash across paginated Horizon results.
 * Returns the matched record (including its ledger sequence) and the
 * next pagination cursor.
 */
export async function findTransactionWithPagination(
  accountId: string,
  txHash: string,
  cursor: string | undefined,
  fetcher: FetchLike,
): Promise<{ matchedRecord?: HorizonTxRecord; nextCursor?: string }> {
  let currentCursor = cursor;

  for (let page = 0; page < PAGE_SCAN_LIMIT; page++) {
    const query = new URL(`${HORIZON_URL}/accounts/${accountId}/transactions`);
    query.searchParams.set("order", "desc");
    query.searchParams.set("limit", String(PAGE_LIMIT));
    if (currentCursor) query.searchParams.set("cursor", currentCursor);

    let res: Response;
    try {
      res = await fetcher(query.toString(), { cache: "no-store" });
    } catch {
      break;
    }
    if (!res.ok) break;

    const pageData = (await res.json()) as HorizonPage;
    const records  = pageData._embedded?.records ?? [];

    const matched = records.find(
      (r) => r.hash === txHash && r.successful !== false,
    );
    if (matched) {
      return { matchedRecord: matched, nextCursor: currentCursor };
    }

    const nextCursor = getNextCursorFromHref(pageData._links?.next?.href);
    if (!nextCursor || nextCursor === currentCursor) {
      return { nextCursor: currentCursor };
    }
    currentCursor = nextCursor;
  }

  return { nextCursor: currentCursor };
}

/**
 * Compute the confirmation depth of a transaction.
 *
 * @param txLedger      Ledger sequence the tx was included in.
 * @param currentLedger Current tip ledger sequence.
 * @returns             Number of confirmations (0 if tx is at the tip).
 */
export function computeConfirmationDepth(
  txLedger: number,
  currentLedger: number,
): number {
  return Math.max(0, currentLedger - txLedger);
}

// ── Core evaluator ────────────────────────────────────────────────────────────

/**
 * Evaluate the withdrawal state for a stream.
 *
 * Called on every `POST /api/streams/:id/withdraw` poll. Transitions the
 * stream through the finality state machine:
 *
 *   1. No tx hash → failed (SETTLEMENT_TX_MISSING) + alert.
 *   2. Tx not found on-chain → pending (may be reorg) or failed (REORG_DETECTED)
 *      if previously confirmed but now missing.
 *   3. Tx found but depth < MIN_CONFIRMATION_DEPTH → pending, keep polling.
 *   4. Tx found and depth ≥ MIN_CONFIRMATION_DEPTH → succeeded → withdrawn.
 *   5. Stalled beyond FINALITY_STALL_THRESHOLD_MS → alert (still pending).
 *   6. MAX_ATTEMPTS exceeded → failed (FINALITY_TIMEOUT) + alert.
 *
 * @param stream   Current stream record (mutated in-place and returned).
 * @param now      Current timestamp (injectable for testing).
 * @param fetcher  HTTP fetch implementation (injectable for testing).
 * @returns        Updated stream and whether an alert should be emitted.
 */
export async function evaluateWithdrawalState(
  stream: Stream,
  now: Date,
  fetcher: FetchLike = fetch,
): Promise<{ stream: Stream; alert: boolean }> {
  const existing        = stream.withdrawal;
  const requestedAt     = existing?.requestedAt ?? now.toISOString();
  const attempts        = toAttempts(existing?.attempts) + 1;
  const settlementTxHash = stream.settlementTxHash ?? existing?.settlementTxHash;

  // Build the next withdrawal status (will be mutated below).
  const next: WithdrawalStatus = {
    state:          "pending",
    requestedAt,
    lastCheckedAt:  now.toISOString(),
    attempts,
    settlementTxHash,
    horizonCursor:  existing?.horizonCursor,
  };

  // ── 1. No tx hash ──────────────────────────────────────────────────────────
  if (!settlementTxHash) {
    next.state       = "failed";
    next.failureCode = "SETTLEMENT_TX_MISSING";
    stream.withdrawal = next;
    stream.updatedAt  = now.toISOString();
    return { stream, alert: true };
  }

  // ── 2 & 3. Look up the tx on Horizon ──────────────────────────────────────
  const { matchedRecord, nextCursor } = await findTransactionWithPagination(
    stream.id,
    settlementTxHash,
    existing?.horizonCursor,
    fetcher,
  );

  if (nextCursor) next.horizonCursor = nextCursor;

  if (matchedRecord) {
    // Tx is on-chain. Check confirmation depth.
    const txLedger      = matchedRecord.ledger;
    const currentLedger = await fetchCurrentLedger(fetcher);

    const depth =
      txLedger !== undefined && currentLedger !== undefined
        ? computeConfirmationDepth(txLedger, currentLedger)
        : undefined;

    // Attach depth metadata for observability.
    (next as WithdrawalStatus & { confirmationDepth?: number }).confirmationDepth = depth;

    if (depth !== undefined && depth >= MIN_CONFIRMATION_DEPTH) {
      // ── 4. Finality reached ────────────────────────────────────────────────
      next.state           = "succeeded";
      next.confirmedTxHash = matchedRecord.hash;
      stream.withdrawal    = next;
      stream.status        = "withdrawn";
      stream.nextAction    = undefined;
      stream.updatedAt     = now.toISOString();
      return { stream, alert: false };
    }

    // Depth below threshold — keep polling.
    // Emit a stall alert if we've been waiting too long.
    const stalled = getAgeMs(requestedAt, now) >= FINALITY_STALL_THRESHOLD_MS;
    stream.withdrawal = next;
    stream.nextAction = "withdraw";
    stream.updatedAt  = now.toISOString();
    return { stream, alert: stalled };
  }

  // ── Tx not found on-chain ──────────────────────────────────────────────────
  // If we previously confirmed the tx (confirmedTxHash was set) but it is
  // now missing, a reorg has occurred — fail immediately.
  if (existing?.confirmedTxHash) {
    next.state       = "failed";
    next.failureCode = "REORG_DETECTED";
    stream.withdrawal = next;
    stream.nextAction = "withdraw";
    stream.updatedAt  = now.toISOString();
    return { stream, alert: true };
  }

  // ── 6. Max attempts exceeded ───────────────────────────────────────────────
  const timedOut = getAgeMs(requestedAt, now) >= FINALITY_STALL_THRESHOLD_MS;
  if (attempts >= MAX_ATTEMPTS || timedOut) {
    next.state       = "failed";
    next.failureCode = "FINALITY_TIMEOUT";
    stream.withdrawal = next;
    stream.nextAction = "withdraw";
    stream.updatedAt  = now.toISOString();
    return { stream, alert: true };
  }

  // ── 5. Still pending — stall alert if needed ──────────────────────────────
  const stalled = getAgeMs(requestedAt, now) >= FINALITY_STALL_THRESHOLD_MS;
  stream.withdrawal = next;
  stream.nextAction = "withdraw";
  stream.updatedAt  = now.toISOString();
  return { stream, alert: stalled };
}
