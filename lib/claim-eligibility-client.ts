/**
 * Claim eligibility network client.
 *
 * Fetches the authoritative claim-evidence record for a (market, account) pair
 * from an internal API route and maps transport/HTTP failures into a small,
 * typed error taxonomy with an explicit `retryable` flag. The fetch
 * implementation and account are injectable so the client is fully testable
 * without a live backend and can be reused by the React hook or server callers.
 *
 * The error taxonomy intentionally mirrors `lib/oracle-status-client.ts`:
 *  - 401 / 403  → `permission` (non-retryable) — surfaced as the "permission"
 *                 state (e.g. wallet not connected / not the claimant).
 *  - 404        → `not_found`  (non-retryable) — authoritative evidence is not
 *                 available for this market; shown as a neutral empty state.
 *  - 400 / 422  → `invalid`    (non-retryable) — malformed request.
 *  - 429 / 5xx  → `network`    (retryable).
 */

import { env } from "@/lib/env";
import { isValidClaimEvidenceSource, isValidClaimStatus } from "@/lib/claim-eligibility";
import type {
  ClaimEvidence,
  ClaimEvidenceSource,
  ClaimStatus,
} from "@/types/claim-eligibility";

export type ClaimEligibilityClientErrorKind =
  | "network"
  | "permission"
  | "not_found"
  | "invalid"
  | "aborted"
  | "unknown";

export class ClaimEligibilityClientError extends Error {
  readonly kind: ClaimEligibilityClientErrorKind;
  readonly retryable: boolean;

  constructor(
    message: string,
    kind: ClaimEligibilityClientErrorKind,
    retryable: boolean,
  ) {
    super(message);
    this.name = "ClaimEligibilityClientError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface ClaimEligibilityClientOptions {
  /** Connected account used to scope the evidence; omit when not authorized. */
  account?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

function classifyHttpStatus(status: number): ClaimEligibilityClientError {
  switch (status) {
    case 401:
    case 403:
      return new ClaimEligibilityClientError(
        "Viewing claim eligibility requires an authorized wallet.",
        "permission",
        false,
      );
    case 404:
      return new ClaimEligibilityClientError(
        "Claim eligibility is not available for this market.",
        "not_found",
        false,
      );
    case 400:
    case 422:
      return new ClaimEligibilityClientError(
        "Claim eligibility request was rejected as invalid.",
        "invalid",
        false,
      );
    case 429:
      return new ClaimEligibilityClientError(
        "Claim eligibility request was rate limited.",
        "network",
        true,
      );
    default:
      if (status >= 500) {
        return new ClaimEligibilityClientError(
          "Claim eligibility service is unavailable.",
          "network",
          true,
        );
      }
      return new ClaimEligibilityClientError(
        `Claim eligibility request failed with status ${status}.`,
        "unknown",
        true,
      );
  }
}

function normalizeTimestamp(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    throw new ClaimEligibilityClientError(
      "Claim evidence timestamp is invalid.",
      "invalid",
      false,
    );
  }
  // Accept epoch seconds (unit mismatch guard) and normalize to milliseconds.
  if (raw > 0 && raw < 1e12) {
    return Math.round(raw * 1000);
  }
  return raw;
}

function parseEvidence(payload: unknown): ClaimEvidence {
  if (payload === null || typeof payload !== "object") {
    throw new ClaimEligibilityClientError(
      "Claim eligibility payload was malformed.",
      "invalid",
      false,
    );
  }

  const candidate = payload as Record<string, unknown>;

  const marketId =
    typeof candidate.marketId === "string" ? candidate.marketId.trim() : "";
  if (!marketId) {
    throw new ClaimEligibilityClientError(
      "Claim evidence is missing a marketId.",
      "invalid",
      false,
    );
  }

  const outcome = typeof candidate.outcome === "string" ? candidate.outcome : "";
  const userPrediction =
    typeof candidate.userPrediction === "string" ? candidate.userPrediction : "";

  if (!isValidClaimEvidenceSource(candidate.source)) {
    throw new ClaimEligibilityClientError(
      "Claim evidence has an unsupported source.",
      "invalid",
      false,
    );
  }

  if (!isValidClaimStatus(candidate.claimStatus)) {
    throw new ClaimEligibilityClientError(
      "Claim evidence has an invalid claimStatus.",
      "invalid",
      false,
    );
  }

  const winnings =
    typeof candidate.winnings === "number" ? candidate.winnings : 0;
  const winningsToken =
    typeof candidate.winningsToken === "string" ? candidate.winningsToken : "";

  return {
    marketId,
    outcome,
    userPrediction,
    resolvedAt: normalizeTimestamp(candidate.resolvedAt),
    source: candidate.source as ClaimEvidenceSource,
    claimed: Boolean(candidate.claimed),
    claimStatus: candidate.claimStatus as ClaimStatus,
    winnings,
    winningsToken,
    marketTitle:
      typeof candidate.marketTitle === "string"
        ? candidate.marketTitle
        : undefined,
  };
}

function normalizeError(error: unknown): ClaimEligibilityClientError {
  if (error instanceof ClaimEligibilityClientError) {
    return error;
  }
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "DOMException")
  ) {
    return new ClaimEligibilityClientError(
      "Claim eligibility request was cancelled.",
      "aborted",
      false,
    );
  }
  return new ClaimEligibilityClientError(
    error instanceof Error
      ? error.message
      : "Claim eligibility request failed.",
    "network",
    true,
  );
}

/**
 * Fetch the authoritative claim-evidence record for a market + account.
 *
 * Throws `ClaimEligibilityClientError` with a stable `kind` so callers can
 * decide whether to surface a permission error, a retryable network error, etc.
 */
export async function fetchClaimEligibility(
  marketId: string,
  options: ClaimEligibilityClientOptions = {},
): Promise<ClaimEvidence> {
  const trimmedId = typeof marketId === "string" ? marketId.trim() : "";
  if (!trimmedId) {
    throw new ClaimEligibilityClientError(
      "A non-empty market id is required.",
      "invalid",
      false,
    );
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl =
    options.baseUrl ??
    env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3000/api";

  const params = new URLSearchParams({ marketId: trimmedId });
  if (options.account && options.account.trim()) {
    params.set("account", options.account.trim());
  }

  const url = `${baseUrl.replace(/\/$/, "")}/claim-eligibility?${params.toString()}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
  } catch (error) {
    throw normalizeError(error);
  }

  if (!response.ok) {
    throw classifyHttpStatus(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ClaimEligibilityClientError(
      "Claim eligibility response was not valid JSON.",
      "invalid",
      false,
    );
  }

  try {
    return parseEvidence(payload);
  } catch (error) {
    throw normalizeError(error);
  }
}
