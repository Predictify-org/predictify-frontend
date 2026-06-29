/**
 * lib/chaos.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fault-injection middleware for chaos tests.
 *
 * Purpose
 * ───────
 * Allow engineering teams to inject latency, error responses, or request
 * aborts into the API surface in a controlled, deterministic way. This
 * module powers chaos experiments (latency ramps, server-kill simulations,
 * partial degradation testing) WITHOUT requiring destructive changes to
 * production code paths.
 *
 * Safety guarantees
 * ────────────────
 * 1. Disabled by default. The middleware will NOT inject anything unless the
 *    environment explicitly opts in (CHAOS_ENABLED=true) OR the caller
 *    supplies an explicit `enabled: true` override via options. This is the
 *    last line of defense against accidental chaos in production.
 * 2. Input validation at the boundary. Bad rates, NaN values, negative
 *    latency, out-of-range status codes, malformed path prefixes, or empty
 *    error codes cause the resolver to throw `ChaosConfigError` rather
 *    than silently misbehave.
 * 3. Standardized error envelope. Injected error responses use the
 *    canonical `{ error: { code, message, request_id } }` envelope used by
 *    every other API route, so client retry/decode paths behave identically.
 * 4. Structured logging. Every injection decision logs via the shared
 *    logger (with correlation IDs when available) so chaos runs are
 *    observable in production observability stacks.
 * 5. Deterministic with seed. Tests can fix an RNG (`CHAOS_SEED`) so
 *    injection decisions are reproducible across CI runs.
 *
 * Activation
 * ──────────
 *   • Environment variables (see {@link CHAOS_ENV_KEYS})
 *   • Programmatic override via {@link withChaosMiddleware} options
 *
 * API surface
 * ───────────
 *   {@link ChaosInjectionConfig}   – canonical, fully-resolved config
 *   {@link resolveChaosConfig}     – merge env + overrides + defaults + validate
 *   {@link decideChaos}            – pure function: decide if/how to inject
 *   {@link withChaosMiddleware}    – Next.js request wrapper around a handler
 *   {@link ChaosConfigError}       – thrown on invalid configuration
 *
 * @see lib/chaos.test.ts for the canonical test suite (>=90% line coverage).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The kinds of faults this middleware can inject.
 *  - `latency`: pause the request for a randomized duration in ms.
 *  - `error`:   short-circuit with a synthetic HTTP error response.
 *  - `abort`:   abort the downstream handler (caller catches AbortError).
 */
export type ChaosFaultType = "latency" | "error" | "abort";

/**
 * HTTP methods eligible for fault injection. Empty array means "all".
 * Method names are normalized to uppercase at the boundary.
 */
export type ChaosMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

/**
 * Canonical, fully-resolved chaos configuration.
 *
 * Constructed by {@link resolveChaosConfig} from:
 *   defaults  ←  environment variables  ←  caller overrides
 *
 * Always validated. Throws {@link ChaosConfigError} for invalid input.
 */
export interface ChaosInjectionConfig {
  /** Master switch. Mirrors CHAOS_ENABLED. Never `true` by default. */
  enabled: boolean;

  /** Probability in [0, 1] of injecting latency on a matching request. */
  latencyRate: number;
  /** Probability in [0, 1] of injecting an error response. */
  errorRate: number;
  /** Probability in [0, 1] of injecting a handler abort. */
  abortRate: number;

  /** Minimum injected latency in milliseconds (>= 0). */
  minLatencyMs: number;
  /** Maximum injected latency in milliseconds (>= minLatencyMs). */
  maxLatencyMs: number;

  /** HTTP status code returned on injected errors (400..599). */
  errorStatus: number;
  /** Machine-readable error code embedded in the response envelope. */
  errorCode: string;
  /** Human-readable error message embedded in the response envelope. */
  errorMessage: string;

