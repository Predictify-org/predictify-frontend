export type CircuitState = "closed" | "open" | "half-open";

export type CircuitBreakerTransition = {
  at: number;
  from: CircuitState;
  to: CircuitState;
  reason: string;
};

export type CircuitBreakerMetrics = {
  state: CircuitState;
  totalRequests: number;
  halfOpenRequests: number;
  halfOpenRatio: number;
  stateTransitions: CircuitBreakerTransition[];
};

export type CacheScope = "account" | "balance";

export type ResilientClientOptions = {
  tenant: string;
  network?: string;
  timeoutMs?: number;
  maxConcurrent?: number;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  cache?: Partial<CacheConfig>;
  clock?: Clock;
};

export type StellarReadRequest = {
  url: string;
  address: string;
  init?: RequestInit;
  critical?: boolean;
};

export type StellarWriteRequest = {
  url: string;
  init: RequestInit;
  critical?: boolean;
};

export type Fetcher = (input: string, init?: RequestInit) => Promise<ResponseLike>;

export type ResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
};

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "CircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class TimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export type CacheKeyParts = {
  tenant: string;
  address: string;
  scope: CacheScope;
  network?: string;
};

export function buildCacheKey({ tenant, address, scope, network }: CacheKeyParts): string {
  if (!tenant.trim()) {
    throw new Error("Cache key tenant is required.");
  }

  if (!address.trim()) {
    throw new Error("Cache key address is required.");
  }

  const safeNetwork = network?.trim() || "default";
  return `${tenant}:${safeNetwork}:${address}:${scope}`;
}

type CacheEntry<T> = {
  value: T;
  freshUntil: number;
  staleUntil: number;
};

type CacheConfig = {
  accountTtlMs: number;
  balanceTtlMs: number;
  staleTtlMs: number;
};

type CircuitBreakerConfig = {
  failureThreshold: number;
  successThreshold: number;
  openDurationMs: number;
  halfOpenMaxInFlight: number;
};

type ResolvedOptions = {
  tenant: string;
  network?: string;
  timeoutMs: number;
  maxConcurrent: number;
  circuitBreaker: CircuitBreakerConfig;
  cache: CacheConfig;
  clock: Clock;
};

type Clock = {
  now: () => number;
};

const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 3,
  successThreshold: 2,
  openDurationMs: 15000,
  halfOpenMaxInFlight: 2,
};

const DEFAULT_CACHE: CacheConfig = {
  accountTtlMs: 15000,
  balanceTtlMs: 8000,
  staleTtlMs: 30000,
};

const DEFAULT_RESILIENCE_OPTIONS = {
  timeoutMs: 8000,
  maxConcurrent: 6,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER,
  cache: DEFAULT_CACHE,
};

const systemClock: Clock = {
  now: () => Date.now(),
};

class ReadCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string, now: number): { value: T; isFresh: boolean; isStale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (now <= entry.freshUntil) {
      return { value: entry.value, isFresh: true, isStale: false };
    }

    if (now <= entry.staleUntil) {
      return { value: entry.value, isFresh: false, isStale: true };
    }

    this.store.delete(key);
    return null;
  }

  set<T>(key: string, value: T, ttlMs: number, staleTtlMs: number, now: number): void {
    this.store.set(key, {
      value,
      freshUntil: now + ttlMs,
      staleUntil: now + ttlMs + staleTtlMs,
    });
  }
}

