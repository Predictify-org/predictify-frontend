/**
 * Opaque cursor-based pagination utilities with HMAC-SHA256 signing.
 *
 * Cursors encode (created_at, id) tuples as base64(HMAC-signature:created_at:id)
 * to ensure stable ordering and prevent tampering.
 *
 * The HMAC signature is computed over "created_at:id" using a secret key,
 * protecting against cursor manipulation attacks.
 *
 * @module cursor-pagination
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Decoded cursor payload containing pagination state.
 */
export interface CursorPayload {
  /** ISO-8601 timestamp of the stream's creation time */
  readonly createdAt: string;
  /** Unique stream identifier */
  readonly id: string;
}

/**
 * Get the HMAC secret key from environment or use a default for development.
 * In production, CURSOR_SECRET must be set to a cryptographically random value.
 */
function getCursorSecret(): string {
  const secret = process.env.CURSOR_SECRET;
  if (!secret) {
    // Development-only fallback. In production this should be a fatal error.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CURSOR_SECRET environment variable must be set in production",
      );
    }
    return "dev-only-cursor-secret-change-in-production";
  }
  return secret;
}

/**
 * Compute HMAC-SHA256 signature for a cursor payload.
 *
 * @param createdAt - ISO-8601 creation timestamp
 * @param id - Stream identifier
 * @returns Hex-encoded HMAC signature
 */
function computeSignature(createdAt: string, id: string): string {
  const secret = getCursorSecret();
  const payload = `${createdAt}|${id}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Encode a cursor from (created_at, id) tuple.
 *
 * Format: base64(signature|created_at|id)
 * where signature = HMAC-SHA256(secret, "created_at|id")
 *
 * Note: Uses pipe (|) as delimiter to avoid conflicts with colons in ISO-8601 timestamps.
 *
 * @param createdAt - ISO-8601 creation timestamp
 * @param id - Stream identifier
 * @returns Opaque base64-encoded cursor
 *
 * @example
 * ```typescript
 * const cursor = encodeCursor("2024-01-15T10:00:00.000Z", "stream_abc123");
 * // Returns: "YWJjZGVmLi4uOjIwMjQtMDEtMTVUMTA6MDA6MDAuMDAwWjpzdHJlYW1fYWJjMTIz"
 * ```
 */
export function encodeCursor(createdAt: string, id: string): string {
  const signature = computeSignature(createdAt, id);
  const plaintext = `${signature}|${createdAt}|${id}`;
  return Buffer.from(plaintext, "utf8").toString("base64");
}

/**
 * Decode and verify an opaque cursor.
 *
 * Validates:
 * - Base64 decoding succeeds
 * - Cursor has exactly 3 pipe-separated parts (signature|created_at|id)
 * - HMAC signature matches expected value
 * - Timestamp is valid ISO-8601 format
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded payload if valid
 * @throws {Error} If cursor is malformed, tampered, or invalid
 *
 * @example
 * ```typescript
 * try {
 *   const { createdAt, id } = decodeCursor(cursor);
 *   // Use createdAt and id for pagination query
 * } catch (err) {
 *   // Return 422 with "Invalid cursor" error
 * }
 * ```
 */
export function decodeCursor(cursor: string): CursorPayload {
  // Validate input
  if (!cursor || typeof cursor !== "string") {
    throw new Error("Invalid cursor: must be non-empty string");
  }

  // Decode base64
  let plaintext: string;
  try {
    plaintext = Buffer.from(cursor, "base64").toString("utf8");
  } catch {
    throw new Error("Invalid cursor: malformed base64");
  }

  // Parse structure: signature|created_at|id
  const parts = plaintext.split("|");
  if (parts.length !== 3) {
    throw new Error("Invalid cursor: malformed structure");
  }

  const [providedSignature, createdAt, id] = parts;

  // Validate timestamp format (basic ISO-8601 check)
  if (!isValidISO8601(createdAt)) {
    throw new Error("Invalid cursor: malformed timestamp");
  }

  // Verify HMAC signature using timing-safe comparison
  const expectedSignature = computeSignature(createdAt, id);
  if (!timingSafeCompare(providedSignature, expectedSignature)) {
    throw new Error("Invalid cursor: signature verification failed");
  }

  return { createdAt, id };
}

/**
 * Timing-safe string comparison to prevent timing attacks on HMAC verification.
 *
 * @param a - First string (provided signature)
 * @param b - Second string (expected signature)
 * @returns true if strings are equal, false otherwise
 */
function timingSafeCompare(a: string, b: string): boolean {
  // Ensure both are hex strings of same length (HMAC-SHA256 = 64 hex chars)
  if (a.length !== b.length || a.length !== 64) {
    return false;
  }

  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");

  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate that a string is a valid ISO-8601 timestamp.
 *
 * Checks format and that Date parsing succeeds.
 *
 * @param dateStr - String to validate
 * @returns true if valid ISO-8601, false otherwise
 */
function isValidISO8601(dateStr: string): boolean {
  // Basic format check: YYYY-MM-DDTHH:MM:SS.sssZ or with timezone
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
  if (!iso8601Regex.test(dateStr)) {
    return false;
  }

  // Validate date is parseable and not Invalid Date
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Extract pagination info from a NextRequest's query parameters.
 *
 * Parses:
 * - `cursor`: opaque pagination cursor (optional)
 * - `limit`: number of records to return (1-100, default 20)
 *
 * @param searchParams - URLSearchParams from NextRequest
 * @returns Parsed pagination parameters
 *
 * @example
 * ```typescript
 * const { cursor, limit } = parsePaginationParams(req.nextUrl.searchParams);
 * const streams = await fetchStreams({ cursor, limit });
 * ```
 */
export interface PaginationParams {
  /** Decoded cursor payload, or null if no cursor provided */
  readonly cursor: CursorPayload | null;
  /** Number of records to fetch (1-100) */
  readonly limit: number;
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationParams {
  // Parse cursor (optional)
  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;

  // Parse limit (default 20, clamp to 1-100)
  const limitParam = searchParams.get("limit");
  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed)) {
      limit = Math.max(1, Math.min(100, parsed));
    }
  }

  return { cursor, limit };
}
