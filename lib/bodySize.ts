import { NextRequest, NextResponse } from 'next/server';

/**
 * Body size limit configuration for different route categories.
 *
 * - DEFAULT: 256 KB (general API routes)
 * - WEBHOOK: 1 MB (webhook delivery and event routes)
 *
 * Operators may override these defaults via environment variables:
 *   - MAX_STREAM_BODY_BYTES (default routes)
 *   - MAX_WEBHOOK_BODY_BYTES (webhook routes)
 */

/** Default cap: 256 KB */
export const DEFAULT_MAX_BODY_BYTES = 256 * 1024; // 262,144 bytes

/** Webhook cap: 1 MB */
export const WEBHOOK_MAX_BODY_BYTES = 1024 * 1024; // 1,048,576 bytes

/** HTTP methods that legitimately carry a request body */
export const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

/**
 * Resolves the configured maximum body size in bytes, honoring optional env overrides.
 *
 * Validation:
 *   - Must be a finite positive integer
 *   - Falls back to the provided default for invalid / missing values
 *
 * @param envVar - Environment variable name to check for override
 * @param defaultBytes - Default value if env var is not set or invalid
 * @returns Resolved maximum body size in bytes
 */
export function resolveMaxBodyBytes(envVar: string, defaultBytes: number): number {
  const raw = process.env[envVar];
  if (raw !== undefined) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
    // Invalid override — log once and fall back to default.
    console.warn(
      `[bodySize] ${envVar}="${raw}" is not a valid positive number; ` +
        `falling back to ${defaultBytes} bytes.`
    );
  }
  return defaultBytes;
}

/**
 * Determines if a request path is a webhook route.
 *
 * Webhook routes include:
 *   - /api/webhooks/*
 *
 * @param pathname - Request pathname
 * @returns True if path is a webhook route
 */
export function isWebhookPath(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks');
}

/**
 * Gets the appropriate body size limit for a request path.
 *
 * Webhook routes use WEBHOOK_MAX_BODY_BYTES; all others use DEFAULT_MAX_BODY_BYTES.
 *
 * @param pathname - Request pathname
 * @param limits - Limit configuration with default and webhook values
 * @returns Maximum allowed body size in bytes
 */
export function getBodySizeLimit(
  pathname: string,
  limits: { default: number; webhook: number }
): number {
  return isWebhookPath(pathname) ? limits.webhook : limits.default;
}

/**
 * Extracts the pathname from a request, handling both NextRequest and plain Request objects.
 *
 * - NextRequest objects (Edge runtime) have `request.nextUrl.pathname`
 * - Plain Request objects (tests) only have `request.url`
 *
 * @param request - Request object
 * @returns Request pathname
 */
export function extractPathname(request: NextRequest | Request): string {
  if ('nextUrl' in request && request.nextUrl?.pathname) {
    return request.nextUrl.pathname;
  }
  try {
    return new URL(request.url).pathname;
  } catch {
    return '';
  }
}

/**
 * Creates a standardized 413 Payload Too Large error response.
 *
 * @param contentLength - Received Content-Length value
 * @param maxBytes - Configured maximum in bytes
 * @param requestId - Request ID for correlation
 * @returns NextResponse with 413 status
 */
export function createBodySizeTooLargeResponse(
  contentLength: number,
  maxBytes: number,
  requestId: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: 'REQUEST_TOO_LARGE',
        message:
          `Request body exceeds the ${maxBytes}-byte limit. ` +
          `Received Content-Length: ${contentLength} bytes.`,
        request_id: requestId,
      },
    },
    { status: 413 }
  );
}

/**
 * Checks whether an incoming request exceeds the configured body size limit.
 *
 * The check is intentionally O(1): we read the Content-Length header rather
 * than buffering the body. Clients that omit Content-Length are allowed
 * through — the application layer is responsible for streaming limits.
 *
 * Only write methods (POST, PUT, PATCH) are checked; safe methods (GET, HEAD,
 * OPTIONS, DELETE) are not expected to carry a body and are skipped.
 *
 * @param request - Request object
 * @param limits - Limit configuration with default and webhook values
 * @returns A 413 NextResponse when the limit is breached, or null to continue processing
 */
export function checkRequestBodySize(
  request: NextRequest | Request,
  limits: { default: number; webhook: number }
): NextResponse | null {
  // Get the pathname
  const pathname = extractPathname(request);
  if (!pathname) {
    return null;
  }

  // Only enforce on write methods
  if (!WRITE_METHODS.has(request.method)) {
    return null;
  }

  // Determine the size limit for this path
  const maxBytes = getBodySizeLimit(pathname, limits);

  // Read Content-Length without buffering the body
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader === null) {
    // Absent header: allow through — downstream can enforce streaming limits
    return null;
  }

  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    // Malformed Content-Length: allow through; let the runtime reject it
    return null;
  }

  if (contentLength > maxBytes) {
    const requestId = (request.headers.get('x-request-id') as string | null) ?? 
                     `req_${Date.now().toString(36)}`;
    return createBodySizeTooLargeResponse(contentLength, maxBytes, requestId);
  }

  return null;
}

/**
 * Builds the limits configuration object from environment variables.
 *
 * @returns Object with default and webhook limits
 */
export function buildLimitsConfig(): { default: number; webhook: number } {
  return {
    default: resolveMaxBodyBytes('MAX_STREAM_BODY_BYTES', DEFAULT_MAX_BODY_BYTES),
    webhook: resolveMaxBodyBytes('MAX_WEBHOOK_BODY_BYTES', WEBHOOK_MAX_BODY_BYTES),
  };
}