  /**
   * Path prefixes the middleware will consider for injection.
   * An empty array is treated as "all paths".
   * Each prefix is normalized to start with `/`.
   */
  pathPrefixes: string[];
  /** HTTP methods eligible for injection. Empty array = all methods. */
  methods: ChaosMethod[];

  /**
   * Optional RNG seed for deterministic chaos runs.
   * When set, `Math.random` is replaced by a seeded PRNG locally —
   * global Math.random is left untouched.
   */
  seed?: number;
}

/**
 * A single fault decision returned by {@link decideChaos}.
 * The decision is immutable — downstream code consumes it directly.
 */
export type ChaosFault =
  | { type: "latency"; durationMs: number }
  | { type: "error"; status: number; code: string; message: string }
  | { type: "abort"; reason: string };

/**
 * The full output of {@link decideChaos}: either a fault to apply, or
 * explicit "no fault" with a reason (useful for logs and tests).
 */
export interface ChaosDecision {
  shouldFault: boolean;
  fault?: ChaosFault;
  /** Human/operator-readable reason: roles in observability & testing. */
  reason: string;
}

/**
 * Options for {@link withChaosMiddleware}. Mirrors {@link ChaosInjectionConfig}
 * but every field is optional. Any field not provided falls through to the
 * resolver (env → defaults).
 */
export interface ChaosMiddlewareOptions {
  /** Override the resolved config field-by-field. */
  overrides?: Partial<ChaosInjectionConfig>;
  /**
   * If true, force chaos to run even when env says disabled. Useful for
   * Jest test suites. Default: false.
   */
  forceEnable?: boolean;
  /**
   * Optional RNG override for tests. Receives a value in [0, 1).
   * If omitted, falls through to the seeded PRNG (when a seed is configured)
   * or Math.random.
   */
  random?: () => number;
}

/**
 * Minimal subset of a NextRequest we need to decide.
 * Decoupling the decider from Next.js keeps the unit tests framework-free.
 */
export interface ChaosRequestContext {
  path: string;
  method: string;
  correlationId?: string;
  requestId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Defaults applied when neither env nor overrides specify a value. */
export const CHAOS_DEFAULTS: Omit<ChaosInjectionConfig, "pathPrefixes" | "methods"> & {
  pathPrefixes: string[];
  methods: ChaosMethod[];
} = {
  enabled: false,
  latencyRate: 0,
  errorRate: 0,
  abortRate: 0,
  minLatencyMs: 0,
  maxLatencyMs: 0,
  errorStatus: 503,
  errorCode: "CHAOS_INJECTED_ERROR",
  errorMessage: "This response was generated by the chaos middleware.",
  pathPrefixes: [],
  methods: [],
};

/** All environment variables read by this module. */
export const CHAOS_ENV_KEYS = {
  enabled: "CHAOS_ENABLED",
  latencyRate: "CHAOS_LATENCY_RATE",
  errorRate: "CHAOS_ERROR_RATE",
  abortRate: "CHAOS_ABORT_RATE",
  minLatencyMs: "CHAOS_MIN_LATENCY_MS",
  maxLatencyMs: "CHAOS_MAX_LATENCY_MS",
  errorStatus: "CHAOS_ERROR_STATUS",
  errorCode: "CHAOS_ERROR_CODE",
  errorMessage: "CHAOS_ERROR_MESSAGE",
  pathPrefixes: "CHAOS_PATH_PREFIXES",
  methods: "CHAOS_METHODS",
  seed: "CHAOS_SEED",
} as const;

/** HTTP methods recognised as valid chaos targets. */
const VALID_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);

/** Acceptable HTTP status range for injected errors. */
const MIN_ERROR_STATUS = 400;
const MAX_ERROR_STATUS = 599;

/** Cap on a single injected latency to avoid pathologically-slow runs. */
const MAX_LATENCY_CAP_MS = 60_000;

/** Identifier pattern used for `errorCode` (uppercase snake_case-ish). */
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

// ─── Errors ───────────────────────────────────────────────────────────────────

