export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

export interface RateLimitStore {
  check(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, Bucket>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly maxTokensPerBucket = 1000) {
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    }
  }

  async check(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(identifier);

    if (!bucket) {
      const newBucket: Bucket = {
        tokens: limit - 1,
        lastRefill: now,
      };
      this.buckets.set(identifier, newBucket);
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: Math.floor((now + windowMs) / 1000),
      };
    }

    const elapsed = now - bucket.lastRefill;
    const refillRate = limit / windowMs;
    const tokensToAdd = elapsed * refillRate;

    const newTokens = Math.min(bucket.tokens + tokensToAdd, limit);
    bucket.tokens = newTokens;
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: Math.floor((now + windowMs) / 1000),
      };
    }

    const retryAfterSeconds = Math.ceil((1 - bucket.tokens) / refillRate / 1000);
    const retryAfter = Math.max(1, retryAfterSeconds);
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.floor((now + retryAfter * 1000) / 1000),
      retryAfter,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowSize = 120_000;
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > windowSize) {
        this.buckets.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.buckets.clear();
  }
}

let globalStore: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!globalStore) {
    globalStore = new InMemoryRateLimitStore();
  }
  return globalStore;
}

export function setRateLimitStore(store: RateLimitStore): void {
  globalStore = store;
}

export function resetRateLimitStore(): void {
  globalStore = null;
}
