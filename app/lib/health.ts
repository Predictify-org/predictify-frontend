import { validateConfig } from "@/app/lib/config";
import { getSigner } from "@/app/lib/kms/factory";
import { createResilientStellarClient } from "@/app/lib/stellarClient";

export type HealthStatus = "ok" | "degraded";

export type DependencyCheckResult = {
  status: HealthStatus;
  message?: string;
  checked_at: string;
  /** Wall-clock duration of the dependency probe in milliseconds. */
  latency_ms?: number;
};

export type LatencySloAlert = {
  ruleName: "P95_LATENCY_BURN_RATE";
  burnRate: number;
  threshold: number;
  windowMs: number;
  p95LatencyMs: number | null;
  sampleCount: number;
  detectedAt: string;
};

export type SloMetrics = {
  p95_latency_ms: number | null;
  burn_rate_30m: number | null;
  slo_threshold_ms: number;
  sample_count_30m: number;
  alerts: LatencySloAlert[];
};

export type ReadinessReport = {
  status: HealthStatus;
  checks: Record<string, DependencyCheckResult>;
  slo: SloMetrics;
};

export type HealthCheckDependencies = {
  now?: () => Date;
  validateConfig?: typeof validateConfig;
  getSigner?: typeof getSigner;
  createStellarClient?: typeof createResilientStellarClient;
};

/** Matches settlement p95 SLO in operations/alerts/streams.yaml (60s). */
export const P95_SLO_THRESHOLD_MS = 60_000;

/** Sample retention horizon (96 hours per issue spec). */
export const LATENCY_RETENTION_MS = 96 * 60 * 60 * 1000;

/** Short burn-rate evaluation window. */
export const BURN_RATE_WINDOW_MS = 30 * 60 * 1000;

/** Google SRE fast-burn multiplier for a 30-minute window. */
export const BURN_RATE_ALERT_THRESHOLD = 14;

/**
 * Allowed fraction of latency samples that may exceed the SLO threshold
 * before the error budget is exhausted (95% compliance target).
 */
export const LATENCY_ERROR_BUDGET = 0.05;

/** Fixed-capacity ring buffer — memory stays O(MAX_LATENCY_SAMPLES). */
export const MAX_LATENCY_SAMPLES = 4096;

type LatencySample = {
  timestampMs: number;
  latencyMs: number;
};

const latencySamples: LatencySample[] = [];
let latencyWriteIndex = 0;
let latencySampleCount = 0;

/**
 * Record a latency observation for rolling p95 and burn-rate evaluation.
 * Samples older than {@link LATENCY_RETENTION_MS} are ignored during reads.
 */
export function recordLatencySample(latencyMs: number, timestampMs?: number): void {
  const ts = timestampMs ?? Date.now();
  const sample: LatencySample = { timestampMs: ts, latencyMs };

  if (latencySampleCount < MAX_LATENCY_SAMPLES) {
    latencySamples.push(sample);
    latencySampleCount += 1;
  } else {
    latencySamples[latencyWriteIndex] = sample;
    latencyWriteIndex = (latencyWriteIndex + 1) % MAX_LATENCY_SAMPLES;
  }
}

/** Reset tracker state — intended for tests only. */
export function resetLatencyTracker(): void {
  latencySamples.length = 0;
  latencyWriteIndex = 0;
  latencySampleCount = 0;
}

function iterateSamplesInWindow(windowMs: number, nowMs: number): LatencySample[] {
  const retentionCutoff = nowMs - LATENCY_RETENTION_MS;
  const windowCutoff = nowMs - windowMs;
  const cutoff = Math.max(retentionCutoff, windowCutoff);
  const result: LatencySample[] = [];

  if (latencySampleCount < MAX_LATENCY_SAMPLES) {
    for (let i = 0; i < latencySampleCount; i += 1) {
      const sample = latencySamples[i];
      if (sample.timestampMs >= cutoff) {
        result.push(sample);
      }
    }
    return result;
  }

  for (let i = 0; i < MAX_LATENCY_SAMPLES; i += 1) {
    const index = (latencyWriteIndex + i) % MAX_LATENCY_SAMPLES;
    const sample = latencySamples[index];
    if (sample.timestampMs >= cutoff) {
      result.push(sample);
    }
  }

  return result;
}

/**
 * Compute rolling p95 latency over `windowMs`.
 * Returns null when no samples fall inside the window.
 */
export function computeP95(windowMs: number, nowMs?: number): number | null {
  const now = nowMs ?? Date.now();
  const latencies = iterateSamplesInWindow(windowMs, now).map((sample) => sample.latencyMs);
  if (latencies.length === 0) {
    return null;
  }

  latencies.sort((left, right) => left - right);
  const index = Math.ceil(0.95 * latencies.length) - 1;
  return latencies[Math.max(0, index)];
}

/**
 * Error-budget burn rate for the latency SLO over `windowMs`.
 *
 * burn_rate = (violation_rate / LATENCY_ERROR_BUDGET)
 *
 * A burn rate of 1 means the service is consuming budget exactly at the SLO
 * allowance; values above {@link BURN_RATE_ALERT_THRESHOLD} indicate fast burn.
 */