class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (limit <= 0) {
      throw new Error("Semaphore limit must be greater than zero.");
    }
  }

  acquire(): Promise<() => void> {
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve(() => this.release());
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active += 1;
        resolve(() => this.release());
      });
    });
  }

  tryAcquire(): (() => void) | null {
    if (this.active < this.limit) {
      this.active += 1;
      return () => this.release();
    }

    return null;
  }

  private release() {
    this.active = Math.max(this.active - 1, 0);
    const next = this.queue.shift();
    if (next) next();
  }
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private halfOpenSuccesses = 0;
  private openUntil = 0;
  private transitions: CircuitBreakerTransition[] = [];
  private totalRequests = 0;
  private halfOpenRequests = 0;
  private halfOpenSlots: Semaphore;

  constructor(private readonly config: CircuitBreakerConfig, private readonly clock: Clock) {
    this.halfOpenSlots = new Semaphore(config.halfOpenMaxInFlight);
  }

  getState(now = this.clock.now()): CircuitState {
    this.updateState(now);
    return this.state;
  }

  async waitForReady(critical: boolean): Promise<void> {
    this.totalRequests += 1;
    const now = this.clock.now();
    this.updateState(now);

    if (this.state !== "open") return;

    const retryAfterMs = Math.max(this.openUntil - now, 0);
    if (!critical) {
      throw new CircuitOpenError("Circuit is open.", retryAfterMs);
    }

    if (retryAfterMs > 0) {
      await delay(retryAfterMs);
    }

    this.updateState(this.clock.now());
  }

  async acquireHalfOpenSlot(critical: boolean): Promise<(() => void) | null> {
    if (this.state !== "half-open") return null;

    this.halfOpenRequests += 1;

    if (critical) {
      const release = await this.halfOpenSlots.acquire();
      if (this.state !== "half-open") {
        release();
        return null;
      }
      return release;
    }

    const release = this.halfOpenSlots.tryAcquire();
    if (!release) {
      throw new CircuitOpenError("Circuit is half-open.", 0);
    }

    return release;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;

    if (this.state === "half-open") {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo("closed", "Half-open success threshold met.");
      }
    }
  }

  recordFailure(reason: string): void {
    if (this.state === "half-open") {
      this.open(reason);
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.open(reason);
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    const total = this.totalRequests || 0;
    const halfOpenRatio = total === 0 ? 0 : this.halfOpenRequests / total;
    return {
      state: this.state,
      totalRequests: total,
      halfOpenRequests: this.halfOpenRequests,
      halfOpenRatio,
      stateTransitions: [...this.transitions],
    };
  }

  private open(reason: string) {
    this.transitionTo("open", reason);
    this.openUntil = this.clock.now() + this.config.openDurationMs;
    this.consecutiveFailures = 0;
    this.halfOpenSuccesses = 0;
  }

  private updateState(now: number) {
    if (this.state === "open" && now >= this.openUntil) {
      this.transitionTo("half-open", "Open duration elapsed.");
    }
  }

  private transitionTo(next: CircuitState, reason: string) {
    if (this.state === next) return;

    const previous = this.state;
    this.state = next;
    this.transitions.push({
      at: this.clock.now(),
      from: previous,
      to: next,
      reason,
    });
  }
}

class ResilientStellarClient {
  private cache = new ReadCache();
  private circuit: CircuitBreaker;
  private semaphore: Semaphore;

  constructor(
    private readonly options: ResolvedOptions,
    private readonly fetcher: Fetcher,
  ) {
    this.circuit = new CircuitBreaker(options.circuitBreaker, options.clock);
    this.semaphore = new Semaphore(options.maxConcurrent);
  }

  async readAccount<T>(request: StellarReadRequest): Promise<T> {
    return this.readJson<T>({ ...request, scope: "account" });
  }

  async readBalances<T>(request: StellarReadRequest): Promise<T> {
    return this.readJson<T>({ ...request, scope: "balance" });
  }

  async writeJson<T>({ url, init, critical = true }: StellarWriteRequest): Promise<T> {
    return this.executeJson<T>({ url, init, critical });
  }

  getCircuitMetrics(): CircuitBreakerMetrics {
    return this.circuit.getMetrics();
  }

  getCircuitState(): CircuitState {
    return this.circuit.getState();
  }

  private async readJson<T>({ url, init, address, scope, critical = false }: StellarReadRequest & {
    scope: CacheScope;
  }): Promise<T> {
    const now = this.options.clock.now();
    const cacheKey = buildCacheKey({
      tenant: this.options.tenant,
      address,
      scope,
      network: this.options.network,
    });

    const cached = this.cache.get<T>(cacheKey, now);
    if (cached?.isFresh) {
      return cached.value;
    }

    if (this.circuit.getState(now) === "open" && cached?.isStale) {
      return cached.value;
    }

    try {
      const data = await this.executeJson<T>({ url, init, critical });
      const ttlMs = scope === "account" ? this.options.cache.accountTtlMs : this.options.cache.balanceTtlMs;
      this.cache.set(cacheKey, data, ttlMs, this.options.cache.staleTtlMs, this.options.clock.now());
      return data;
    } catch (error) {
      if (cached?.isStale) {
        return cached.value;
      }
      throw error;
    }
  }

