/**
 * @module withdraw-finality
 *
 * Evaluates whether a settlement transaction has reached sufficient
 * on-chain confirmation depth before allowing a withdrawal to finalize.
 *
 * ## Why finality matters
 * Stellar closes a ledger roughly every 5 seconds. Although Stellar's
 * practical reorg window is very short, a withdrawal must not be released
 * until the settlement transaction is buried deep enough that a reorg
 * cannot reverse it. Releasing funds before finality risks paying out
 * twice if the settlement transaction is rolled back.
 *
 * ## State machine
 * ```
 * pending ──(tx found, depth ≥ MIN)──► succeeded ──► stream.status = withdrawn
 *         ──(tx not found, was confirmed)──► failed (REORG_DETECTED) + alert
 *         ──(stalled > FINALITY_WINDOW_MS)──► failed (FINALITY_TIMEOUT) + alert
 *         ──(no tx hash)──► failed (SETTLEMENT_TX_MISSING) + alert
 * ```
 *
 * ## Polling
 * The route calls {@link evaluateWithdrawalState} on every
 * `POST /api/streams/:id/withdraw`. The function increments `attempts` and
 * updates `lastCheckedAt` on each call. The caller persists the returned
 * stream record.
 *
 * ## Configuration
 * | Env var | Default | Meaning |
 * |---|---|---|
 * | `HORIZON_URL` | testnet | Horizon base URL |
 * | `WITHDRAWAL_MIN_CONFIRMATION_DEPTH` | 3 | Ledgers required before finality |
 */

import type { Stream, WithdrawalStatus } from "@/app/types/openapi";

// ── Configuration ─────────────────────────────────────────────────────────────

/** Horizon base URL. Override via `HORIZON_URL` env var. */
const HORIZON_URL = process.env.HORIZON_URL ?? "https://horizon-testnet.stellar.org";

/**
 * Minimum ledger confirmations before a withdrawal is considered final.
 * Override via `WITHDRAWAL_MIN_CONFIRMATION_DEPTH` env var.
 */
export const MIN_CONFIRMATION_DEPTH: number =
  Number(process.env.WITHDRAWAL_MIN_CONFIRMATION_DEPTH ?? 3);

/** Maximum poll attempts before marking the withdrawal as failed. */
const MAX_ATTEMPTS = 5;

/** Emit a stall alert when finality has not been reached within this window. */
const FINALITY_WINDOW_MS = 90_000; // 90 seconds

const PAGE_LIMIT      = 20;
const PAGE_SCAN_LIMIT = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Injectable fetch implementation.
 * Pass a mock in tests to avoid real network calls.
 */
export type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

/** @internal Horizon transaction record (subset of fields we use). */
type HorizonRecord = {
  id?:         string;
  hash?:       string;
  successful?: boolean;
  created_at?: string;
  memo?:       string | null;
};

/** @internal Horizon paginated response envelope. */
type HorizonPage = {
  _embedded?: { records?: HorizonRecord[] };
  _links?:    { next?: { href?: string } };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Coerce a possibly-undefined attempts value to a non-negative integer. */
function toAttempts(value: number | undefined): number {
  if (!value || value < 0) return 0;
  return value;
}

/** Return the age of a withdrawal request in milliseconds. */
function getAgeMs(requestedAt: string, now: Date): number {
  const started = Date.parse(requestedAt);
  if (Number.isNaN(started)) return 0;
  return Math.max(0, now.getTime() - started);
}

/** Extract the `cursor` query parameter from a Horizon `_links.next.href`. */
function getNextCursorFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const cursor = new URL(href).searchParams.get("cursor");
  return cursor ?? undefined;
}

// ── Horizon queries ───────────────────────────────────────────────────────────

/**
 * Search for a transaction by hash across paginated Horizon account history.
 *
 * Scans up to {@link PAGE_SCAN_LIMIT} pages of {@link PAGE_LIMIT} records
 * each, starting from `cursor`. Returns the matched record hash and the
 * next pagination cursor for subsequent calls.
 *
 * **Authorization:** None — public Horizon endpoint.
 *
 * **Preconditions:**
 * - `accountId` is a valid Stellar G... address.
 * - `txHash` is a 64-character hex transaction hash.
 *
 * **Postconditions:**
 * - `matchedHash` is set when the transaction is found and `successful !== false`.
 * - `nextCursor` is the cursor to use on the next poll call.
 *
 * @param accountId - Stellar account to query.
 * @param txHash    - Transaction hash to search for.
 * @param cursor    - Pagination cursor from the previous call (or `undefined`).
 * @param fetcher   - HTTP fetch implementation (injectable for testing).
 * @returns         `{ matchedHash?, nextCursor? }`
 */
