import { NextRequest, NextResponse } from 'next/server';
import { validateConfig } from './app/lib/config/index';
import { buildAllowedOriginSet, isOriginAllowed, DEFAULT_CORS_HEADERS, DEFAULT_CORS_METHODS, DEFAULT_CORS_MAX_AGE_SECONDS } from './app/lib/cors';
import {
  REQUEST_FINGERPRINT_HEADER,
  captureRequestFingerprint,
} from './lib/fingerprint';
import {
  checkRequestBodySize,
  buildLimitsConfig,
} from './lib/bodySize';

// ---------------------------------------------------------------------------
// Request body size cap
// ---------------------------------------------------------------------------
//
// Supports per-route body size limits:
//  - Default routes: 256 KB (override via MAX_STREAM_BODY_BYTES)
//  - Webhook routes (/api/webhooks/*): 1 MB (override via MAX_WEBHOOK_BODY_BYTES)
//
// The check is intentionally O(1): we read the Content-Length header rather
// than buffering the body.  Clients that omit Content-Length are allowed
// through — the application layer is responsible for streaming limits.
//
// Only write methods (POST, PUT, PATCH) are checked; safe methods (GET, HEAD,
// OPTIONS, DELETE) are not expected to carry a body and are skipped.

// Build limits configuration at module initialization
const bodyLimits = buildLimitsConfig();

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

export async function middleware(request: NextRequest) {
  const fingerprint = await captureRequestFingerprint(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_FINGERPRINT_HEADER, fingerprint);

  // ------------------------------------------------------------------
  // 1. Request body size cap (path-scoped, O(1) — reads Content-Length)
  // ------------------------------------------------------------------
  const sizeError = checkRequestBodySize(request, bodyLimits);
  if (sizeError !== null) {
    sizeError.headers.set(REQUEST_FINGERPRINT_HEADER, fingerprint);
    return sizeError;
  }

  // ------------------------------------------------------------------
  // 2. CORS — reject disallowed origins with structured error envelope
  // ------------------------------------------------------------------
  const origin = request.headers.get('origin');

  if (origin) {
    const originAllowed = isOriginAllowed(origin, allowedOrigins);

    if (!originAllowed) {
      const requestId =
        (request.headers.get('x-request-id') as string) ??
        `req_${Date.now().toString(36)}`;

      console.warn(
        JSON.stringify({
          type: 'cors.rejection',
          origin,
          method: request.method,
          pathname: request.nextUrl?.pathname ?? '',
          request_id: requestId,
        })
      );

      const errorResponse = NextResponse.json(
        {
          error: {
            code: 'CORS_ORIGIN_DISALLOWED',
            message: `Origin '${origin}' is not allowed.`,
            request_id: requestId,
          },
        },
        { status: 403 }
      );
      errorResponse.headers.set(REQUEST_FINGERPRINT_HEADER, fingerprint);
      errorResponse.headers.set('Vary', 'Origin');
      return errorResponse;
    }

    // Origin is allowed
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: buildCorsHeaders(origin),
      });
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    return response;
  }

  // No origin header — no CORS processing needed
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
