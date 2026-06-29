/**
 * Tests for `lib/anomalyDetector.ts`.
 *
 * Coverage targets the satisfaction of issue #568 acceptance criteria:
 * the detector must correctly identify >5× median rate jumps within a
 * 1-hour rolling window, validate all inputs, persist alerts to the
 * audit log, and emit structured logs with correlation context.
 *
 * Tests deliberately reset `RateAnomalyDetector` and `auditLogStore`
 * between cases so module-level state cannot leak between specs.
 *
 * NOTE: `auditLogStore.reset()` re-seeds the store with a single default
 * `stream.stop.bootstrap` entry, so audit-log assertions in this file
 * always filter on `action === "security.anomaly.rate_change_spike"`
 * rather than asserting on the total count.
 */

import {
  RateAnomalyDetector,
  computeMedian,
  RATE_ANOMALY_DEFAULTS,
  type RateAnomalyAlert,
} from "./anomalyDetector";
import { auditLogStore } from "@/app/lib/audit-log";
import { withCorrelationContext } from "@/app/lib/logger";

const ALERT_ACTION = "security.anomaly.rate_change_spike";
const TENANT_A = "tenant-a";

/**
 * Seed a sample at an explicit timestamp by temporarily widening the
 * window so the seed survives the default 1-hour pruning, then restoring
 * the config. Used by window-timestamp tests that need a deterministic
 * sample at a known timestamp.
 */
function seedSample(streamId: string, rate: bigint, timestamp: number) {
  RateAnomalyDetector.setConfig({ windowMs: 10_000_000 });
  RateAnomalyDetector.recordRate(streamId, rate, timestamp, TENANT_A);
  RateAnomalyDetector.setConfig({ windowMs: RATE_ANOMALY_DEFAULTS.WINDOW_MS });
}

/** Silence logger output during tests but capture it for assertions. */
function captureLog() {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  return {
    calls: spy.mock.calls,
    restore: () => spy.mockRestore(),
  };
}

beforeEach(() => {
  RateAnomalyDetector.clear();
  auditLogStore.reset();
});

// ──────── computeMedian ──────────────────────────────────────────────────────

describe("computeMedian", () => {
  it("returns the middle element for odd-length input", () => {
    expect(computeMedian([1n, 2n, 3n])).toBe(2n);
    expect(computeMedian([10n, 30n, 20n])).toBe(20n);
  });

  it("returns the arithmetic mean of the two middle values for even-length input", () => {
    expect(computeMedian([1n, 2n, 3n, 4n])).toBe((2n + 3n) / 2n);
    expect(computeMedian([10n, 20n, 30n, 40n])).toBe(25n);
  });

  it("does not mutate the input array", () => {
    const input = [5n, 1n, 3n, 2n, 4n];
    const snapshot = [...input];
    computeMedian(input);
    expect(input).toEqual(snapshot);
  });

  it("throws on an empty array", () => {
    expect(() => computeMedian([])).toThrow(/INVALID_RATE_ANOMALY_INPUT/);
  });

  it("handles a single-element array", () => {
    expect(computeMedian([42n])).toBe(42n);
  });
});

// ──────── Detector: Threshold Behaviour ──────────────────────────────────────

describe("RateAnomalyDetector.recordRate — threshold behaviour", () => {
  it("returns null on the very first observation (no baseline yet)", () => {
    const out = RateAnomalyDetector.recordRate(
      "stream-a",
      100n,
      1_000_000,
      TENANT_A,
    );
    expect(out).toBeNull();
  });

  it("does not alert on a stable rate (<5× the prior median)", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);
    // 4× median → below the default 5× threshold.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      400n,
      2_000_000,
      TENANT_A,
    );
    expect(alert).toBeNull();
  });

  it("alerts the moment the new rate crosses the 5× threshold", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 2_000_000, TENANT_A);

    // 501 > 5 * 100 = 500 → alert.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      501n,
      2_500_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.thresholdMultiplier).toBe(5);
    expect(alert?.medianValue).toBe(100n);
    expect(alert?.observedValue).toBe(501n);
    expect(alert?.streamId).toBe("stream-a");
    expect(alert?.tenantId).toBe(TENANT_A);
    expect(alert?.windowMs).toBe(RATE_ANOMALY_DEFAULTS.WINDOW_MS);
    expect(typeof alert?.timestamp).toBe("number");
  });

  it("does not alert at exactly the 5× boundary", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);

    // 500 > 5 * 100 = 500 → strict equality → no alert.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      500n,
      2_000_000,
      TENANT_A,
    );
    expect(alert).toBeNull();
  });

  it("flags a 10× jump as high severity (boundary)", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);

    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      1000n,
      2_000_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("high");
    expect(alert?.ratio).toBe(10);
  });

  it("flags a >10× jump as high severity", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);

    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      1500n,
      2_000_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("high");
    expect(alert?.ratio).toBeGreaterThan(10);
  });

  it("flags a 6× jump as medium severity", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);

    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      600n,
      2_000_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("medium");
    expect(alert?.ratio).toBeCloseTo(6, 5);
  });

  it("flags an in-between (5×<ratio<10×) jump as medium", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500_000, TENANT_A);

    // 9× median → strictly above the 5× alert threshold but below the
    // 10× high-severity bucket.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      900n,
      2_000_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.severity).toBe("medium");
  });
});