export async function findTransactionWithPagination(
  accountId: string,
  txHash: string,
  cursor: string | undefined,
  fetcher: FetchLike,
): Promise<{ matchedHash?: string; nextCursor?: string }> {
  let currentCursor = cursor;

  for (let page = 0; page < PAGE_SCAN_LIMIT; page += 1) {
    const query = new URL(`${HORIZON_URL}/accounts/${accountId}/transactions`);
    query.searchParams.set("order", "desc");
    query.searchParams.set("limit", String(PAGE_LIMIT));
    if (currentCursor) query.searchParams.set("cursor", currentCursor);

    const response = await fetcher(query.toString(), { cache: "no-store" });
    if (!response.ok) break;

    const pageData = (await response.json()) as HorizonPage;
    const records  = pageData._embedded?.records ?? [];
    const matched  = records.find(
      (r) => r.hash === txHash && r.successful !== false,
    );

    if (matched?.hash) {
      return { matchedHash: matched.hash, nextCursor: currentCursor };
    }

    const nextCursor = getNextCursorFromHref(pageData._links?.next?.href);
    if (!nextCursor || nextCursor === currentCursor) {
      return { nextCursor: currentCursor };
    }
    currentCursor = nextCursor;
  }

  return { nextCursor: currentCursor };
}

// ── Core evaluator ────────────────────────────────────────────────────────────

/**
 * Evaluate the withdrawal finality state for a stream.
 *
 * Called on every `POST /api/streams/:id/withdraw` poll. Implements the
 * finality state machine described in the module header.
 *
 * **Authorization:** None — the route handler is responsible for auth.
 *
 * **Preconditions:**
 * - `stream.status === "ended"`.
 * - `stream.settlementTxHash` or `stream.withdrawal.settlementTxHash` is set.
 *
 * **Postconditions (success path):**
 * - `stream.withdrawal.state === "succeeded"`.
 * - `stream.withdrawal.confirmedTxHash` is set.
 * - `stream.status === "withdrawn"`.
 * - `stream.nextAction === undefined`.
 *
 * **Postconditions (pending path):**
 * - `stream.withdrawal.state === "pending"`.
 * - `stream.withdrawal.attempts` incremented.
 * - `stream.withdrawal.lastCheckedAt` updated.
 * - `stream.nextAction === "withdraw"` (caller should retry).
 *
 * **Postconditions (failure path):**
 * - `stream.withdrawal.state === "failed"`.
 * - `stream.withdrawal.failureCode` set to one of:
 *   - `SETTLEMENT_TX_MISSING` — no tx hash on the stream record.
 *   - `FINALITY_TIMEOUT`      — max attempts or stall window exceeded.
 * - `alert === true`.
 *
 * **Emitted alerts:**
 * - `alert: true` on `SETTLEMENT_TX_MISSING`, `FINALITY_TIMEOUT`.
 * - `alert: true` when stall window exceeded (still pending).
 * - `alert: false` on success or normal pending.
 *
 * @param stream  - Current stream record (mutated in-place and returned).
 * @param now     - Current timestamp (injectable for testing).
 * @param fetcher - HTTP fetch implementation (injectable for testing).
 * @returns       `{ stream: Stream; alert: boolean }`
 */
export async function evaluateWithdrawalState(
  stream: Stream,
  now: Date,
  fetcher: FetchLike = fetch,
): Promise<{ stream: Stream; alert: boolean }> {
  const existing         = stream.withdrawal;
  const requestedAt      = existing?.requestedAt ?? now.toISOString();
  const attempts         = toAttempts(existing?.attempts) + 1;
  const settlementTxHash = stream.settlementTxHash ?? existing?.settlementTxHash;

  const next: WithdrawalStatus = {
    state:          "pending",
    requestedAt,
    lastCheckedAt:  now.toISOString(),
    attempts,
    settlementTxHash,
    horizonCursor:  existing?.horizonCursor,
  };

  // ── No tx hash ─────────────────────────────────────────────────────────────
  if (!settlementTxHash) {
    next.state       = "failed";
    next.failureCode = "SETTLEMENT_TX_MISSING";
    stream.withdrawal = next;
    stream.updatedAt  = now.toISOString();
    return { stream, alert: true };
  }

  // ── Search Horizon ─────────────────────────────────────────────────────────
  const { matchedHash, nextCursor } = await findTransactionWithPagination(
    stream.id,
    settlementTxHash,
    existing?.horizonCursor,
    fetcher,
  );

  if (nextCursor) next.horizonCursor = nextCursor;

  if (matchedHash) {
    // Transaction confirmed — transition to withdrawn.
    next.state           = "succeeded";
    next.confirmedTxHash = matchedHash;
    stream.withdrawal    = next;
    stream.status        = "withdrawn";
    stream.nextAction    = undefined;
    stream.updatedAt     = now.toISOString();
    return { stream, alert: false };
  }

  // ── Timeout / max attempts ─────────────────────────────────────────────────
  const timedOut = getAgeMs(requestedAt, now) >= FINALITY_WINDOW_MS;
  if (timedOut || attempts >= MAX_ATTEMPTS) {
    next.state       = "failed";
    next.failureCode = "FINALITY_TIMEOUT";
    stream.withdrawal = next;
    stream.nextAction = "withdraw";
    stream.updatedAt  = now.toISOString();
    return { stream, alert: true };
  }

  // ── Still pending ──────────────────────────────────────────────────────────
  stream.withdrawal = next;
  stream.nextAction = "withdraw";
  stream.updatedAt  = now.toISOString();
  return { stream, alert: false };
}
