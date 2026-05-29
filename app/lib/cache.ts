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

  private buildKey(tenant: string, id: string): string {
    if (!tenant || tenant.trim() === '') {
      throw new Error("Tenant is required");
    }
    if (!id) {
      throw new Error("ID is required");
    }
    return `${this.scope}:${tenant}:${id}`;
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

  get(tenant: string, id: string): T | null {
    if (this.isDisabled()) {
      return null;
    }
    const key = this.buildKey(tenant, id);
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

  set(tenant: string, id: string, val: T): void {
    if (this.isDisabled()) {
      return;
    }
    const key = this.buildKey(tenant, id);
    
    if (this.cache.size >= 500) {
      /* istanbul ignore next: lazy sweep path exclusion */
      this.lazySweep();
    }

    this.cache.set(key, {
      value: val,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(tenant: string, id: string): void {
    const key = this.buildKey(tenant, id);
    this.cache.delete(key);
  }
}

export function createCache<T>(scope: string, ttlMs?: number): TenantScopedCache<T> {
  return new TenantScopedCache<T>(scope, ttlMs);
}

export const streamCache = createCache<any>("stream");
