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
 * Reset the in-memory rate limit store (primarily for tests).
 */
export function resetRateLimits(): void {
  ipRateLimitStore.clear();
}

/**
 * Check and increment rate limit for given IP
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfter: number;
} {
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