/**
 * Thrown by {@link resolveChaosConfig} when the resolved config would be
 * unsafe or otherwise unusable. Carry `.field` so callers can pinpoint
 * which env var or option misbehaved.
 */
export class ChaosConfigError extends Error {
  public readonly field: string;
  public readonly value: unknown;

  constructor(field: string, value: unknown, message: string) {
    super(`[chaos] ${message} (field: ${field}, value: ${safeStringify(value)})`);
    this.name = "ChaosConfigError";
    this.field = field;
    this.value = value;
  }
}

/**
 * JSON.stringify wrapper that falls back to a typed placeholder when
 * the value can't be serialized:
 *   • JSON.stringify returns `undefined` for functions, symbols, and
 *     `undefined` itself (no exception).
 *   • JSON.stringify throws for circular refs and BigInt.
 * ChaosConfigError must never throw further during its own construction.
 */
function safeStringify(value: unknown): string {
  try {
    const result = JSON.stringify(value);
    if (result !== undefined) return result;
  } catch {
    // fall through to typed placeholder
  }
  if (typeof value === "bigint") return `"<BigInt ${value.toString()}n>"`;
  if (typeof value === "function") return `"<function ${value.name || "anonymous"}>"`;
  if (typeof value === "symbol") return `"<symbol ${value.toString()}>"`;
  if (typeof value === "undefined") return `"<undefined>"`;
  return `"<unserializable ${typeof value}>"`;
}

// ─── Validation helpers ──────────────────────────────────────────────────────

/**
 * Throws if `value` is not a finite number in [0, 1].
 * Used for every "rate" field — keeps the decider's RNG interpretation safe.
 */
function assertProbability(field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ChaosConfigError(field, value, "value must be a finite number");
  }
  if (value < 0 || value > 1) {
    throw new ChaosConfigError(field, value, "value must be in the inclusive range [0, 1]");
  }
  return value;
}

/**
 * Throws if `value` is not a finite non-negative integer in milliseconds.
 */
function assertNonNegativeInt(field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ChaosConfigError(field, value, "value must be a finite number");
  }
  if (value < 0) {
    throw new ChaosConfigError(field, value, "value must be >= 0");
  }
  if (!Number.isInteger(value)) {
    throw new ChaosConfigError(field, value, "value must be an integer (milliseconds)");
  }
  return value;
}

/**
 * Throws if `value` is not a valid integer HTTP status code in the 4xx–5xx
 * range. We deliberately exclude 1xx/2xx/3xx: chaos-injected responses
 * must always signal a problem.
 */
function assertErrorStatus(field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new ChaosConfigError(field, value, "value must be a finite integer HTTP status");
  }
  if (value < MIN_ERROR_STATUS || value > MAX_ERROR_STATUS) {
    throw new ChaosConfigError(
      field,
      value,
      `value must be in the inclusive range [${MIN_ERROR_STATUS}, ${MAX_ERROR_STATUS}]`,
    );
  }
  return value;
}

/**
 * Throws if `value` is not a non-empty ASCII identifier suitable for use
 * as a `code` field in the standardized error envelope.
 */
function assertErrorCode(field: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ChaosConfigError(field, value, "value must be a non-empty string");
  }
  if (value.length > 64) {
    throw new ChaosConfigError(field, value, "value must be at most 64 characters");
  }
  if (!ERROR_CODE_PATTERN.test(value)) {
    throw new ChaosConfigError(
      field,
      value,
      "value must start with an uppercase letter and contain only A-Z, 0-9, or underscores",
    );
  }
  return value;
}

/**
 * Throws if `value` is not a non-trivial string (used for messages and
 * path prefixes — no empty strings, no whitespace-only, no control chars).
 */
