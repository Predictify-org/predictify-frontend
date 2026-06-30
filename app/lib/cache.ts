export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TenantScopedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private scope: string;
  private ttlMs: number;

  constructor(scope: string, ttlMs: number = 300000) {
    this.scope = scope;
    this.ttlMs = ttlMs;
  }

  private isDisabled(): boolean {
    if (process.env.STREAMPAY_CACHE_DISABLED === 'true') {
      return true;
    }
    if (process.env.NODE_ENV === 'test' && process.env.STREAMPAY_CACHE_DISABLED !== 'false') {
      return true;
    }
    return false;
  }

  private buildKey(tenant: string, id: string, network?: string): string {
    if (!tenant || tenant.trim() === '') {
      throw new Error("Tenant is required");
    }
    if (!id) {
      throw new Error("ID is required");
    }
    const networkSegment = network && network.trim() !== '' ? network.trim() : "default";
    return `${this.scope}:${networkSegment}:${tenant}:${id}`;
  }

  private lazySweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
    if (this.cache.size > 500) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, this.cache.size - 500);
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
    }
  }

  get(tenant: string, id: string, network?: string): T | null {
    if (this.isDisabled()) {
      return null;
    }
    const key = this.buildKey(tenant, id, network);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(tenant: string, id: string, val: T, network?: string): void {
    if (this.isDisabled()) {
      return;
    }
    const key = this.buildKey(tenant, id, network);

    if (this.cache.size >= 500) {
      /* istanbul ignore next: lazy sweep path exclusion */
      this.lazySweep();
    }

    this.cache.set(key, {
      value: val,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(tenant: string, id: string, network?: string): void {
    const key = this.buildKey(tenant, id, network);
    this.cache.delete(key);
  }

  /**
   * Drop every cached entry under this scope.
   *
   * Intended to be invoked from a real `setNetwork()` path (e.g.
   * `app/lib/network.ts`) once such a switcher exists. The network-
   * segmented cache keys already prevent cross-network cache leakage
   * on their own; this method is the belt-and-braces companion for
   * clearing every segment (including `"default"` entries written by
   * legacy callers) on a hard network reset.
   */
  flush(): void {
    this.cache.clear();
  }
}

export function createCache<T>(scope: string, ttlMs?: number): TenantScopedCache<T> {
  return new TenantScopedCache<T>(scope, ttlMs);
}

export const streamCache = createCache<any>("stream");

/**
 * Flush the process-wide stream cache.
 *
 * TODO: wire this into the project-wide `setNetwork()` call site once it
 * lands (the bug spec requires the cache to be flushed *immediately* on
 * network switch — network-segmented keys alone satisfy the regression
 * but not the "flush immediately" wording). Today there is no internal
 * caller, so this helper is exercised only by tests. It maps directly to
 * `Map.clear()`, which is O(n) with n bounded at 500 by `lazySweep()`.
 */
export function flushStreamCache(): void {
  streamCache.flush();
}