export function computeBurnRate(windowMs: number, nowMs?: number): number | null {
  const now = nowMs ?? Date.now();
  const windowSamples = iterateSamplesInWindow(windowMs, now);
  if (windowSamples.length === 0) {
    return null;
  }

  const violations = windowSamples.filter(
    (sample) => sample.latencyMs > P95_SLO_THRESHOLD_MS,
  ).length;
  const observedBadRate = violations / windowSamples.length;
  return observedBadRate / LATENCY_ERROR_BUDGET;
}

/**
 * Evaluate the 30-minute burn-rate alert and emit structured logs for
 * downstream alerting (PagerDuty/Slack scrapers, operations/alerts rules).
 */
export function evaluateLatencySloAlerts(nowMs?: number): LatencySloAlert[] {
  const now = nowMs ?? Date.now();
  const burnRate = computeBurnRate(BURN_RATE_WINDOW_MS, now);
  const p95LatencyMs = computeP95(BURN_RATE_WINDOW_MS, now);
  const sampleCount = iterateSamplesInWindow(BURN_RATE_WINDOW_MS, now).length;

  if (burnRate === null || burnRate <= BURN_RATE_ALERT_THRESHOLD) {
    return [];
  }

  const alert: LatencySloAlert = {
    ruleName: "P95_LATENCY_BURN_RATE",
    burnRate,
    threshold: BURN_RATE_ALERT_THRESHOLD,
    windowMs: BURN_RATE_WINDOW_MS,
    p95LatencyMs,
    sampleCount,
    detectedAt: new Date(now).toISOString(),
  };

  console.warn(
    JSON.stringify({
      event: "slo_latency_burn_rate_alert",
      ruleName: alert.ruleName,
      burnRate: alert.burnRate,
      threshold: alert.threshold,
      windowMs: alert.windowMs,
      p95LatencyMs: alert.p95LatencyMs,
      sampleCount: alert.sampleCount,
      detectedAt: alert.detectedAt,
    }),
  );

  return [alert];
}

function buildSloMetrics(nowMs: number): SloMetrics {
  const alerts = evaluateLatencySloAlerts(nowMs);
  return {
    p95_latency_ms: computeP95(BURN_RATE_WINDOW_MS, nowMs),
    burn_rate_30m: computeBurnRate(BURN_RATE_WINDOW_MS, nowMs),
    slo_threshold_ms: P95_SLO_THRESHOLD_MS,
    sample_count_30m: iterateSamplesInWindow(BURN_RATE_WINDOW_MS, nowMs).length,
    alerts,
  };
}

async function runCheck(
  now: () => Date,
  check: () => Promise<void> | void,
): Promise<DependencyCheckResult> {
  const startedAt = now().getTime();
  const checkedAt = now().toISOString();

  try {
    await check();
    const latencyMs = now().getTime() - startedAt;
    recordLatencySample(latencyMs, startedAt);
    return { status: "ok", checked_at: checkedAt, latency_ms: latencyMs };
  } catch (error) {
    const latencyMs = now().getTime() - startedAt;
    recordLatencySample(latencyMs, startedAt);
    return {
      status: "degraded",
      message: error instanceof Error ? error.message : "Dependency check failed.",
      checked_at: checkedAt,
      latency_ms: latencyMs,
    };
  }
}

export async function getReadinessReport(
  dependencies: HealthCheckDependencies = {},
): Promise<ReadinessReport> {
  const now = dependencies.now ?? (() => new Date());
  const validate = dependencies.validateConfig ?? validateConfig;
  const signerFactory = dependencies.getSigner ?? getSigner;
  const stellarClientFactory = dependencies.createStellarClient ?? createResilientStellarClient;

  const configCheck = await runCheck(now, () => {
    validate();
  });

  let horizonUrl = "";
  const stellarCheck = await runCheck(now, async () => {
    const config = validate();
    horizonUrl = config.network.horizonUrl;
    const client = stellarClientFactory({
      tenant: "readiness",
      network: config.network.name,
      timeoutMs: 2000,
      circuitBreaker: { failureThreshold: 1 },
    });
    await client.readAccount<unknown>({
      url: config.network.horizonUrl,
      address: config.network.name,
      critical: true,
    });
  });

  const kmsCheck = await runCheck(now, async () => {
    const signer = signerFactory();
    const publicKey = await signer.getPublicKey();
    if (!publicKey) {
      throw new Error("KMS signer did not return a public key.");
    }
  });

  const checks: ReadinessReport["checks"] = {
    config: configCheck,
    stellar: {
      ...stellarCheck,
      ...(horizonUrl && stellarCheck.status === "ok" ? { message: `reachable: ${horizonUrl}` } : {}),
    },
    kms: kmsCheck,
  };

  const slo = buildSloMetrics(now().getTime());
  const dependencyHealthy = Object.values(checks).every((check) => check.status === "ok");
  const sloHealthy = slo.alerts.length === 0;

  return {
    status: dependencyHealthy && sloHealthy ? "ok" : "degraded",
    checks,
    slo,
  };
}