// ──────── Detector: Window Pruning ───────────────────────────────────────────

describe("RateAnomalyDetector.recordRate — rolling window", () => {
  it("prunes samples older than windowMs so they cannot anchor the median", () => {
    // Two early samples (t=0, t=100) and one recent (t=900); cutoff at
    // t=1000 with windowMs=200 is 800, so only the t=900 sample survives.
    RateAnomalyDetector.setConfig({ windowMs: 200 });
    RateAnomalyDetector.recordRate("stream-a", 1n, 0);
    RateAnomalyDetector.recordRate("stream-a", 1n, 100);
    RateAnomalyDetector.recordRate("stream-a", 100n, 900);
    // This call also drops the t=900 sample from the in-window filter
    // (timestamp equality excluded) and appends the new 200n @ t=1000.
    RateAnomalyDetector.recordRate("stream-a", 200n, 1_000, TENANT_A);

    // getHistory is the deterministic view into the post-prune buffer;
    // only the most recent sample is retained.
    expect(RateAnomalyDetector.getHistory("stream-a")).toHaveLength(1);
    expect(RateAnomalyDetector.getHistory("stream-a")[0]).toEqual({
      rate: 200n,
      timestamp: 1_000,
    });
  });

  it("retains samples whose age equals windowMs (inclusive boundary)", () => {
    // Cutoff is `now - windowMs`; samples at exactly that timestamp
    // are kept because the filter is `timestamp >= windowStart`.
    RateAnomalyDetector.setConfig({ windowMs: 100 });
    RateAnomalyDetector.recordRate("stream-a", 100n, 500);
    RateAnomalyDetector.recordRate("stream-a", 200n, 600, TENANT_A);

    // t=600 with windowMs=100 → cutoff = 500. The earlier sample at
    // t=500 is at the boundary and must be retained.
    const hist = RateAnomalyDetector.getHistory("stream-a");
    expect(hist.map((s) => s.timestamp).sort((a, b) => a - b)).toEqual([
      500, 600,
    ]);
  });

  it("does not include the new sample in the median computation", () => {
    // If the new sample biased the median, the alert logic would be
    // self-defeating: with only the new sample, no baseline exists yet.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      1_000_000n,
      1_000,
      TENANT_A,
    );
    expect(alert).toBeNull();
  });

  it("does not include samples at the exact same timestamp as the new sample", () => {
    // Seed a sample at the exact timestamp the new recordRate will use.
    seedSample("stream-a", 100n, 5_000);
    // The seeded sample is dropped from the in-window filter (timestamp
    // equality excluded) so no baseline exists for the new observation.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      10_000n,
      5_000,
      TENANT_A,
    );
    expect(alert).toBeNull();
  });

  it("treats a zero-median baseline as 'no baseline' and skips division", () => {
    RateAnomalyDetector.recordRate("stream-a", 0n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 0n, 1_500, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 0n, 2_000, TENANT_A);

    // A huge new rate relative to a zero median would be an infinite
    // ratio — explicitly suppressed by the docstring contract.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      1_000_000n,
      2_500,
      TENANT_A,
    );
    expect(alert).toBeNull();
  });
});

// ──────── Detector: Stream Isolation ─────────────────────────────────────────

describe("RateAnomalyDetector — per-stream isolation", () => {
  it("treats each stream independently", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);

    // Stream-b starts fresh.
    const freshB = RateAnomalyDetector.recordRate(
      "stream-b",
      10_000n,
      2_000,
      "tenant-b",
    );
    expect(freshB).toBeNull();

    // Bumping stream-a still computes its own median correctly.
    const spikeA = RateAnomalyDetector.recordRate(
      "stream-a",
      800n,
      2_500,
      TENANT_A,
    );
    expect(spikeA).not.toBeNull();
    expect(spikeA?.medianValue).toBe(100n);

    // Stream-b is unaffected.
    const stableB = RateAnomalyDetector.recordRate(
      "stream-b",
      10_000n,
      2_500,
      "tenant-b",
    );
    expect(stableB).toBeNull();
  });

  it("clearStream removes only the targeted stream", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-b", 100n, 1_000, "tenant-b");

    RateAnomalyDetector.clearStream("stream-a");
    expect(RateAnomalyDetector.getHistory("stream-a")).toHaveLength(0);
    expect(RateAnomalyDetector.getHistory("stream-b")).toHaveLength(1);
  });
});