function assertNonEmptyString(field: string, value: unknown, maxLen = 1024): string {
  if (typeof value !== "string") {
    throw new ChaosConfigError(field, value, "value must be a string");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ChaosConfigError(field, value, "value must not be empty or whitespace-only");
  }
  if (trimmed.length > maxLen) {
    throw new ChaosConfigError(field, value, `value must be at most ${maxLen} characters`);
  }
  // No newlines / tabs / control chars in user-facing strings.
  if (/[\u0000-\u001f]/.test(trimmed)) {
    throw new ChaosConfigError(field, value, "value must not contain control characters");
  }
  return trimmed;
}

/**
 * Normalize and validate a list of path prefixes.
 *   • splits on `,` if a string is passed
 *   • trims whitespace
 *   • rejects empty entries
 *   • ensures each prefix starts with `/`
 *   • rejects anything containing a control char or whitespace
 */
function assertPathPrefixes(field: string, value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const raw: string[] = Array.isArray(value)
    ? value.map((v) => String(v))
    : String(value).split(",");

  const out: string[] = [];
  for (const entry of raw) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (/\s/.test(trimmed)) {
      throw new ChaosConfigError(field, entry, "prefix must not contain whitespace");
    }
    if (/[\u0000-\u001f]/.test(trimmed)) {
      throw new ChaosConfigError(field, entry, "prefix must not contain control characters");
    }
    out.push(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
  }
  return out;
}

/**
 * Normalize and validate a list of HTTP methods.
 *   • splits on `,` if a string is passed
 *   • uppercases and trims
 *   • rejects anything not in {@link VALID_METHODS}
 *   • dedupes (case-insensitive on input, normalized to uppercase)
 */
function assertMethods(field: string, value: unknown): ChaosMethod[] {
  if (value === undefined || value === null) return [];
  const raw: string[] = Array.isArray(value)
    ? value.map((v) => String(v))
    : String(value).split(",");

  const seen = new Set<string>();
  const out: ChaosMethod[] = [];
  for (const entry of raw) {
    const trimmed = entry.trim().toUpperCase();
    if (trimmed.length === 0) continue;
    if (!VALID_METHODS.has(trimmed)) {
      throw new ChaosConfigError(field, entry, `method must be one of: ${[...VALID_METHODS].join(", ")}`);
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed as ChaosMethod);
    }
  }
  return out;
}

// ─── Seeded PRNG (mulberry32) ────────────────────────────────────────────────

/**
 * Build a deterministic PRNG from a 32-bit unsigned integer seed.
 * Returns a function producing values in [0, 1).
 *
 * Implementation: mulberry32 — small, fast, good-enough distribution for
 * chaos-rate sampling. NOT cryptographically secure — and we deliberately
 * do not use it for anything security-sensitive.
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) state = 0xdeadbeef; // Avoid degenerate seed = 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Env resolver ────────────────────────────────────────────────────────────

/**
 * Read a single env var as a finite number — `null` when unset/invalid.
 * Invalid numbers are quietly reported via the returned `null` so callers
 * can fall through to defaults (the surfaced error path is for the FINAL
 * resolved config, validated by {@link resolveChaosConfig}).
 */
function readEnvNumber(name: string): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Read a single env var as a trimmed string — `null` when unset/empty.
 */
