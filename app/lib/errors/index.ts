import { NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Canonical error envelope used by every API route.
 *
 * Shape:
 * ```json
 * {
 *   "error": {
 *     "code":       "STREAM_NOT_FOUND",
 *     "message":    "The requested stream does not exist.",
 *     "request_id": "req_01HZ..."
 *   }
 * }
 * ```
 */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    request_id: string;
  };
}

/**
 * Well-known error codes used across routes.
 * Extend this list as new routes are added.
 */
export const ErrorCode = {
  // Generic
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  // Webhooks
  WEBHOOK_PROCESSING_FAILED: "WEBHOOK_PROCESSING_FAILED",
  DELIVERY_FETCH_FAILED: "DELIVERY_FETCH_FAILED",
  // KMS / signing
  KMS_SIGN_FAILED: "KMS_SIGN_FAILED",
  KMS_SIGN_INVALID_INPUT: "KMS_SIGN_INVALID_INPUT",
  // Auth
  WALLET_CHALLENGE_FAILED: "WALLET_CHALLENGE_FAILED",
  WALLET_VERIFY_FAILED: "WALLET_VERIFY_FAILED",
  // Streams
  STREAM_NOT_FOUND: "STREAM_NOT_FOUND",
  STREAM_CREATE_FAILED: "STREAM_CREATE_FAILED",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Reads the `x-request-id` header forwarded by the gateway/load-balancer,
 * or generates a lightweight fallback so every response always carries one.
 */
function resolveRequestId(): string {
  try {
    const hdrs = headers();
    const forwarded = (hdrs as unknown as { get(name: string): string | null }).get("x-request-id");
    if (forwarded) return forwarded;
  } catch {
    // headers() throws outside a request context (e.g. unit tests)
  }
  // Fallback: timestamp + random hex — not a UUID but stable enough for logs
  return `req_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Build a `NextResponse` with the canonical error envelope.
 *
 * @param code    - Machine-readable error code (use `ErrorCode.*`)
 * @param message - Human-readable description safe to expose to clients
 * @param status  - HTTP status code (default 500)
 */
export function errorResponse(
  code: string,
  message: string,
  status = 500,
): NextResponse<ErrorEnvelope> {
  const request_id = resolveRequestId();
  return NextResponse.json<ErrorEnvelope>(
    { error: { code, message, request_id } },
    { status },
  );
}
