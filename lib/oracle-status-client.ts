/**
 * Oracle status network client.
 *
 * Fetches the oracle resolution-chain attempts for a market from an internal
 * API route and maps transport/HTTP failures into a small, typed error taxonomy
 * with an explicit `retryable` flag. The fetch implementation is injectable so
 * the client is fully testable without a live backend, and the same client can
 * be reused by the React hook or by server-side callers.
 */

import { env } from "@/lib/env";
import { isValidOracleProviderId } from "@/lib/oracle-status";
import type { OracleAttemptResult, OracleProviderId } from "@/types/oracle-status";

export type OracleStatusClientErrorKind =
  | "network"
  | "permission"
  | "not_found"
  | "invalid"
  | "aborted"
  | "unknown";

export class OracleStatusClientError extends Error {
  readonly kind: OracleStatusClientErrorKind;
  readonly retryable: boolean;

  constructor(
    message: string,
    kind: OracleStatusClientErrorKind,
    retryable: boolean,
  ) {
    super(message);
    this.name = "OracleStatusClientError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

export interface OracleStatusClientOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

function classifyHttpStatus(status: number): OracleStatusClientError {
  switch (status) {
    case 401:
    case 403:
      return new OracleStatusClientError(
        "Oracle status requires authorization.",
        "permission",
        false,
      );
    case 404:
      return new OracleStatusClientError(
        "Oracle status is not available for this market.",
        "not_found",
        false,
      );
    case 400:
    case 422:
      return new OracleStatusClientError(
        "Oracle status request was rejected as invalid.",
        "invalid",
        false,
      );
    case 429:
      return new OracleStatusClientError(
        "Oracle status request was rate limited.",
        "network",
        true,
      );
    default:
      if (status >= 500) {
        return new OracleStatusClientError(
          "Oracle status service is unavailable.",
          "network",
          true,
        );
      }
      return new OracleStatusClientError(
        `Oracle status request failed with status ${status}.`,
        "unknown",
        true,
      );
  }
}

function normalizeTimestamp(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
    throw new OracleStatusClientError(
      "Oracle attempt timestamp is invalid.",
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

function parseAttempts(payload: unknown): OracleAttemptResult[] {
  const rawList = Array.isArray(payload)
    ? payload
    : (payload as { attempts?: unknown; data?: { attempts?: unknown } })
        ?.attempts ??
      (payload as { data?: { attempts?: unknown } })?.data?.attempts;

  if (!Array.isArray(rawList)) {
    throw new OracleStatusClientError(
      "Oracle status payload did not contain an attempts list.",
      "invalid",
      false,
    );
  }

  return rawList.map((raw, index) => {
    if (raw === null || typeof raw !== "object") {
      throw new OracleStatusClientError(
        `Oracle attempt ${index} is malformed.`,
        "invalid",
        false,
      );
    }
    const candidate = raw as Record<string, unknown>;
    if (!isValidOracleProviderId(candidate.provider)) {
      throw new OracleStatusClientError(
        `Oracle attempt ${index} has an unsupported provider.`,
        "invalid",
        false,
      );
    }
    if (
      typeof candidate.attempt !== "number" ||
      !Number.isInteger(candidate.attempt) ||
      candidate.attempt < 0
    ) {
      throw new OracleStatusClientError(
        `Oracle attempt ${index} has an invalid attempt index.`,
        "invalid",
        false,
      );
    }

    return {
      provider: candidate.provider as OracleProviderId,
      attempt: candidate.attempt,
      success: Boolean(candidate.success),
      outcome: typeof candidate.outcome === "string" ? candidate.outcome : "",
      timestamp: normalizeTimestamp(candidate.timestamp),
    };
  });
}

function normalizeError(error: unknown): OracleStatusClientError {
  if (error instanceof OracleStatusClientError) {
    return error;
  }
  if (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "DOMException")
  ) {
    return new OracleStatusClientError(
      "Oracle status request was cancelled.",
      "aborted",
      false,
    );
  }
  return new OracleStatusClientError(
    error instanceof Error ? error.message : "Oracle status request failed.",
    "network",
    true,
  );
}

/**
 * Fetch the oracle resolution-chain attempts for a market.
 *
 * Throws `OracleStatusClientError` with a stable `kind` so callers can decide
 * whether to surface a permission error, a retryable network error, etc.
 */
export async function fetchOracleAttempts(
  marketId: string,
  options: OracleStatusClientOptions = {},
): Promise<OracleAttemptResult[]> {
  const trimmedId = typeof marketId === "string" ? marketId.trim() : "";
  if (!trimmedId) {
    throw new OracleStatusClientError(
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

  const url = `${baseUrl.replace(/\/$/, "")}/oracle-status?marketId=${encodeURIComponent(
    trimmedId,
  )}`;

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
    throw new OracleStatusClientError(
      "Oracle status response was not valid JSON.",
      "invalid",
      false,
    );
  }

  try {
    return parseAttempts(payload);
  } catch (error) {
    throw normalizeError(error);
  }
}