  private async executeJson<T>({
    url,
    init,
    critical,
  }: {
    url: string;
    init?: RequestInit;
    critical: boolean;
  }): Promise<T> {
    if (!url.trim()) {
      throw new Error("Request url is required.");
    }

    await this.circuit.waitForReady(critical);

    let releaseHalfOpen: (() => void) | null = null;
    if (this.circuit.getState() === "half-open") {
      releaseHalfOpen = await this.circuit.acquireHalfOpenSlot(critical);
      if (!releaseHalfOpen && this.circuit.getState() === "open") {
        return this.executeJson<T>({ url, init, critical });
      }
    }

    const release = await this.semaphore.acquire();
    const controller = init?.signal ? undefined : new AbortController();
    try {
      const response = await withTimeout(
        this.fetcher(url, { ...init, signal: init?.signal ?? controller?.signal }),
        this.options.timeoutMs,
        controller,
      );

      if (!response.ok) {
        const message = await safeErrorText(response);
        const error = new HttpError(message, response.status);
        this.circuit.recordFailure(`HTTP ${response.status}`);
        throw error;
      }

      const json = (await response.json()) as T;
      this.circuit.recordSuccess();
      return json;
    } catch (error) {
      if (error instanceof TimeoutError) {
        this.circuit.recordFailure("timeout");
        throw error;
      }

      if (error instanceof CircuitOpenError) {
        throw error;
      }

      if (error instanceof HttpError) {
        throw error;
      }

      if (isAbortError(error)) {
        const timeoutError = new TimeoutError("Request timed out.", this.options.timeoutMs);
        this.circuit.recordFailure("timeout");
        throw timeoutError;
      }

      this.circuit.recordFailure("network error");
      throw error;
    } finally {
      release();
      if (releaseHalfOpen) releaseHalfOpen();
    }
  }
}

export function createResilientStellarClient(
  options: ResilientClientOptions,
  fetcher?: Fetcher,
): {
  readAccount: <T>(request: StellarReadRequest) => Promise<T>;
  readBalances: <T>(request: StellarReadRequest) => Promise<T>;
  writeJson: <T>(request: StellarWriteRequest) => Promise<T>;
  getCircuitMetrics: () => CircuitBreakerMetrics;
  getCircuitState: () => CircuitState;
} {
  const resolved = resolveOptions(options);
  const client = new ResilientStellarClient(resolved, resolveFetcher(fetcher));

  return {
    readAccount: client.readAccount.bind(client),
    readBalances: client.readBalances.bind(client),
    writeJson: client.writeJson.bind(client),
    getCircuitMetrics: client.getCircuitMetrics.bind(client),
    getCircuitState: client.getCircuitState.bind(client),
  };
}

function resolveOptions(options: ResilientClientOptions): ResolvedOptions {
  if (!options.tenant?.trim()) {
    throw new Error("Resilient client tenant is required.");
  }

  return {
    tenant: options.tenant.trim(),
    network: options.network?.trim(),
    timeoutMs: options.timeoutMs ?? DEFAULT_RESILIENCE_OPTIONS.timeoutMs,
    maxConcurrent: options.maxConcurrent ?? DEFAULT_RESILIENCE_OPTIONS.maxConcurrent,
    circuitBreaker: {
      failureThreshold:
        options.circuitBreaker?.failureThreshold ??
        DEFAULT_RESILIENCE_OPTIONS.circuitBreaker.failureThreshold,
      successThreshold:
        options.circuitBreaker?.successThreshold ??
        DEFAULT_RESILIENCE_OPTIONS.circuitBreaker.successThreshold,
      openDurationMs:
        options.circuitBreaker?.openDurationMs ??
        DEFAULT_RESILIENCE_OPTIONS.circuitBreaker.openDurationMs,
      halfOpenMaxInFlight:
        options.circuitBreaker?.halfOpenMaxInFlight ??
        DEFAULT_RESILIENCE_OPTIONS.circuitBreaker.halfOpenMaxInFlight,
    },
    cache: {
      accountTtlMs: options.cache?.accountTtlMs ?? DEFAULT_RESILIENCE_OPTIONS.cache.accountTtlMs,
      balanceTtlMs: options.cache?.balanceTtlMs ?? DEFAULT_RESILIENCE_OPTIONS.cache.balanceTtlMs,
      staleTtlMs: options.cache?.staleTtlMs ?? DEFAULT_RESILIENCE_OPTIONS.cache.staleTtlMs,
    },
    clock: options.clock ?? systemClock,
  };
}

function resolveFetcher(fetcher?: Fetcher): Fetcher {
  if (fetcher) return fetcher;
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available.");
  }
  return fetch as Fetcher;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  controller?: AbortController,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (controller) controller.abort();
      reject(new TimeoutError("Request timed out.", timeoutMs));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
      });
  });
}

async function safeErrorText(response: ResponseLike): Promise<string> {
  if (!response.text) {
    return `HTTP ${response.status}`;
  }

  try {
    const text = await response.text();
    return text || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return "name" in error && (error as { name?: string }).name === "AbortError";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
