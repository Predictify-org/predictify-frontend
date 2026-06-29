/** @jest-environment node */

import { applyChaos, getChaosConfig } from "./chaos";

describe("getChaosConfig", () => {
  it("is disabled by default", () => {
    const config = getChaosConfig({});
    expect(config.enabled).toBe(false);
  });

  it("is force-disabled in production even when CHAOS_ENABLED=true", () => {
    const config = getChaosConfig({ NODE_ENV: "production", CHAOS_ENABLED: "true" });
    expect(config.enabled).toBe(false);
  });

  it("enables in non-production when CHAOS_ENABLED=true", () => {
    const config = getChaosConfig({ NODE_ENV: "development", CHAOS_ENABLED: "true" });
    expect(config.enabled).toBe(true);
  });

  it("clamps the error rate into [0, 1]", () => {
    expect(getChaosConfig({ CHAOS_ERROR_RATE: "5" }).errorRate).toBe(1);
    expect(getChaosConfig({ CHAOS_ERROR_RATE: "-2" }).errorRate).toBe(0);
    expect(getChaosConfig({ CHAOS_ERROR_RATE: "0.3" }).errorRate).toBeCloseTo(0.3);
  });

  it("falls back to defaults for invalid numbers", () => {
    const config = getChaosConfig({ CHAOS_LATENCY_MS: "abc", CHAOS_ERROR_STATUS: "nan" });
    expect(config.latencyMs).toBe(0);
    expect(config.errorStatus).toBe(503);
  });

  it("clamps error status into the 4xx/5xx range", () => {
    expect(getChaosConfig({ CHAOS_ERROR_STATUS: "200" }).errorStatus).toBe(400);
    expect(getChaosConfig({ CHAOS_ERROR_STATUS: "700" }).errorStatus).toBe(599);
  });
});

describe("applyChaos", () => {
  it("is a no-op when disabled", async () => {
    const sleep = jest.fn();
    const outcome = await applyChaos(
      { enabled: false, latencyMs: 1000, errorRate: 1, errorStatus: 503 },
      () => 0,
      sleep
    );
    expect(outcome.delayMs).toBe(0);
    expect(outcome.injectedStatus).toBeUndefined();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("injects latency scaled by the random source", async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const outcome = await applyChaos(
      { enabled: true, latencyMs: 200, errorRate: 0, errorStatus: 503 },
      () => 0.5,
      sleep
    );
    expect(outcome.delayMs).toBe(100);
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it("injects an error when the random draw is below the error rate", async () => {
    const outcome = await applyChaos(
      { enabled: true, latencyMs: 0, errorRate: 0.5, errorStatus: 503 },
      () => 0.1
    );
    expect(outcome.injectedStatus).toBe(503);
  });

  it("does not inject an error when the random draw is above the error rate", async () => {
    const outcome = await applyChaos(
      { enabled: true, latencyMs: 0, errorRate: 0.5, errorStatus: 503 },
      () => 0.9
    );
    expect(outcome.injectedStatus).toBeUndefined();
  });
});
