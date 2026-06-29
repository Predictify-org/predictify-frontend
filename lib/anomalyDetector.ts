/**
 * Per-stream rate-change anomaly detector.
 *
 * ## Purpose
 * Real-world fraud and accidental misconfiguration often manifest as
 * a stream's release *velocity* (rate) jumping far above its recent baseline.
 * For example, a sender might accidentally multiply an amount by 100× when
 * editing a stream, or a malicious integrator could ramp the rate between
 * settlement ticks to drain escrow quickly.
 *
 * This module flags any stream whose newly observed rate exceeds
 * `thresholdMultiplier` times the median of its recent-rate samples within
 * a rolling window. The default configuration is **5×** over a **1 hour**
 * window, matching the issue spec.
 *
 * ## Algorithm
 * For each call to {@link RateAnomalyDetector.recordRate} we:
 *
 * 1. **Validate inputs** at the boundary (rejects empty streamId, negative
 *    rates, malformed timestamps with explicit error messages).
 * 2. **Prune** the stream's history to samples whose timestamp lies within
 *    `[now - windowMs, now)`. Samples at the same exact timestamp as the
 *    incoming observation are excluded so the new value cannot bias the
 *    baseline it is being measured against.
 * 3. **Compute the median** of the surviving samples. Median — rather than
 *    mean — is robust to outliers so a single rogue sample cannot
 *    permanently inflate the baseline.
 * 4. **Compare**: if the new rate strictly exceeds
 *    `thresholdMultiplier * median` (and the median is non-zero), emit an
 *    alert. Median === 0 is treated as "no baseline yet" and silently
 *    skipped rather than triggering an "infinite ratio" alert — callers
 *    should rely on absolute-rate alerts (`SETTLE_RATE_SPIKE` in
 *    `detector.ts`) for those cases.
 *
 * ## Side effects on alert
 * - Appends an audit-log entry via {@link auditLogStore} under the action
 *   `security.anomaly.rate_change_spike`. The entry is tamper-evident
 *   (hash-chained) so it can be replayed for offline review.
 * - Emits a structured warn-level log via the shared {@link logger}. The
 *   current correlation context (if any) is automatically attached so
 *   downstream PagerDuty / SIEM pipelines can correlate with the request
 *   that produced the rate.
 *
 * ## Threading & concurrency
 * Node.js is single-threaded; the per-stream Map is mutated only by
 * synchronous code inside `recordRate`, so a single event-loop turn is
 * sufficient to make the read-modify-write atomic. The Map keys are
 * bounded by the active stream count; stale keys can be removed with
 * {@link RateAnomalyDetector.clearStream}.
 *
 * ## Example
 * ```ts
 * import { RateAnomalyDetector } from "@/lib/anomalyDetector";
 *
 * // After every rate update (e.g. from the indexer):
 * const alert = RateAnomalyDetector.recordRate(
 *   "stream-abc",
 *   1_000_000n,        // 1M stroops / sec — velocity from the contract
 *   Date.now(),
 *   "tenant-xyz",
 * );
 * if (alert) {
 *   // Caller-side handler: trigger fraud review, notify on-call, etc.
 * }
 * ```
 */

// ──────── Dependencies ──────────────────────────────────────────────────────

import { auditLogStore } from "@/app/lib/audit-log";
import { logger } from "@/app/lib/logger";

// ──────── Public Types ───────────────────────────────────────────────────────

/**
 * A single historical rate observation for a stream.
 *
 * Rates are stroop-denominated per-second `bigint`s — they match the
 * velocity field of `OnChainStream` exactly so the detector can be fed
 * straight from the indexer.
 */
export interface RateSample {
  /** Release rate in base units per second (stroops / sec). */
  rate: bigint;
  /** Unix epoch milliseconds at which the rate was observed. */
  timestamp: number;
}

/**
 * Alert produced when a stream's rate exceeds the configured multiple
 * of its rolling-window median.
 */
