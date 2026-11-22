import { NextResponse } from 'next/server';
import { z } from 'zod';
import { REPORT_REASON_CODES } from '@/components/moderation/report-taxonomy';

export const dynamic = 'force-dynamic';

/**
 * Maximum body size cap in bytes (16 KB)
 */
export const MAX_BODY_BYTES = 16 * 1024;

/**
 * In-memory rate limiting configuration: 5 reports per 60 seconds per IP
 */
export const RATE_LIMIT_CONFIG = {
  maxRequests: 5,
  windowMs: 60 * 1000,
};

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limit store
const ipRateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Helper to reset rate limits (primarily for tests)
 */
export function _resetRateLimits(): void {
  ipRateLimitStore.clear();
}

/**
 * Extract client IP from headers
 */
function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Check and increment rate limit for given IP
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const record = ipRateLimitStore.get(ip);

  if (!record || now >= record.resetTime) {
    ipRateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= RATE_LIMIT_CONFIG.maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Strips ASCII control characters except \r, \n, and \t
 */
export function stripControlCharacters(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates that an evidence URL strictly uses HTTP or HTTPS
 */
function isValidEvidenceUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed || trimmed.length > 2048) return false;

  const lower = trimmed.toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'file:', 'blob:', 'vbscript:'];
  if (dangerousProtocols.some((proto) => lower.startsWith(proto))) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    if (!parsed.hostname) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Zod validation schema
export const reportMarketSchema = z.object({
  marketId: z
    .string({ required_error: 'marketId is required' })
    .trim()
    .min(1, 'marketId cannot be empty')
    .max(128, 'marketId is too long')
    .regex(/^[a-zA-Z0-9_\-.:]+$/, 'marketId contains invalid characters'),
  reason: z.enum(REPORT_REASON_CODES as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid or unknown report reason' }),
  }),
  details: z
    .string()
    .max(1000, 'Details must not exceed 1000 characters')
    .optional()
    .nullable(),
  evidenceUrl: z
    .string()
    .max(2048, 'Evidence URL is too long')
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return isValidEvidenceUrl(val);
      },
      {
        message: 'Evidence URL must be a valid http or https URL',
      }
    )
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    // 1. Content-Type check (415)
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json(
        { error: 'Unsupported Media Type: Content-Type must be application/json' },
        { status: 415 }
      );
    }

    // 2. Body-size cap check from Content-Length header (413)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload Too Large: Request body exceeds maximum allowed size' },
        { status: 413 }
      );
    }

    // 3. Read raw body and verify actual size (413)
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json(
        { error: 'Failed to read request body' },
        { status: 400 }
      );
    }

    if (rawBody.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'Payload Too Large: Request body exceeds maximum allowed size' },
        { status: 413 }
      );
    }

    if (!rawBody.trim()) {
      return NextResponse.json(
        { error: 'Request body cannot be empty' },
        { status: 400 }
      );
    }

    // 4. Rate-limit check per IP (429)
    const clientIp = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(clientIp);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests: Rate limit exceeded. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    // 5. Parse JSON
    let bodyJson: unknown;
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    if (!bodyJson || typeof bodyJson !== 'object') {
      return NextResponse.json(
        { error: 'Payload must be a JSON object' },
        { status: 400 }
      );
    }

    // 6. Strip control characters from strings
    const rawData = bodyJson as Record<string, unknown>;
    const sanitizedData: Record<string, unknown> = { ...rawData };

    if (typeof rawData.marketId === 'string') {
      sanitizedData.marketId = stripControlCharacters(rawData.marketId);
    }
    if (typeof rawData.details === 'string') {
      sanitizedData.details = stripControlCharacters(rawData.details);
    }
    if (typeof rawData.evidenceUrl === 'string') {
      sanitizedData.evidenceUrl = stripControlCharacters(rawData.evidenceUrl);
    }

    // 7. Validate with Zod schema
    const validationResult = reportMarketSchema.safeParse(sanitizedData);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstErrorMessage =
        validationResult.error.errors[0]?.message || 'Validation failed';
      return NextResponse.json(
        {
          error: firstErrorMessage,
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    // 8. Generate report ID and return 202 Accepted
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const reportId = `rep_${timestamp}_${randomSuffix}`;

    return NextResponse.json(
      {
        success: true,
        reportId,
        message: 'Report received and queued for review.',
      },
      { status: 202 }
    );
  } catch {
    // Never expose internal stack traces
    return NextResponse.json(
      { error: 'An unexpected internal error occurred while processing the report.' },
      { status: 500 }
    );
  }
}