// ──────── Detector: Input Validation ─────────────────────────────────────────

describe("RateAnomalyDetector — input validation", () => {
  it("rejects an empty streamId", () => {
    expect(() =>
      RateAnomalyDetector.recordRate("", 100n, 1_000, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT.*streamId/);
  });

  it("rejects a non-string streamId", () => {
    expect(() =>
      // @ts-expect-error: deliberately invalid type for the test
      RateAnomalyDetector.recordRate(undefined, 100n, 1_000, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT/);
  });

  it("rejects a negative rate", () => {
    expect(() =>
      RateAnomalyDetector.recordRate("stream-a", -1n, 1_000, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT.*rate cannot be negative/);
  });

  it("rejects a non-bigint rate", () => {
    expect(() =>
      // @ts-expect-error: deliberately invalid type for the test
      RateAnomalyDetector.recordRate("stream-a", 100, 1_000, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT.*rate must be a bigint/);
  });

  it("rejects NaN timestamps", () => {
    expect(() =>
      RateAnomalyDetector.recordRate("stream-a", 100n, NaN, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT.*timestamp/);
  });

  it("rejects Infinity timestamps", () => {
    expect(() =>
      RateAnomalyDetector.recordRate("stream-a", 100n, Infinity, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT.*timestamp/);
  });

  it("rejects negative timestamps", () => {
    expect(() =>
      RateAnomalyDetector.recordRate("stream-a", 100n, -1, TENANT_A),
    ).toThrow(/INVALID_RATE_ANOMALY_INPUT.*timestamp/);
  });

  it("accepts a zero rate (valid but won't anchor a median)", () => {
    expect(() =>
      RateAnomalyDetector.recordRate("stream-a", 0n, 1_000, TENANT_A),
    ).not.toThrow();
  });
});

// ──────── Detector: Configuration API ────────────────────────────────────────

describe("RateAnomalyDetector — configuration", () => {
  it("returns the defaults via getConfig before any override", () => {
    expect(RateAnomalyDetector.getConfig()).toEqual({
      thresholdMultiplier: RATE_ANOMALY_DEFAULTS.THRESHOLD_MULTIPLIER,
      windowMs: RATE_ANOMALY_DEFAULTS.WINDOW_MS,
    });
  });

  it("merges partial overrides into the active config", () => {
    RateAnomalyDetector.setConfig({ thresholdMultiplier: 10 });
    expect(RateAnomalyDetector.getConfig().thresholdMultiplier).toBe(10);
    expect(RateAnomalyDetector.getConfig().windowMs).toBe(
      RATE_ANOMALY_DEFAULTS.WINDOW_MS,
    );

    RateAnomalyDetector.setConfig({ windowMs: 120_000 });
    const cfg = RateAnomalyDetector.getConfig();
    expect(cfg.thresholdMultiplier).toBe(10);
    expect(cfg.windowMs).toBe(120_000);
  });

  it("returns a defensive copy of the config", () => {
    const cfg = RateAnomalyDetector.getConfig();
    cfg.thresholdMultiplier = 999;
    expect(RateAnomalyDetector.getConfig().thresholdMultiplier).toBe(
      RATE_ANOMALY_DEFAULTS.THRESHOLD_MULTIPLIER,
    );
  });

  it("rejects a non-positive threshold multiplier", () => {
    expect(() =>
      RateAnomalyDetector.setConfig({ thresholdMultiplier: 0 }),
    ).toThrow(/positive finite number/);
    expect(() =>
      RateAnomalyDetector.setConfig({ thresholdMultiplier: -1 }),
    ).toThrow(/positive finite number/);
  });

  it("rejects a non-positive windowMs", () => {
    expect(() => RateAnomalyDetector.setConfig({ windowMs: 0 })).toThrow(
      /positive finite number/,
    );
  });

  it("applies the new threshold multiplier on the next call", () => {
    RateAnomalyDetector.setConfig({ thresholdMultiplier: 3 });

    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);

    // 3.01× median: must alert under the new threshold.
    const alert = RateAnomalyDetector.recordRate(
      "stream-a",
      301n,
      2_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.thresholdMultiplier).toBe(3);
  });

  it("clear() resets config and history", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.setConfig({ thresholdMultiplier: 99 });
    RateAnomalyDetector.clear();

    expect(RateAnomalyDetector.getHistory("stream-a")).toHaveLength(0);
    expect(RateAnomalyDetector.getConfig()).toEqual({
      thresholdMultiplier: RATE_ANOMALY_DEFAULTS.THRESHOLD_MULTIPLIER,
      windowMs: RATE_ANOMALY_DEFAULTS.WINDOW_MS,
    });
  });
});

// ──────── Detector: Side Effects on Alert ────────────────────────────────────

describe("RateAnomalyDetector — side effects on alert", () => {
  it("persists an audit-log entry when an alert fires", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 800n, 2_000, TENANT_A);

    // Filter by action because the audit log keeps a default seed entry.
    const alerts = auditLogStore.list({ action: ALERT_ACTION });
    expect(alerts).toHaveLength(1);

    const entry = alerts[0];
    expect(entry.action).toBe(ALERT_ACTION);
    expect(entry.actor).toEqual({ id: "system:detector", role: "system" });
    expect(entry.target).toEqual({
      id: "stream-a",
      type: "stream",
    });
    expect(entry.metadata?.tenantId).toBe(TENANT_A);
    expect(entry.metadata?.observedValue).toBe("800");
    expect(entry.metadata?.medianValue).toBe("100");
    expect(entry.metadata?.thresholdMultiplier).toBe(5);
    expect(typeof entry.metadata?.ratio).toBe("number");
  });

  it("does NOT write an audit-log entry when no alert fires", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 200n, 2_000, TENANT_A);

    expect(auditLogStore.list({ action: ALERT_ACTION })).toHaveLength(0);
  });

  it("emits a structured warn-level log line when an alert fires", () => {
    const capture = captureLog();

    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 800n, 2_000, TENANT_A);

    const warnLines = capture.calls
      .map((args) => {
        try {
          return JSON.parse(String(args[0])) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((line): line is Record<string, unknown> => line !== null)
      .filter((line) => line.message === "rate_anomaly_detected");

    expect(warnLines).toHaveLength(1);
    const line = warnLines[0];
    expect(line.level).toBe("warn");
    expect(line.event).toBe(ALERT_ACTION);
    expect(line.streamId).toBe("stream-a");
    expect(line.tenantId).toBe(TENANT_A);
    expect(line.thresholdMultiplier).toBe(5);

    capture.restore();
  });

  it("does NOT emit a log line when no alert fires", () => {
    const capture = captureLog();

    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 200n, 2_000, TENANT_A);

    const anyAnomalyLine = capture.calls
      .map((args) => String(args[0]))
      .some((raw) => raw.includes("rate_anomaly_detected"));
    expect(anyAnomalyLine).toBe(false);

    capture.restore();
  });

  it("the returned alert object has all required fields populated", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);
    const alert: RateAnomalyAlert | null = RateAnomalyDetector.recordRate(
      "stream-a",
      999n,
      2_000,
      TENANT_A,
    );
    expect(alert).not.toBeNull();
    expect(alert?.detectedAt).toEqual(new Date(2_000).toISOString());
    expect(alert?.timestamp).toBe(2_000);
    expect(typeof alert?.ratio).toBe("number");
    expect(typeof alert?.observedValue).toBe("bigint");
    expect(typeof alert?.medianValue).toBe("bigint");
  });
});