export interface RateAnomalyAlert {
  /** ISO-8601 timestamp the alert was generated. */
  detectedAt: string;
  /** Median rate across the rolling window at evaluation time. */
  medianValue: bigint;
  /** Newly observed rate that triggered the alert. */
  observedValue: bigint;
  /** `observedValue / medianValue` cast to a JS number for telemetry. */
  ratio: number;
  /** Severity bucket: `high` for ≥10× spikes, `medium` otherwise. */
  severity: "high" | "medium";
  /** Stream the anomaly applies to. */
  streamId: string;
  /** TenantId of the owning organisation (audit metadata only). */
  tenantId: string;
  /** Threshold multiplier that was crossed (e.g. `5` for 5×). */
  thresholdMultiplier: number;
  /**
   * Unix epoch ms the alert was generated. Identical to `Date.parse(detectedAt)`.
   * Kept on the alert for downstream consumers that want a machine-readable time.
   */
  timestamp: number;
  /** Effective rolling window in milliseconds. */
  windowMs: number;
}

/** Tunable detector configuration. */
export interface RateAnomalyConfig {
  /** Multiplier above the median that triggers an alert. Default `5`. */
  thresholdMultiplier: number;
  /** Rolling window size in milliseconds. Default `3_600_000` (1 hour). */
  windowMs: number;
}

// ──────── Constants ──────────────────────────────────────────────────────────

/** Default multiplier — flagged when new rate exceeds 5× the median. */
const DEFAULT_THRESHOLD_MULTIPLIER = 5;

/** Default window — one hour, matching the issue spec. */
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;

/** Action written to the audit log on every emitted alert. */
const AUDIT_ACTION = "security.anomaly.rate_change_spike";

/** Stable error-code prefix to make validation failures greppable. */
const INPUT_ERROR_PREFIX = "INVALID_RATE_ANOMALY_INPUT";

/** Exported for downstream consumers that want to surface the defaults. */
export const RATE_ANOMALY_DEFAULTS = {
  THRESHOLD_MULTIPLIER: DEFAULT_THRESHOLD_MULTIPLIER,
  WINDOW_MS: DEFAULT_WINDOW_MS,
} as const;

// ──────── Internal State ─────────────────────────────────────────────────────

/** Mutable config — overridable via {@link RateAnomalyDetector.setConfig}. */
let activeConfig: RateAnomalyConfig = {
  thresholdMultiplier: DEFAULT_THRESHOLD_MULTIPLIER,
  windowMs: DEFAULT_WINDOW_MS,
};

/**
 * Per-stream ring-buffer of recent rate samples.
 *
 * Entries older than `activeConfig.windowMs` are pruned on every
 * `recordRate` call, so the array stays bounded by the observation cadence
 * of the stream itself. Keys are removed via `clearStream` so dead streams
 * do not leak memory.
 */
const rateHistory = new Map<string, RateSample[]>();

// ──────── Validation Helpers ─────────────────────────────────────────────────

function invalid(message: string): never {
  // Stripped at the boundary — never include caller-controlled input.
  throw new Error(`${INPUT_ERROR_PREFIX}: ${message}`);
}

function validateRecordArgs(args: {
  streamId: string;
  rate: bigint;
  timestamp: number;
}): void {
  if (typeof args.streamId !== "string" || args.streamId.length === 0) {
    invalid("streamId must be a non-empty string");
  }
  if (typeof args.rate !== "bigint") {
    invalid("rate must be a bigint (stroops per second)");
  }
  if (args.rate < 0n) {
    invalid("rate cannot be negative");
  }
  if (
    typeof args.timestamp !== "number" ||
    !Number.isFinite(args.timestamp) ||
    args.timestamp < 0
  ) {
    invalid("timestamp must be a finite, non-negative epoch millisecond value");
  }
}

function validateConfigField(
  field: keyof RateAnomalyConfig,
  value: unknown,
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    invalid(`${field} must be a positive finite number`);
  }
}

// ──────── Public Helpers ─────────────────────────────────────────────────────

/**
 * Compute the median of a list of `bigint` rate values.
 *
 * For an odd-length list the single middle value is returned. For an
 * even-length list the arithmetic mean of the two middle values is
 * returned — this matches the statistical convention and is well-defined
 * for `bigint` (truncates on odd sums, which is acceptable here because
 * the median is only used as a baseline for a multiplicative comparison).
 *
 * Exported for testability and so consumers can reuse the helper for
 * ad-hoc analyses outside the detector.
 *
 * @throws Throws `INVALID_RATE_ANOMALY_INPUT` if the input is empty.
 */
