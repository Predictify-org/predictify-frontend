/**
 * Chaos / fault-injection helper.
 *
 * Provides opt-in, configurable latency and error injection for resilience
 * testing. It is **only** active in non-production environments and only when
 * explicitly enabled via environment variables, so it can never degrade a
 * production deployment.
 *
 * ## Configuration (environment variables)
 * - `CHAOS_ENABLED`        — `"true"` to enable. Ignored when `NODE_ENV`
 *                            is `production`.
 * - `CHAOS_LATENCY_MS`     — max injected delay in ms (0 disables latency).
 *                            Actual delay is uniformly random in `[0, value]`.
 * - `CHAOS_ERROR_RATE`     — probability in `[0, 1]` of injecting a 503 error.
 * - `CHAOS_ERROR_STATUS`   — HTTP status to return on error (default 503).
 *
 * Invalid or out-of-range values are clamped/ignored rather than throwing, so
 * a misconfiguration never breaks request handling.
 */

export interface ChaosConfig {
  /** Whether chaos injection is active for this process. */
  readonly enabled: boolean;
  /** Maximum injected latency in milliseconds (>= 0). */
  readonly latencyMs: number;
  /** Probability of injecting an error, in `[0, 1]`. */
  readonly errorRate: number;
  /** HTTP status code returned when an error is injected. */
  readonly errorStatus: number;
}

const DEFAULT_ERROR_STATUS = 503;

/** Parses a finite number from a string, returning `fallback` on failure. */
function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Clamps `value` into the inclusive range `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Reads chaos configuration from the environment.
 *
 * Chaos is force-disabled when `NODE_ENV === "production"` regardless of the
 * other variables.
 */
export function getChaosConfig(env: NodeJS.ProcessEnv = process.env): ChaosConfig {
  const isProduction = env.NODE_ENV === "production";
  const enabled = !isProduction && env.CHAOS_ENABLED === "true";

  const latencyMs = Math.max(0, parseNumber(env.CHAOS_LATENCY_MS, 0));
  const errorRate = clamp(parseNumber(env.CHAOS_ERROR_RATE, 0), 0, 1);
  const errorStatus = Math.trunc(
    clamp(parseNumber(env.CHAOS_ERROR_STATUS, DEFAULT_ERROR_STATUS), 400, 599)
  );

  return { enabled, latencyMs, errorRate, errorStatus };
}

export interface ChaosOutcome {
  /** Latency (ms) that was applied before returning. */
  readonly delayMs: number;
  /**
   * When set, the caller should short-circuit with this HTTP status instead of
   * processing the request normally.
   */
  readonly injectedStatus?: number;
}

/**
 * Applies chaos for a single request: optionally sleeps for a random delay and
 * optionally signals that an error should be injected.
 *
 * @param config - Resolved chaos configuration.
 * @param random - Source of randomness in `[0, 1)`. Injectable for tests.
 * @param sleep  - Async delay function. Injectable for tests.
 */
export async function applyChaos(
  config: ChaosConfig,
  random: () => number = Math.random,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
): Promise<ChaosOutcome> {
  if (!config.enabled) {
    return { delayMs: 0 };
  }

  let delayMs = 0;
  if (config.latencyMs > 0) {
    delayMs = Math.floor(random() * config.latencyMs);
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  if (config.errorRate > 0 && random() < config.errorRate) {
    return { delayMs, injectedStatus: config.errorStatus };
  }

  return { delayMs };
}
