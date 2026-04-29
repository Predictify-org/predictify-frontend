export const RATE_LIMITS = {
  read: { limit: 60, windowMs: 60_000 },
  write: { limit: 10, windowMs: 60_000 },
} as const;

export type LimitType = keyof typeof RATE_LIMITS;

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
