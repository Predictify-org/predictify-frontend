/**
 * API versioning utilities — Deprecation/Sunset headers (RFC 9745), version
 * detection, and post-sunset guard for the StreamPay stream API.
 *
 * V1 deprecation timeline:
 *   Announced: 2026-04-28
 *   Sunset:    2026-12-31 (245-day notice, above the 90-day minimum)
 */

export const API_VERSIONS = {
  /** Current stable version served at /api/v2/ */
  CURRENT: "2",
  /** Deprecated version served at /api/v1/ (rewrites to /api/) */
  DEPRECATED: "1",
} as const;

export type ApiVersion = (typeof API_VERSIONS)[keyof typeof API_VERSIONS];

/** Date v1 was formally announced as deprecated. */
export const V1_DEPRECATION_DATE = new Date("2026-04-28T00:00:00.000Z");

/**
 * Date after which v1 endpoints return 410 Gone.
 * Must be ≥ 90 days after V1_DEPRECATION_DATE per policy.
 */
export const V1_SUNSET_DATE = new Date("2026-12-31T00:00:00.000Z");

export const V2_MIGRATION_URL =
  "https://docs.streampay.io/api/v2-migration";

/**
 * Returns true if the v1 sunset date has passed, meaning v1 endpoints should
 * return 410 Gone rather than proxying through.
 */
export function isV1SunsetPassed(now: Date = new Date()): boolean {
  return now >= V1_SUNSET_DATE;
}

/**
 * Adds RFC 9745 Deprecation and Sunset headers to a response, plus a Link
 * header pointing wallet partners to the v2 migration guide.
 * Call this whenever a v1 path is served successfully.
 */
export function addV1DeprecationHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Deprecation", V1_DEPRECATION_DATE.toUTCString());
  headers.set("Sunset", V1_SUNSET_DATE.toUTCString());
  headers.set(
    "Link",
    `<${V2_MIGRATION_URL}>; rel="successor-version", <${V2_MIGRATION_URL}>; rel="deprecation"`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Returns a 410 Gone response for v1 requests received after the sunset date.
 * Includes a machine-readable error body and the migration URL.
 */
export function sunsetResponse(requestId?: string): Response {
  return Response.json(
    {
      error: {
        code: "API_VERSION_SUNSET",
        message: `API v1 reached end-of-life on ${V1_SUNSET_DATE.toISOString()}. Please migrate to v2.`,
        migration_url: V2_MIGRATION_URL,
        sunset_at: V1_SUNSET_DATE.toISOString(),
        request_id: requestId ?? null,
      },
    },
    {
      status: 410,
      headers: {
        "Content-Type": "application/json",
        Sunset: V1_SUNSET_DATE.toUTCString(),
        Link: `<${V2_MIGRATION_URL}>; rel="successor-version"`,
      },
    },
  );
}

/**
 * Reads the requested API version from the URL pathname or request headers.
 *
 * Priority order:
 *   1. URL path segment: /api/v1/... → "1", /api/v2/... → "2"
 *   2. API-Version header
 *   3. Accept-Version header (alias)
 *   4. Defaults to CURRENT ("2")
 */
export function detectVersion(pathname: string, headers: Headers): ApiVersion {
  const pathMatch = pathname.match(/^\/api\/v(\d+)\//);
  if (pathMatch) {
    const v = pathMatch[1] as ApiVersion;
    if (v === "1" || v === "2") return v;
  }

  const headerVersion =
    headers.get("API-Version") ?? headers.get("Accept-Version");
  if (headerVersion === "1" || headerVersion === "2")
    return headerVersion as ApiVersion;

  return API_VERSIONS.CURRENT;
}

// ── V2 response shape types ───────────────────────────────────────────────

/**
 * V2 stream shape — three breaking changes from v1:
 *   1. nextAction: string  →  allowed_actions: string[]
 *   2. createdAt/updatedAt  →  created_at/updated_at  (snake_case)
 *   3. settlementTxHash: string  →  settlement: { tx_hash, settled_at } | null
 */
export interface V2Stream {
  id: string;
  recipient: string;
  rate: string;
  schedule: string;
  status: string;
  /** Replaces v1 nextAction; is always an array to allow multiple concurrent actions. */
  allowed_actions: string[];
  created_at: string;
  updated_at: string;
  settlement: { tx_hash: string; settled_at: string } | null;
  label?: string;
  email?: string;
  memo?: string;
  partner_id?: string;
}

/** Transforms a v1 Stream (from db) into the v2 wire shape. */
export function toV2Stream(stream: {
  id: string;
  recipient: string;
  rate: string;
  schedule: string;
  status: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
  settlementTxHash?: string;
  label?: string;
  email?: string;
  memo?: string;
  partnerId?: string;
}): V2Stream {
  return {
    id: stream.id,
    recipient: stream.recipient,
    rate: stream.rate,
    schedule: stream.schedule,
    status: stream.status,
    allowed_actions: stream.nextAction ? [stream.nextAction] : [],
    created_at: stream.createdAt,
    updated_at: stream.updatedAt,
    settlement: stream.settlementTxHash
      ? { tx_hash: stream.settlementTxHash, settled_at: stream.updatedAt }
      : null,
    ...(stream.label !== undefined && { label: stream.label }),
    ...(stream.email !== undefined && { email: stream.email }),
    ...(stream.memo !== undefined && { memo: stream.memo }),
    ...(stream.partnerId !== undefined && { partner_id: stream.partnerId }),
  };
}
