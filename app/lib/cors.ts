/**
 * CORS allowlist helpers for browser-origin validation.
 *
 * The public API surface is protected by an explicit origin allowlist.
 * Wildcard `*` is permitted only in non-production environments.
 */

export const WILDCARD_ORIGIN = '*';

export const DEFAULT_CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
export const DEFAULT_CORS_HEADERS = 'authorization, content-type, x-requested-with, x-api-key, x-streampay-actor-id, x-streampay-actor-role';
export const DEFAULT_CORS_MAX_AGE_SECONDS = 600;

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeOrigin(origin: string): string {
  if (origin === WILDCARD_ORIGIN) {
    return WILDCARD_ORIGIN;
  }

  const url = new URL(origin);

  if (url.origin !== origin) {
    return url.origin;
  }

  return url.origin;
}

export function buildAllowedOriginSet(raw: string | undefined): Set<string> {
  return new Set(parseAllowedOrigins(raw).map(normalizeOrigin));
}

export function isOriginAllowed(origin: string | null | undefined, allowedOrigins: string[] | Set<string>): boolean {
  if (!origin) {
    return false;
  }

  const normalizedOrigin = (() => {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  })();

  if (!normalizedOrigin) {
    return false;
  }

  if (allowedOrigins instanceof Set) {
    return allowedOrigins.has(WILDCARD_ORIGIN) || allowedOrigins.has(normalizedOrigin);
  }

  return allowedOrigins.includes(WILDCARD_ORIGIN) || allowedOrigins.includes(normalizedOrigin);
}

/**
 * Build CORS headers for a response based on the origin allowlist.
 *
 * When the origin is allowed, returns headers that include
 * `Access-Control-Allow-Origin`, methods, headers, and max-age.
 * When disallowed, returns headers with only `Vary: Origin` — no
 * `Access-Control-Allow-Origin` is set, which causes the browser to
 * reject the response (no origin reflection without a match).
 *
 * Intended for preflight (OPTIONS) responses where the full header set
 * is being constructed from scratch.
 *
 * @param origin - The request's Origin header value (or null/undefined)
 * @param allowedOrigins - Set of normalized allowed origins (from buildAllowedOriginSet)
 * @param methods - Allowed HTTP methods string (defaults to DEFAULT_CORS_METHODS)
 * @param maxAge - Max-Age in seconds (defaults to DEFAULT_CORS_MAX_AGE_SECONDS)
 * @returns Headers object ready to apply to a response
 */
export function createCorsResponse(
  origin: string | null | undefined,
  allowedOrigins: Set<string>,
  methods = DEFAULT_CORS_METHODS,
  corsHeaders = DEFAULT_CORS_HEADERS,
  maxAge = DEFAULT_CORS_MAX_AGE_SECONDS,
): Headers {
  const result = new Headers();

  if (isOriginAllowed(origin, allowedOrigins)) {
    result.set('Access-Control-Allow-Origin', origin!);
    result.set('Access-Control-Allow-Methods', methods);
    result.set('Access-Control-Allow-Headers', corsHeaders);
    result.set('Access-Control-Max-Age', String(maxAge));
  }

  if (origin) {
    result.set('Vary', 'Origin');
  }

  return result;
}

/**
 * Patch CORS headers onto an existing response based on the origin allowlist.
 *
 * This is the non-preflight counterpart of `createCorsResponse`. Use it
 * when a response is already constructed and just needs CORS headers
 * patched in.
 *
 * No `Access-Control-Allow-Origin` is set for disallowed origins
 * (no reflection without a match). `Vary: Origin` is always set when
 * the origin header is present.
 *
 * @param target - The Headers object to patch (e.g. from NextResponse)
 * @param origin - The request's Origin header value
 * @param allowedOrigins - Set of normalized allowed origins
 */
export function applyCorsHeaders(
  target: Headers,
  origin: string | null | undefined,
  allowedOrigins: Set<string>,
): void {
  if (isOriginAllowed(origin, allowedOrigins)) {
    target.set('Access-Control-Allow-Origin', origin!);
  }

  if (origin) {
    target.set('Vary', 'Origin');
  }
}
