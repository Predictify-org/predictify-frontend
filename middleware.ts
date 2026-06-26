import { NextRequest, NextResponse } from 'next/server';
import { validateConfig } from './app/lib/config/index';
import { buildAllowedOriginSet, isOriginAllowed, DEFAULT_CORS_HEADERS, DEFAULT_CORS_METHODS, DEFAULT_CORS_MAX_AGE_SECONDS } from './app/lib/cors';

// ---------------------------------------------------------------------------
// Request body size cap
// ---------------------------------------------------------------------------
//
// Operators may override the default via the MAX_STREAM_BODY_BYTES environment
// variable (e.g. MAX_STREAM_BODY_BYTES=131072 for 128 KB).
//
// The check is intentionally O(1): we read the Content-Length header rather
// than buffering the body.  Clients that omit Content-Length are allowed
// through — the application layer is responsible for streaming limits.
//
// Only write methods (POST, PUT, PATCH) are checked; safe methods (GET, HEAD,
// OPTIONS, DELETE) are not expected to carry a body and are skipped.

/** Default cap: 256 KB */
const DEFAULT_MAX_BODY_BYTES = 256 * 1024; // 262 144

/**
 * Resolved cap in bytes, honoring the optional env override.
 *
 * Validation:
 *  - Must be a finite positive integer.
 *  - Falls back to DEFAULT_MAX_BODY_BYTES for invalid / missing values.
 */
function resolveMaxBodyBytes(): number {
  const raw = process.env.MAX_STREAM_BODY_BYTES;
  if (raw !== undefined) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    // Invalid override — log once and fall back to the default.
    console.warn(
      `[middleware] MAX_STREAM_BODY_BYTES="${raw}" is not a valid positive number; ` +
        `falling back to ${DEFAULT_MAX_BODY_BYTES} bytes.`,
    );
  }
  return DEFAULT_MAX_BODY_BYTES;
}

const MAX_BODY_BYTES = resolveMaxBodyBytes();

/** HTTP methods that legitimately carry a request body. */
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Prefix for the paths where the size cap is enforced.
 *
 * Matches:
 *  - /api/v2/streams
 *  - /api/v2/streams/{id}
 *  - /api/v2/streams/{id}/pause  … etc.
 */
const SIZE_CAP_PATH_PREFIX = '/api/v2/streams';

/**
 * Check whether the incoming request exceeds the configured body size limit.
 *
 * @returns A 413 `NextResponse` when the limit is breached, or `null` to
 *          signal that processing should continue normally.
 */
function checkRequestBodySize(request: NextRequest): NextResponse | null {
  // Only enforce on paths we care about.
  // `request.nextUrl` is provided by the Edge runtime on a real NextRequest.
  // Plain Request objects (used in unit tests) only have `request.url`.
  // We fall back to standard URL parsing so both environments work correctly.
  const pathname = (request as { nextUrl?: { pathname: string } }).nextUrl?.pathname
    ?? new URL(request.url).pathname;
  if (!pathname.startsWith(SIZE_CAP_PATH_PREFIX)) {
    return null;
  }

  // Only enforce on write methods — GET / HEAD / OPTIONS / DELETE are skipped.
  if (!WRITE_METHODS.has(request.method)) {
    return null;
  }

  // Read Content-Length without buffering the body.
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader === null) {
    // Absent header: allow through — downstream can enforce streaming limits.
    return null;
  }

  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    // Malformed Content-Length: allow through; let the runtime reject it.
    return null;
  }

  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'REQUEST_TOO_LARGE',
          message:
            `Request body exceeds the ${MAX_BODY_BYTES}-byte limit. ` +
            `Received Content-Length: ${contentLength} bytes.`,
          request_id: request.headers.get('x-request-id') ?? `req_${Date.now().toString(36)}`,
        },
      },
      { status: 413 },
    );
  }

  return null;
}

// Validate configuration at middleware initialization so invalid CORS settings fail early.
validateConfig();

const allowedOrigins = buildAllowedOriginSet(process.env.ALLOWED_ORIGINS);

export const config = {
  matcher: ['/api/:path*'],
};

function buildCorsHeaders(origin: string) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', DEFAULT_CORS_METHODS);
  headers.set('Access-Control-Allow-Headers', DEFAULT_CORS_HEADERS);
  headers.set('Access-Control-Max-Age', String(DEFAULT_CORS_MAX_AGE_SECONDS));
  headers.set('Vary', 'Origin');
  return headers;
}

export function middleware(request: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Request body size cap (path-scoped, O(1) — reads Content-Length)
  // ------------------------------------------------------------------
  const sizeError = checkRequestBodySize(request);
  if (sizeError !== null) {
    return sizeError;
  }

  // ------------------------------------------------------------------
  // 2. CORS
  // ------------------------------------------------------------------
  const origin = request.headers.get('origin');
  const originAllowed = isOriginAllowed(origin, allowedOrigins);

  if (request.method === 'OPTIONS') {
    if (!originAllowed) {
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, {
      status: 204,
      headers: buildCorsHeaders(origin!),
    });
  }

  const response = NextResponse.next();

  if (originAllowed) {
    const headers = response.headers;
    headers.set('Access-Control-Allow-Origin', origin!);
    headers.set('Vary', 'Origin');
  }

  return response;
}