// ──────── Detector: getHistory ──────────────────────────────────────────────

describe("RateAnomalyDetector.getHistory", () => {
  it("returns an empty array for an unknown stream", () => {
    expect(RateAnomalyDetector.getHistory("never-seen")).toEqual([]);
  });

  it("returns a defensive copy of the retained samples", () => {
    RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
    const snapshot = RateAnomalyDetector.getHistory("stream-a");
    expect(snapshot).toEqual([{ rate: 100n, timestamp: 1_000 }]);

    // Mutating the snapshot must not affect the detector's internal buffer.
    (snapshot[0] as { rate: bigint }).rate = 999n;
    expect(RateAnomalyDetector.getHistory("stream-a")[0].rate).toBe(100n);
  });
});

// ──────── Detector: Correlation Logging ──────────────────────────────────────

describe("RateAnomalyDetector — correlation id propagation", () => {
  it("attaches the active correlation_id to warn-level alert logs", async () => {
    const capture = captureLog();

    await withCorrelationContext(
      {
        correlation_id: "corr-rate-anomaly",
        request_id: "req-rate-anomaly",
      },
      async () => {
        RateAnomalyDetector.recordRate("stream-a", 100n, 1_000, TENANT_A);
        RateAnomalyDetector.recordRate("stream-a", 100n, 1_500, TENANT_A);
        RateAnomalyDetector.recordRate("stream-a", 800n, 2_000, TENANT_A);
      },
    );

    const warnLine = capture.calls
      .map((args) => {
        try {
          return JSON.parse(String(args[0])) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((line): line is Record<string, unknown> => line !== null)
      .find((line) => line.message === "rate_anomaly_detected");

    expect(warnLine).toBeDefined();
    expect(warnLine?.correlation_id).toBe("corr-rate-anomaly");
    expect(warnLine?.request_id).toBe("req-rate-anomaly");

    capture.restore();
  });
});