export function computeMedian(values: readonly bigint[]): bigint {
  if (values.length === 0) {
    invalid("cannot compute median of empty array");
  }
  // Copy + sort to avoid mutating caller's array and to give a stable
  // ordering for the two middle values.
  const sorted = [...values].sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  return (lower + upper) / 2n;
}

// ──────── Internal: Alert Construction & Emission ────────────────────────────

function buildAlert(args: {
  medianValue: bigint;
  observedValue: bigint;
  streamId: string;
  tenantId: string;
  thresholdMultiplier: number;
  timestamp: number;
  windowMs: number;
}): RateAnomalyAlert {
  // Casting `bigint`→`Number` is safe for rates within JS Number's safe
  // integer range (≈9e15 stroops ≈ 9e8 XLM at 7 decimals). The ratio is
  // used only for telemetry / severity bucketing — never for accounting.
  const ratio = Number(args.observedValue) / Number(args.medianValue);
  // ≥10× jumps are flagged "high" so they route to on-call immediately
  // rather than the standard anomaly channel.
  const severity: RateAnomalyAlert["severity"] = ratio >= 10 ? "high" : "medium";
  return {
    detectedAt: new Date(args.timestamp).toISOString(),
    medianValue: args.medianValue,
    observedValue: args.observedValue,
    ratio,
    severity,
    streamId: args.streamId,
    tenantId: args.tenantId,
    thresholdMultiplier: args.thresholdMultiplier,
    timestamp: args.timestamp,
    windowMs: args.windowMs,
  };
}

function emitAlert(alert: RateAnomalyAlert): void {
  // Persist to the audit log so the event is tamper-evident and can be
  // replayed for offline review by the security team. BigInts are
  // serialised as decimal strings to satisfy the audit-log JSON shape.
  auditLogStore.append({
    action: AUDIT_ACTION,
    actor: { id: "system:detector", role: "system" },
    metadata: {
      ratio: alert.ratio,
      severity: alert.severity,
      thresholdMultiplier: alert.thresholdMultiplier,
      medianValue: alert.medianValue.toString(),
      observedValue: alert.observedValue.toString(),
      tenantId: alert.tenantId,
      windowMs: alert.windowMs,
    },
    requestId: `detector-${alert.streamId}-${alert.timestamp}`,
    target: {
      id: alert.streamId,
      type: "stream",
    },
  });

  // Structured log so SIEM / PagerDuty can pipe it. The shared `logger`
  // automatically attaches the active correlation_id when invoked inside
  // a `withCorrelationContext` block, so we don't need to plumb it here.
  //
  // SECURITY NOTE: We deliberately pass only JSON-safe fields. bigints
  // must be serialised to strings because `JSON.stringify` throws on raw
  // bigint values, which would crash the calling code on every alert.
  logger.warn("rate_anomaly_detected", {
    event: AUDIT_ACTION,
    medianValue: alert.medianValue.toString(),
    observedValue: alert.observedValue.toString(),
    ratio: alert.ratio,
    severity: alert.severity,
    streamId: alert.streamId,
    tenantId: alert.tenantId,
    thresholdMultiplier: alert.thresholdMultiplier,
    windowMs: alert.windowMs,
  });
}

// ──────── Public Detector API ────────────────────────────────────────────────

/**
 * Shared singleton mirroring the pattern of `AnomalyDetector` in
 * `detector.ts`. Module-level state is intentional so that all callers
 * across the process see the same rolling-window baseline per stream.
 *
 * Use {@link RateAnomalyDetector.clear} from test setup to reset.
 */
