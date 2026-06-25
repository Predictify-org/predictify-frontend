/** @jest-environment node */

import { getReadinessReport } from "./health";

const fixedNow = () => new Date("2026-05-27T00:00:00.000Z");

function createOkStellarClient() {
  return {
    readAccount: jest.fn().mockResolvedValue({ horizon: "ok" }),
    readBalances: jest.fn(),
    writeJson: jest.fn(),
    getCircuitMetrics: jest.fn(),
    getCircuitState: jest.fn().mockReturnValue("closed"),
  };
}

function createConfig(sorobanRpcUrl = "https://soroban-testnet.stellar.org") {
  return {
    network: {
      name: "testnet" as const,
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl,
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

/** A fetch mock that returns a 200 JSON-RPC health response */
function okFetch(): typeof fetch {
  return jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }) as unknown as typeof fetch;
}

/** A fetch mock that simulates an AbortError (1s timeout) */
function timeoutFetch(): typeof fetch {
  return jest.fn().mockRejectedValue(Object.assign(new Error("The operation was aborted"), { name: "AbortError" })) as unknown as typeof fetch;
}

describe("readiness health checks", () => {
  it("reports ok when config, Stellar, KMS, and Soroban checks pass", async () => {
    const stellarClient = createOkStellarClient();

    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(stellarClient),
      fetch: okFetch(),
    });

    expect(report.status).toBe("ok");
    expect(report.checks.config.status).toBe("ok");
    expect(report.checks.stellar.status).toBe("ok");
    expect(report.checks.kms.status).toBe("ok");
    expect(report.checks.soroban.status).toBe("ok");
    expect(stellarClient.readAccount).toHaveBeenCalledWith({
      url: "https://horizon-testnet.stellar.org",
      address: "testnet",
      critical: true,
    });
  });

  it("reports degraded (not absent) when Soroban RPC times out", async () => {
    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
      fetch: timeoutFetch(),
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.soroban).toMatchObject({ status: "degraded" });
    // All other checks are unaffected
    expect(report.checks.config.status).toBe("ok");
    expect(report.checks.stellar.status).toBe("ok");
    expect(report.checks.kms.status).toBe("ok");
  });

  it("reports degraded when Soroban RPC returns a non-OK HTTP status", async () => {
    const badFetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as unknown as typeof fetch;

    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(createConfig()),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
      fetch: badFetch,
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.soroban).toMatchObject({
      status: "degraded",
      message: "Soroban RPC returned HTTP 503",
    });
  });

  it("omits soroban check when no sorobanRpcUrl is configured", async () => {
    const configWithoutSoroban = { ...createConfig(), network: { ...createConfig().network, sorobanRpcUrl: undefined } };

    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn().mockReturnValue(configWithoutSoroban),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
      fetch: okFetch(),
    });

    expect(report.status).toBe("ok");
    expect(report.checks.soroban).toBeUndefined();
  });

  it("reports degraded when configuration validation fails", async () => {
    const report = await getReadinessReport({
      now: fixedNow,
      validateConfig: jest.fn(() => {
        throw new Error("JWT_SECRET environment variable is required");
      }),
      getSigner: jest.fn().mockReturnValue({ getPublicKey: jest.fn().mockResolvedValue("GABC") }),
      createStellarClient: jest.fn().mockReturnValue(createOkStellarClient()),
      fetch: okFetch(),
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
      fetch: okFetch(),
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
      fetch: okFetch(),
    });

    expect(report.status).toBe("degraded");
    expect(report.checks.kms).toMatchObject({
      status: "degraded",
      message: "KMS unavailable",
    });
  });
});