function readEnvString(name: string): string | null {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Read `CHAOS_ENABLED` as a truthy boolean.
 *
 * Truthy: 1, true, yes, on (case-insensitive).
 * Falsy:  0, false, no, off, unset, anything else.
 */
function readEnvEnabled(name: string): boolean {
  const raw = readEnvString(name);
  if (raw === null) return false;
  const lower = raw.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes" || lower === "on";
}

// ─── Config assembly + validation ────────────────────────────────────────────

/**
 * Compose a {@link ChaosInjectionConfig} from defaults, environment
 * variables, and caller overrides (in that priority order).
 *
 * Throws {@link ChaosConfigError} if any field in the merged config fails
 * validation. Throws are deterministic: the field name in the error
 * matches the most-derived source (override → env → default).
 *
 * @example
 *   const cfg = resolveChaosConfig({ overrides: { latencyRate: 0.5 } });
 */
export function resolveChaosConfig(
  opts: { overrides?: Partial<ChaosInjectionConfig> } = {},
): ChaosInjectionConfig {
  const o = opts.overrides ?? {};

  // 1. Start from defaults
  // 2. Apply env (only if override did not provide a value)
  // 3. Apply caller overrides
  // 4. Validate the merged result

  const enabled = o.enabled ?? readEnvEnabled(CHAOS_ENV_KEYS.enabled);

  const latencyRate = assertProbability(
    CHAOS_ENV_KEYS.latencyRate,
    o.latencyRate ?? readEnvNumber(CHAOS_ENV_KEYS.latencyRate) ?? CHAOS_DEFAULTS.latencyRate,
  );

  const errorRate = assertProbability(
    CHAOS_ENV_KEYS.errorRate,
    o.errorRate ?? readEnvNumber(CHAOS_ENV_KEYS.errorRate) ?? CHAOS_DEFAULTS.errorRate,
  );

  const abortRate = assertProbability(
    CHAOS_ENV_KEYS.abortRate,
    o.abortRate ?? readEnvNumber(CHAOS_ENV_KEYS.abortRate) ?? CHAOS_DEFAULTS.abortRate,
  );

  const minLatencyMs = assertNonNegativeInt(
    CHAOS_ENV_KEYS.minLatencyMs,
    o.minLatencyMs ?? readEnvNumber(CHAOS_ENV_KEYS.minLatencyMs) ?? CHAOS_DEFAULTS.minLatencyMs,
  );

  const rawMax = o.maxLatencyMs ?? readEnvNumber(CHAOS_ENV_KEYS.maxLatencyMs) ?? CHAOS_DEFAULTS.maxLatencyMs;
  const maxLatencyMs = assertNonNegativeInt(CHAOS_ENV_KEYS.maxLatencyMs, rawMax);
  if (maxLatencyMs < minLatencyMs) {
    throw new ChaosConfigError(
      CHAOS_ENV_KEYS.maxLatencyMs,
      maxLatencyMs,
      `maxLatencyMs (${maxLatencyMs}) must be >= minLatencyMs (${minLatencyMs})`,
    );
  }
  if (maxLatencyMs > MAX_LATENCY_CAP_MS) {
    throw new ChaosConfigError(
      CHAOS_ENV_KEYS.maxLatencyMs,
      maxLatencyMs,
      `maxLatencyMs must be <= ${MAX_LATENCY_CAP_MS} (60s) to avoid runaway runs`,
    );
  }

  const errorStatus = assertErrorStatus(
    CHAOS_ENV_KEYS.errorStatus,
    o.errorStatus ?? readEnvNumber(CHAOS_ENV_KEYS.errorStatus) ?? CHAOS_DEFAULTS.errorStatus,
  );

  const errorCode = assertErrorCode(
    CHAOS_ENV_KEYS.errorCode,
    o.errorCode ?? readEnvString(CHAOS_ENV_KEYS.errorCode) ?? CHAOS_DEFAULTS.errorCode,
  );

  const errorMessage = assertNonEmptyString(
    CHAOS_ENV_KEYS.errorMessage,
    o.errorMessage ?? readEnvString(CHAOS_ENV_KEYS.errorMessage) ?? CHAOS_DEFAULTS.errorMessage,
  );

  const pathPrefixes = assertPathPrefixes(
    CHAOS_ENV_KEYS.pathPrefixes,
    o.pathPrefixes ?? readEnvString(CHAOS_ENV_KEYS.pathPrefixes) ?? CHAOS_DEFAULTS.pathPrefixes,
  );

  const methods = assertMethods(
    CHAOS_ENV_KEYS.methods,
    o.methods ?? readEnvString(CHAOS_ENV_KEYS.methods) ?? CHAOS_DEFAULTS.methods,
  );

  // Optional seed — only validate if provided.
  let seed: number | undefined;
  if (o.seed !== undefined) {
    if (typeof o.seed !== "number" || !Number.isFinite(o.seed) || !Number.isInteger(o.seed)) {
      throw new ChaosConfigError(CHAOS_ENV_KEYS.seed, o.seed, "value must be a finite integer");
    }
    seed = o.seed;
  } else {
    const envSeed = readEnvNumber(CHAOS_ENV_KEYS.seed);
    if (envSeed !== null) {
      if (!Number.isInteger(envSeed)) {
        throw new ChaosConfigError(
          CHAOS_ENV_KEYS.seed,
          envSeed,
          "value must be a finite integer (no fractional seeds)",
        );
      }
      seed = envSeed;
    }
  }

  return {
    enabled,
    latencyRate,
    errorRate,
    abortRate,
    minLatencyMs,
    maxLatencyMs,
    errorStatus,
    errorCode,
    errorMessage,
    pathPrefixes,
    methods,
    seed,
  };
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Return `true` when the request path matches one of the configured path
 * prefixes. Empty `pathPrefixes` means "match everything" — this is the
 * common chaos-run case where the operator wants the whole endpoint surface
 * to be a target.
 *
 * Matching is purely prefix-based (no glob, no regex). This is intentional:
 * chaos operators need to be able to read the config and predict matches
 * at a glance.
 */
export function matchesPath(path: string, pathPrefixes: readonly string[]): boolean {
  if (pathPrefixes.length === 0) return true;
  for (const prefix of pathPrefixes) {
    if (path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)) {
      return true;
    }
    if (path.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Return `true` when the request method is eligible for injection.
 * Empty `methods` array means "all methods".
 * Comparison is case-insensitive on BOTH sides — callers can pass either
 * pre-normalized entries or raw input.
 */
export function matchesMethod(method: string, methods: readonly ChaosMethod[]): boolean {
  if (methods.length === 0) return true;
  const upper = method.toUpperCase();
  // Normalize the configured list at call time so we don't depend on the
  // caller to have already done it.
  for (const candidate of methods) {
    if (candidate.toUpperCase() === upper) return true;
  }
  return false;
}

// ─── Pure decision function ───────────────────────────────────────────────────

/**
 * Decide whether to inject a fault, and which one.
 *
 * This is a PURE function: same input + same RNG seed → same output. Kept
 * pure so the test suite can lock every branch without mocking globals.
 *
 * The first matching rate (latency → error → abort) wins, in that order.
 * If you want a "uniform" mix, set latencyRate = errorRate = abortRate
 * and accept the (deterministic, stable) distribution.
 *
 * @param config   Resolved chaos config.
 * @param context  Lightweight request shape (path, method, correlation).
 * @param random   RNG producing values in [0, 1). Defaults to Math.random.
 *                 Pass a seeded RNG for deterministic tests.
 */
export function decideChaos(
  config: ChaosInjectionConfig,
  context: ChaosRequestContext,
  random: () => number = Math.random,
): ChaosDecision {
  // Cheap checks first: path/method filter.
  if (!config.enabled) {
    return { shouldFault: false, reason: "chaos is disabled" };
  }
  if (!matchesPath(context.path, config.pathPrefixes)) {
    return { shouldFault: false, reason: `path "${context.path}" is outside pathPrefixes` };
  }
  if (!matchesMethod(context.method, config.methods)) {
    return {
      shouldFault: false,
      reason: `method "${context.method}" is outside methods allowlist`,
    };
  }

  // Sum must be <= 1 — guard so callers can verify their config makes sense.
  const totalRate = config.latencyRate + config.errorRate + config.abortRate;
  if (totalRate === 0) {
    return { shouldFault: false, reason: "all injection rates are zero" };
  }
  if (totalRate > 1 + Number.EPSILON) {
    return {
      shouldFault: false,
      reason: `injection rates sum to ${totalRate}, which exceeds 1.0 — refusing to inject`,
    };
  }

  const draw = random();

  // ── Latency (deterministic when min === max) ──────────────────────────────
  if (config.latencyRate > 0 && draw < config.latencyRate) {
    const span = Math.max(0, config.maxLatencyMs - config.minLatencyMs);
    const baseDuration =
      span === 0
        ? config.minLatencyMs
        : config.minLatencyMs + Math.floor(random() * (span + 1));
    return {
      shouldFault: true,
      fault: { type: "latency", durationMs: baseDuration },
      reason: `latency injection (rate=${config.latencyRate})`,
    };
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (config.errorRate > 0) {
    const errorThreshold = config.latencyRate + config.errorRate;
    if (draw < errorThreshold) {
      return {
        shouldFault: true,
        fault: {
          type: "error",
          status: config.errorStatus,
          code: config.errorCode,
          message: config.errorMessage,
        },
        reason: `error injection (status=${config.errorStatus})`,
      };
    }
  }

  // ── Abort ────────────────────────────────────────────────────────────────
  if (config.abortRate > 0) {
    const abortThreshold = config.latencyRate + config.errorRate + config.abortRate;
    if (draw < abortThreshold) {
      return {
        shouldFault: true,
        fault: { type: "abort", reason: "chaos middleware aborted the request" },
        reason: `abort injection (rate=${config.abortRate})`,
      };
    }
  }

  return { shouldFault: false, reason: "random draw fell outside all injection ranges" };
}

// ─── Logging helper ──────────────────────────────────────────────────────────

/**
 * Best-effort structured log entry. We deliberately do NOT import the
 * project's logger here — this module is also loaded by the Edge runtime
 * (Next middleware), where importing the broader `app/lib/logger` would
 * pull Node-only modules (node:async_hooks) into a context that doesn't
 * support them. Callers that want correlation-tagged logs should use
 * `withChaosMiddleware` from a context where the logger is available.
 */
function logInjection(
  decision: ChaosDecision,
  context: ChaosRequestContext,
  sink: (line: string) => void = (line) => console.log(line),
): void {
  if (!decision.shouldFault) return;
  // The entry shape is entirely JSON-safe (strings, numbers, plain objects)
  // so JSON.stringify cannot throw. We pass the line to the sink best-effort.
  const entry = {
    level: "info",
    message: "chaos middleware injected fault",
    path: context.path,
    method: context.method,
    request_id: context.requestId,
    correlation_id: context.correlationId,
    fault: decision.fault,
    reason: decision.reason,
    service: "chaos-middleware",
    timestamp: new Date().toISOString(),
  };
  sink(JSON.stringify(entry));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Higher-order wrapper around a Next.js request handler.
 *
 * Behavior:
 *   1. Resolves config (env + overrides + validate).
 *   2. Builds a context from the request (path, method, correlation).
 *   3. Calls {@link decideChaos}. If a fault was chosen, applies it.
 *   4. If no fault, invokes `handler()` and returns its response unchanged.
 *
 * The wrapper never modifies `handler`'s output. The wrapper DOES construct
 * it's own NextResponse for latency (await) and error (synthesized
 * envelope) cases — those responses follow the project's standardized
 * error envelope and are decorated with `x-chaos-*` markers so
 * downstream telemetry can distinguish synthetic chaos responses from
 * real ones.
 *
 * @param request   The incoming NextRequest.
 * @param handler   The downstream route handler.
 * @param options   Optional overrides (see {@link ChaosMiddlewareOptions}).
 */
export async function withChaosMiddleware(
  request: { url?: string; method?: string; headers?: Headers | { get(name: string): string | null } },
  handler: () => Promise<Response>,
  options: ChaosMiddlewareOptions = {},
): Promise<Response> {
  // Resolve config — throws ChaosConfigError on invalid input.
  const config = resolveChaosConfig({
    overrides: options.forceEnable
      ? { ...(options.overrides ?? {}), enabled: true }
      : options.overrides,
  });

  const ctx: ChaosRequestContext = {
    path: extractPath(request),
    method: extractMethod(request),
    correlationId: safeHeader(request, "x-correlation-id"),
    requestId: safeHeader(request, "x-request-id"),
  };

  // Build the RNG deterministically: explicit override → seeded PRNG → Math.random.
  const rng =
    options.random ??
    (config.seed !== undefined ? mulberry32(config.seed) : Math.random);

  const decision = decideChaos(config, ctx, rng);
  logInjection(decision, ctx);

  if (!decision.shouldFault) {
    return handler();
  }

  switch (decision.fault!.type) {
    case "latency": {
      const { durationMs } = decision.fault;
      if (durationMs > 0) {
        await sleep(durationMs);
      }
      const downstreamResponse = await handler();
      return stampChaosMarker(downstreamResponse, "latency", String(durationMs));
    }

    case "error": {
      return buildErrorResponse(
        decision.fault.status,
        decision.fault.code,
        decision.fault.message,
        ctx.requestId,
      );
    }

    case "abort": {
      // Surface as a synthetic 503 + CHaosRequestAborted-named envelope so
      // callers can opt to interpret it as a real abort downstream.
      return buildErrorResponse(
        503,
        "CHAOS_REQUEST_ABORTED",
        decision.fault.reason,
        ctx.requestId,
        "abort",
      );
    }
  }
  // Exhaustiveness guard — TypeScript will flag this as dead code if a new
  // fault type is ever added without handling it above. Lets us drop the
  // explicit `default:` branch and keep the switch provably exhaustive.
  const _exhaustive: never = decision.fault;
  throw new Error(`Unhandled chaos fault: ${JSON.stringify(_exhaustive)}`);
}

// ─── Internals ───────────────────────────────────────────────────────────────

/**
 * Resilient URL extraction. `request.url` may be a string or `URL`-like —
 * `new URL(...)` works on both. Falls back to a query-stripped substring
 * when the URL is malformed (e.g. contains an invalid percent-sequence).
 *
 * Exported for unit testing.
 */
export function extractPath(request: { url?: string; method?: string }): string {
  const url = request.url ?? "";
  if (!url) return "";
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    // Malformed URL — strip the query string and return the remainder so
    // matchesPath can still make a best-effort path filter.
    return url.split("?")[0] ?? "";
  }
}

function extractMethod(request: { method?: string }): string {
  return (request.method ?? "GET").toUpperCase();
}

function safeHeader(
  request: { headers?: Headers | { get(name: string): string | null } },
  name: string,
): string | undefined {
  const headers = request.headers;
  if (!headers) return undefined;
  try {
    const v = headers.get(name);
    return v && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the standardized error response used by every other API route:
 *
 * ```json
 * { "error": { "code": "...", "message": "...", "request_id": "..." } }
 * ```
 *
 * Decorates the response with `x-chaos-fault` and (optionally) `x-chaos-latency-ms`
 * so observability tooling can distinguish synthetic responses from real ones.
 */
function buildErrorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string | undefined,
  faultMarker: string = "error",
): Response {
  const resolvedRequestId =
    requestId && requestId.length > 0
      ? requestId
      : `req_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`;

  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "x-chaos-fault": faultMarker,
  });
  if (requestId) {
    headers.set("x-request-id", requestId);
  }

  const body = JSON.stringify({
    error: {
      code,
      message,
      request_id: resolvedRequestId,
    },
  });

  return new Response(body, { status, headers });
}

/**
 * Stamp a downstream response with chaos markers — used for the latency
 * branch where we still want to forward the real handler's output.
 *
 * If the body has already been consumed upstream (`response.bodyUsed`),
 * returning a fresh Response from the original body throws "Response body
 * object should not be disturbed or locked". In that case we return the
 * response untouched — better to drop the marker than crash the request.
 */
function stampChaosMarker(response: Response, kind: string, value: string): Response {
  if (response.bodyUsed) return response;

  const headers = new Headers(response.headers);
  headers.set("x-chaos-fault", kind);
  headers.set(`x-chaos-${kind}-ms`, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
