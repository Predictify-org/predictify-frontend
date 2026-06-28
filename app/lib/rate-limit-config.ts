export const RATE_LIMITS = {
  read: { limit: 60, windowMs: 60_000 },
  write: { limit: 10, windowMs: 60_000 },
} as const;

export type LimitType = keyof typeof RATE_LIMITS;

/**
 * Per-org daily stream creation quota (org:streams_per_day window).
 *
 * `limit`    — maximum streams an org may create in a single UTC calendar day.
 * `windowMs` — informational: the window is always one UTC day (86 400 000 ms),
 *              kept here for documentation parity with RATE_LIMITS.
 *
 * Override `limit` via the ORG_DAILY_STREAM_QUOTA_LIMIT environment variable
 * so operators can tune the cap without a code deploy.
 */
export const ORG_DAILY_STREAM_QUOTA = {
  limit: Number(process.env.ORG_DAILY_STREAM_QUOTA_LIMIT ?? 100),
  windowMs: 24 * 60 * 60_000, // 24 h — window is one UTC calendar day
} as const;

export const ROUTE_LIMITS: Record<string, LimitType> = {
  "GET:/api/streams": "read",
  "GET:/api/streams/": "read",
  "GET:/api/activity": "read",
  "GET:/api/identity/me": "read",
  "POST:/api/streams": "write",
  "DELETE:/api/streams/": "write",
  "POST:/api/streams/*/start": "write",
  "POST:/api/streams/*/pause": "write",
  "POST:/api/streams/*/stop": "write",
  "POST:/api/streams/*/settle": "write",
  "POST:/api/streams/*/withdraw": "write",
};

export const STORE_TYPE = process.env.RATE_LIMIT_STORE_TYPE || "in-memory";

export function getLimitForRoute(method: string, path: string): LimitType {
  const exactKey = `${method}:${path}`;
  if (ROUTE_LIMITS[exactKey]) {
    return ROUTE_LIMITS[exactKey];
  }

  const wildcardKey = `${method}:${path.replace(/\/[^/]+$/, "/*")}`;
  if (ROUTE_LIMITS[wildcardKey]) {
    return ROUTE_LIMITS[wildcardKey];
  }

  return method === "GET" ? "read" : "write";
}
