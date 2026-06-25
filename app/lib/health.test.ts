/** @jest-environment node */

import {
  BURN_RATE_ALERT_THRESHOLD,
  BURN_RATE_WINDOW_MS,
  computeBurnRate,
  computeP95,
  evaluateLatencySloAlerts,
  getReadinessReport,
  LATENCY_ERROR_BUDGET,
  MAX_LATENCY_SAMPLES,
  P95_SLO_THRESHOLD_MS,
  recordLatencySample,
  resetLatencyTracker,
} from "./health";

const fixedNow = () => new Date("2026-05-27T00:00:00.000Z");
const fixedNowMs = fixedNow().getTime();

function createOkStellarClient() {
  return {
    readAccount: jest.fn().mockResolvedValue({ horizon: "ok" }),
    readBalances: jest.fn(),
    writeJson: jest.fn(),
    getCircuitMetrics: jest.fn(),
    getCircuitState: jest.fn().mockReturnValue("closed"),
  };
}

function createConfig() {
  return {
    network: {
      name: "testnet" as const,
      horizonUrl: "https://horizon-testnet.stellar.org",
      passphrase: "Test SDF Network ; September 2015",
      hasFriendbot: true,
      friendbotUrl: "https://friendbot.stellar.org",
      explorerUrl: "https://stellar.expert/testnet",
      assetLabel: "TESTNET",
      isProduction: false,
    },
    jwtSecret: "test-secret-at-least-32-characters-long",
    serviceName: "streampay-test",
    environment: "test",
    allowedOrigins: ["http://localhost:3000"],
    anomalyThresholds: {
      creationBurstLimit: 50,
      settleRateLimit: 20,
    },
  };
}

describe("latency SLO tracker", () => {
  beforeEach(() => {
    resetLatencyTracker();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("computes rolling p95 over the requested window", () => {
    for (let i = 1; i <= 100; i += 1) {
      recordLatencySample(i * 100, fixedNowMs - (100 - i) * 1000);
    }

    expect(computeP95(BURN_RATE_WINDOW_MS, fixedNowMs)).toBe(9500);
  });

  it("excludes samples outside the rolling window", () => {
    recordLatencySample(10_000, fixedNowMs - BURN_RATE_WINDOW_MS - 1);
    recordLatencySample(100, fixedNowMs - 1000);
    recordLatencySample(200, fixedNowMs - 500);

    expect(computeP95(BURN_RATE_WINDOW_MS, fixedNowMs)).toBe(200);
  });

  it("computes burn rate as violation rate divided by error budget", () => {
    for (let i = 0; i < 10; i += 1) {
      recordLatencySample(P95_SLO_THRESHOLD_MS + 1_000, fixedNowMs - i * 1000);
    }
    for (let i = 0; i < 90; i += 1) {
      recordLatencySample(100, fixedNowMs - (10 + i) * 1000);
    }

    const burnRate = computeBurnRate(BURN_RATE_WINDOW_MS, fixedNowMs);
    expect(burnRate).toBeCloseTo((0.1 / LATENCY_ERROR_BUDGET), 5);
  });

  it("fires a burn-rate alert when the 30m burn exceeds 14x", () => {
    for (let i = 0; i < 80; i += 1) {
      recordLatencySample(P95_SLO_THRESHOLD_MS + 500, fixedNowMs - i * 1000);
    }
    for (let i = 0; i < 20; i += 1) {
      recordLatencySample(100, fixedNowMs - (80 + i) * 1000);
    }

    const alerts = evaluateLatencySloAlerts(fixedNowMs);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      ruleName: "P95_LATENCY_BURN_RATE",
      threshold: BURN_RATE_ALERT_THRESHOLD,
      windowMs: BURN_RATE_WINDOW_MS,
      sampleCount: 100,
    });
    expect(alerts[0].burnRate).toBeGreaterThan(BURN_RATE_ALERT_THRESHOLD);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("slo_latency_burn_rate_alert"),
    );
  });

  it("does not alert when burn rate stays within budget", () => {
    for (let i = 0; i < 100; i += 1) {
      recordLatencySample(100, fixedNowMs - i * 1000);
    }

    expect(evaluateLatencySloAlerts(fixedNowMs)).toHaveLength(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("keeps constant memory by capping stored samples", () => {
    for (let i = 0; i < MAX_LATENCY_SAMPLES + 500; i += 1) {
      recordLatencySample(100, fixedNowMs - i);
    }

    expect(computeBurnRate(BURN_RATE_WINDOW_MS, fixedNowMs)).not.toBeNull();
  });
});

describe("readiness health checks", () => {
  beforeEach(() => {
    resetLatencyTracker();
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports ok when config, Stellar, and KMS checks pass", async () => {
    const stellarClient = createOkStellarClient();

    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(stellarClient),
    });

    expect(report.status).toBe("ok");
    expect(report.checks.config.status).toBe("ok");
    expect(report.checks.stellar.status).toBe("ok");
    expect(report.checks.kms.status).toBe("ok");
    expect(report.slo.p95_latency_ms).not.toBeNull();
    expect(report.slo.burn_rate_30m).not.toBeNull();
    expect(report.slo.alerts).toHaveLength(0);
    expect(stellarClient.readAccount).toHaveBeenCalledWith({
      url: "https://horizon-testnet.stellar.org",
      address: "testnet",
      critical: true,
    });
  });

  it("reports degraded when configuration validation fails", async () => {
    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn(() => {
        throw new Error("JWT_SECRET environment variable is required");
      }),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.config).toMatchObject({
      status: "degraded",
      message: "JWT_SECRET environment variable is required",
    });
    expect(report.checks.stellar.status).toBe("degraded");
  });

  it("reports degraded when Stellar is unreachable", async () => {
    const stellarClient = {
      ...createOkStellarClient(),
      readAccount: jest.fn().mockRejectedValue(new Error("Horizon timeout")),
    };

    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(stellarClient),
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.stellar).toMatchObject({
      status: "degraded",
      message: "Horizon timeout",
    });
  });

  it("reports degraded when the signer is unavailable", async () => {
    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({
        getPublicKey: jest.fn().mockRejectedValue(new Error("KMS unavailable")),
      }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.kms).toMatchObject({
      status: "degraded",
      message: "KMS unavailable",
    });
  });

  it("reports degraded when latency burn-rate SLO alerts fire", async () => {
    for (let i = 0; i < 80; i += 1) {
      recordLatencySample(P95_SLO_THRESHOLD_MS + 500, fixedNowMs - i * 1000);
    }
    for (let i = 0; i < 20; i += 1) {
      recordLatencySample(100, fixedNowMs - (80 + i) * 1000);
    }

    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
    });

    expect(report.status).toBe("degraded");
    expect(report.slo.alerts).toHaveLength(1);
    expect(report.slo.alerts[0].ruleName).toBe("P95_LATENCY_BURN_RATE");
  });
});