export const RateAnomalyDetector = {
  /**
   * Record a new rate observation for a stream and return an alert
   * if it exceeds the configured multiple of the rolling median.
   *
   * Side effects:
   * - Always appends to the per-stream history (after evaluation).
   * - On alert: writes a tamper-evident entry to `auditLogStore` and
   *   emits a structured warn log via the shared `logger`.
   *
   * @param streamId  - Non-empty stream identifier.
   * @param rate      - Rate in stroops/sec (must be ≥ 0 `bigint`).
   * @param timestamp - Epoch ms at which the rate was observed.
   *                    Defaults to `Date.now()` for indexer convenience.
   * @param tenantId  - Tenant id for audit metadata. Defaults to
   *                    `"unknown"` to make missing provenance obvious.
   * @returns Alert object on threshold breach, otherwise `null`.
   * @throws  `INVALID_RATE_ANOMALY_INPUT:*` if any arg is malformed.
   */
  recordRate(
    streamId: string,
    rate: bigint,
    timestamp: number = Date.now(),
    tenantId: string = "unknown",
  ): RateAnomalyAlert | null {
    validateRecordArgs({ rate, streamId, timestamp });

    const windowStart = timestamp - activeConfig.windowMs;
    const existing = rateHistory.get(streamId) ?? [];

    // Prune: keep only samples strictly inside the rolling window AND
    // strictly older than the new observation. Excluding the exact
    // timestamp prevents two-call races where the same observation
    // would be counted both as a baseline and as the new value.
    const inWindow = existing.filter(
      (sample) => sample.timestamp >= windowStart && sample.timestamp < timestamp,
    );

    let alert: RateAnomalyAlert | null = null;

    if (inWindow.length > 0) {
      const median = computeMedian(inWindow.map((s) => s.rate));
      // Skip zero-median: it does not constitute a meaningful baseline
      // for a multiplicative ratio; rely on absolute-rate alerts for
      // those edge cases.
      if (median > 0n) {
        const ceiling = BigInt(activeConfig.thresholdMultiplier) * median;
        if (rate > ceiling) {
          alert = buildAlert({
            medianValue: median,
            observedValue: rate,
            streamId,
            tenantId,
            thresholdMultiplier: activeConfig.thresholdMultiplier,
            timestamp,
            windowMs: activeConfig.windowMs,
          });
          emitAlert(alert);
        }
      }
    }

    // Always record the new sample so the rolling baseline reflects the
    // most recent observation — even after an alert fires, so subsequent
    // evaluations see the new (possibly elevated) rate as part of the
    // window and do not re-fire on every single tick.
    inWindow.push({ rate, timestamp });
    rateHistory.set(streamId, inWindow);

    return alert;
  },

  /**
   * Override the threshold multiplier and/or window size. Both fields
   * must be positive finite numbers; partial updates are merged with the
   * previous config.
   *
   * Throws `INVALID_RATE_ANOMALY_INPUT:*` on invalid values so a
   * misconfigured deployment fails fast instead of silently widening
   * the alert envelope.
   */
  setConfig(partial: Partial<RateAnomalyConfig>): void {
    if (partial.thresholdMultiplier !== undefined) {
      validateConfigField("thresholdMultiplier", partial.thresholdMultiplier);
    }
    if (partial.windowMs !== undefined) {
      validateConfigField("windowMs", partial.windowMs);
    }
    activeConfig = { ...activeConfig, ...partial };
  },

  /** Return a defensive copy of the active config. */
  getConfig(): RateAnomalyConfig {
    return { ...activeConfig };
  },

  /**
   * Return a snapshot of the retained history for `streamId` (read-only).
   * Empty array if the stream has never been recorded.
   */
  getHistory(streamId: string): readonly RateSample[] {
    const samples = rateHistory.get(streamId);
    if (!samples) return [];
    // Return defensive copies so callers cannot mutate internal state.
    return samples.map((s) => ({ rate: s.rate, timestamp: s.timestamp }));
  },

  /** Remove the retained history for a single stream. */
  clearStream(streamId: string): void {
    rateHistory.delete(streamId);
  },

  /**
   * Reset all detector state — history and config — back to defaults.
   * Intended for test setup/teardown only.
   */
  clear(): void {
    rateHistory.clear();
    activeConfig = {
      thresholdMultiplier: DEFAULT_THRESHOLD_MULTIPLIER,
      windowMs: DEFAULT_WINDOW_MS,
    };
  },
};
