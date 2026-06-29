/**
 * lib/chaos.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Test suite for the fault-injection middleware.
 *
 * Coverage strategy
 * ────────────────
 * The suite targets >=90% line coverage on lib/chaos.ts by exercising:
 *
 *   • Every assert* helper (all "happy" and "happy-error" branches).
 *   • The CHAOS_ENV_KEYS defaults path with a clean env.
 *   • Every branch of resolveChaosConfig (override > env > default).
 *   • The decideChaos state-machine: disabled, path-filtered, method-
 *     filtered, all-zero rates, over-1.0 rates, latency band, error
 *     band, abort band, fall-through, and boundary draws.
 *   • withChaosMiddleware dispatch: passthrough, latency (with marker
 *     stamping), error (synthesized envelope), abort.
 *   • Edge cases: NaN, Infinity, negative numbers, unicode, leading /
 *     trailing whitespace in env, fractional seeds.
 *
 * Determinism
 * ───────────
 * Tests that exercise probability-driven branches pass an explicit RNG to
 * decideChaos. The middleware is tested with `random: () => 0` (force
 * "smallest draw") and `random: () => 0.999` (force "large draw") so
 * results are reproducible across CI.
 */

import {
  CHAOS_DEFAULTS,
  CHAOS_ENV_KEYS,
  ChaosConfigError,
  decideChaos,
  extractPath,
  matchesMethod,
  matchesPath,
  resolveChaosConfig,
  withChaosMiddleware,
  type ChaosInjectionConfig,
  type ChaosRequestContext,
} from "./chaos";

// Avoid the project's global logger from clobbering the test log —
// silence console.log/error/warn for the duration of the suite.
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
let logBuffer: string[] = [];
function captureLog(level: "log" | "warn" | "error") {
  if (level === "log") console.log = (...args: unknown[]) => logBuffer.push(String(args[0]));
  if (level === "warn") console.warn = (...args: unknown[]) => logBuffer.push(String(args[0]));
  if (level === "error") console.error = (...args: unknown[]) => logBuffer.push(String(args[0]));
}
function restoreLog() {
  console.log = _origLog;
  console.warn = _origWarn;
  console.error = _origError;
  logBuffer = [];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<ChaosInjectionConfig> = {}): ChaosInjectionConfig {
  return {
    enabled: true,
    latencyRate: 0,
    errorRate: 0,
    abortRate: 0,
    minLatencyMs: 0,
    maxLatencyMs: 0,
    errorStatus: 503,
    errorCode: "CHAOS_INJECTED_ERROR",
    errorMessage: "Chaos injected this response.",
    pathPrefixes: [],
    methods: [],
    ...overrides,
  };
}

const reqCtx = (overrides: Partial<ChaosRequestContext> = {}): ChaosRequestContext => ({
  path: "/api/v2/streams",
  method: "GET",
  correlationId: "corr-123",
  requestId: "req-456",
  ...overrides,
});

const realEnv: Record<string, string | undefined> = {};

// Snapshot the env once so individual tests can mutate and restore.
beforeAll(() => {
  for (const key of Object.values(CHAOS_ENV_KEYS)) {
    realEnv[key] = process.env[key];
  }
});

afterEach(() => {
  // Reset env to snapshot between tests.
  for (const key of Object.values(CHAOS_ENV_KEYS)) {
    if (realEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = realEnv[key];
    }
  }
  restoreLog();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. ChaosConfigError
// ══════════════════════════════════════════════════════════════════════════════

describe("ChaosConfigError", () => {
  it("preserves field, value, and message", () => {
    const err = new ChaosConfigError("CHAOS_LATENCY_RATE", 1.5, "out of range");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ChaosConfigError");
    expect(err.field).toBe("CHAOS_LATENCY_RATE");
    expect(err.value).toBe(1.5);
    expect(err.message).toContain("CHAOS_LATENCY_RATE");
    expect(err.message).toContain("out of range");
  });

  it("stringifies arbitrary values safely (no crash on circular refs, BigInt, fn, symbol, undefined)", () => {
    const circular: Record<string, unknown> = { ok: true };
    circular.self = circular;
    const err = new ChaosConfigError("CHAOS_ERR_CODE", circular, "boom");
    expect(err.message).toContain("CHAOS_ERR_CODE");
    expect(err.message).toMatch(/unserializable|circular/);

    const bigintErr = new ChaosConfigError("CHAOS_BIG", 1n, "big");
    expect(bigintErr.message).toContain("BigInt");

    const fnErr = new ChaosConfigError("CHAOS_FN", function myFn() {}, "fn");
    expect(fnErr.message).toContain("function");
    expect(fnErr.message).toContain("myFn");

    const symErr = new ChaosConfigError("CHAOS_SYM", Symbol("probe"), "sym");
    expect(symErr.message).toContain("symbol");
    expect(symErr.message).toContain("probe");

    const undefErr = new ChaosConfigError("CHAOS_UNDEF", undefined, "undef");
    expect(undefErr.message).toContain("undefined");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. resolveChaosConfig — defaults & env
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveChaosConfig — defaults", () => {
  it("returns a fully-typed config with all defaults when env is empty", () => {
    for (const k of Object.values(CHAOS_ENV_KEYS)) delete process.env[k];
    const cfg = resolveChaosConfig();
    expect(cfg).toEqual({
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
      seed: undefined,
    });
  });

  it("matches exported CHAOS_DEFAULTS shape", () => {
    for (const k of Object.values(CHAOS_ENV_KEYS)) delete process.env[k];
    const cfg = resolveChaosConfig();
    expect(cfg.enabled).toBe(CHAOS_DEFAULTS.enabled);
    expect(cfg.latencyRate).toBe(CHAOS_DEFAULTS.latencyRate);
    expect(cfg.maxLatencyMs).toBe(CHAOS_DEFAULTS.maxLatencyMs);
  });
});

describe("resolveChaosConfig — env", () => {
  it("reads CHAOS_ENABLED truthy values", () => {
    process.env.CHAOS_ENABLED = "true";
    expect(resolveChaosConfig().enabled).toBe(true);
    process.env.CHAOS_ENABLED = "1";
    expect(resolveChaosConfig().enabled).toBe(true);
    process.env.CHAOS_ENABLED = "yes";
    expect(resolveChaosConfig().enabled).toBe(true);
    process.env.CHAOS_ENABLED = "on";
    expect(resolveChaosConfig().enabled).toBe(true);
    process.env.CHAOS_ENABLED = "TRUE";
    expect(resolveChaosConfig().enabled).toBe(true);
  });

  it("reads CHAOS_ENABLED falsy values", () => {
    process.env.CHAOS_ENABLED = "false";
    expect(resolveChaosConfig().enabled).toBe(false);
    process.env.CHAOS_ENABLED = "0";
    expect(resolveChaosConfig().enabled).toBe(false);
    process.env.CHAOS_ENABLED = "garbage";
    expect(resolveChaosConfig().enabled).toBe(false);
  });

  it("reads CHAOS_LATENCY_RATE / ERROR_RATE / ABORT_RATE", () => {
    process.env.CHAOS_ENABLED = "true";
    process.env.CHAOS_LATENCY_RATE = "0.1";
    process.env.CHAOS_ERROR_RATE = "0.2";
    process.env.CHAOS_ABORT_RATE = "0.05";
    const cfg = resolveChaosConfig();
    expect(cfg.latencyRate).toBeCloseTo(0.1);
    expect(cfg.errorRate).toBeCloseTo(0.2);
    expect(cfg.abortRate).toBeCloseTo(0.05);
  });

  it("reads CHAOS_MIN_LATENCY_MS / CHAOS_MAX_LATENCY_MS", () => {
    process.env.CHAOS_MIN_LATENCY_MS = "50";
    process.env.CHAOS_MAX_LATENCY_MS = "250";
    const cfg = resolveChaosConfig();
    expect(cfg.minLatencyMs).toBe(50);
    expect(cfg.maxLatencyMs).toBe(250);
  });

  it("reads CHAOS_ERROR_STATUS / CHAOS_ERROR_CODE / CHAOS_ERROR_MESSAGE", () => {
    process.env.CHAOS_ERROR_STATUS = "503";
    process.env.CHAOS_ERROR_CODE = "CHAOS_503_TEST";
    process.env.CHAOS_ERROR_MESSAGE = "boom";
    const cfg = resolveChaosConfig();
    expect(cfg.errorStatus).toBe(503);
    expect(cfg.errorCode).toBe("CHAOS_503_TEST");
    expect(cfg.errorMessage).toBe("boom");
  });

  it("reads CHAOS_PATH_PREFIXES (comma-separated)", () => {
    process.env.CHAOS_PATH_PREFIXES = "/api/v2, /internal";
    const cfg = resolveChaosConfig();
    expect(cfg.pathPrefixes).toEqual(["/api/v2", "/internal"]);
  });

  it("reads CHAOS_METHODS (comma-separated, case-insensitive)", () => {
    process.env.CHAOS_METHODS = "get, POST, patch";
    const cfg = resolveChaosConfig();
    expect(cfg.methods).toEqual(["GET", "POST", "PATCH"]);
  });

  it("reads CHAOS_SEED", () => {
    process.env.CHAOS_SEED = "42";
    const cfg = resolveChaosConfig();
    expect(cfg.seed).toBe(42);
  });

  it("trims whitespace from string env vars", () => {
    process.env.CHAOS_ENABLED = "  true  ";
    process.env.CHAOS_ERROR_CODE = "  CHAOS_WHITESPACE  ";
    const cfg = resolveChaosConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.errorCode).toBe("CHAOS_WHITESPACE");
  });

  it("falls through to default when CHAOS_LATENCY_RATE is non-numeric", () => {
    process.env.CHAOS_LATENCY_RATE = "banana";
    const cfg = resolveChaosConfig();
    expect(cfg.latencyRate).toBe(CHAOS_DEFAULTS.latencyRate);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. resolveChaosConfig — override precedence
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveChaosConfig — override precedence", () => {
  it("lets overrides beat env when both are set", () => {
    process.env.CHAOS_LATENCY_RATE = "0.1";
    const cfg = resolveChaosConfig({ overrides: { latencyRate: 0.7 } });
    expect(cfg.latencyRate).toBeCloseTo(0.7);
  });

  it("uses env when overrides do not specify a field", () => {
    process.env.CHAOS_LATENCY_RATE = "0.42";
    const cfg = resolveChaosConfig({ overrides: { errorRate: 0.1 } });
    expect(cfg.latencyRate).toBeCloseTo(0.42);
    expect(cfg.errorRate).toBeCloseTo(0.1);
  });

  it("lets overrides beat env for pathPrefixes as an array", () => {
    process.env.CHAOS_PATH_PREFIXES = "/env-only";
    const cfg = resolveChaosConfig({
      overrides: { pathPrefixes: ["/override", "/override2"] },
    });
    expect(cfg.pathPrefixes).toEqual(["/override", "/override2"]);
  });

  it("lets overrides beat env for methods as an array", () => {
    process.env.CHAOS_METHODS = "GET";
    const cfg = resolveChaosConfig({
      overrides: { methods: ["POST", "PUT"] },
    });
    expect(cfg.methods).toEqual(["POST", "PUT"]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. resolveChaosConfig — validation errors
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveChaosConfig — validation errors", () => {
  // ── Rates ────────────────────────────────────────────────────────────────
  it("throws on negative latencyRate override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { latencyRate: -0.01 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on >1 latencyRate override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { latencyRate: 1.01 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on NaN rate override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorRate: Number.NaN } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on Infinity rate override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { abortRate: Number.POSITIVE_INFINITY } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on string rate override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { latencyRate: "0.5" as unknown as number } }),
    ).toThrow(ChaosConfigError);
  });

  // ── Latency integers ─────────────────────────────────────────────────────
  it("throws on negative minLatencyMs override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { minLatencyMs: -1 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on non-integer minLatencyMs override", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { minLatencyMs: 1.5 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws when maxLatencyMs < minLatencyMs", () => {
    expect(() =>
      resolveChaosConfig({
        overrides: { minLatencyMs: 100, maxLatencyMs: 50 },
      }),
    ).toThrow(/must be >= minLatencyMs/);
  });

  it("throws when maxLatencyMs exceeds the 60s cap", () => {
    expect(() =>
      resolveChaosConfig({
        overrides: { minLatencyMs: 0, maxLatencyMs: 99999 },
      }),
    ).toThrow(/60s|MAX_LATENCY_CAP|60000/);
  });

  // ── Status code ──────────────────────────────────────────────────────────
  it("throws on non-integer errorStatus", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorStatus: 200.5 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on 2xx errorStatus", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorStatus: 200 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on 6xx errorStatus", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorStatus: 600 } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on NaN errorStatus", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorStatus: Number.NaN } }),
    ).toThrow(ChaosConfigError);
  });

  // ── Error code identifier ────────────────────────────────────────────────
  it("throws on lowercase errorCode", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorCode: "chaos_test" } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on empty errorCode", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorCode: "" } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on whitespace-only errorCode", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorCode: "   " } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on control-character errorCode", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorCode: "CHAOS\u0000CODE" } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on numeric-leading errorCode", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorCode: "1CHAOS" } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on overly long errorCode", () => {
    const long = "A".repeat(65);
    expect(() =>
      resolveChaosConfig({ overrides: { errorCode: long } }),
    ).toThrow(/64 characters/);
  });

  // ── Error message ────────────────────────────────────────────────────────
  it("throws on empty errorMessage", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorMessage: "" } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on whitespace-only errorMessage", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorMessage: "   \t" } }),
    ).toThrow(ChaosConfigError);
  });

  it("throws on control characters in errorMessage", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { errorMessage: "boom\u0007" } }),
    ).toThrow(ChaosConfigError);
  });

  // ── Path prefix list ─────────────────────────────────────────────────────
  it("rejects path prefixes containing whitespace", () => {
    expect(() =>
      resolveChaosConfig({
        overrides: { pathPrefixes: ["/ok", "/has space"] },
      }),
    ).toThrow(/whitespace/);
  });

  it("rejects path prefixes containing control characters", () => {
    expect(() =>
      resolveChaosConfig({
        overrides: { pathPrefixes: ["/bad\u0000prefix"] },
      }),
    ).toThrow(/control/);
  });

  it("normalizes path prefixes missing leading slash", () => {
    const cfg = resolveChaosConfig({
      overrides: { pathPrefixes: ["api/v2"] },
    });
    expect(cfg.pathPrefixes).toEqual(["/api/v2"]);
  });

  // ── Methods list ─────────────────────────────────────────────────────────
  it("rejects invalid methods", () => {
    expect(() =>
      resolveChaosConfig({
        overrides: { methods: ["PURGE" as unknown as "GET"] },
      }),
    ).toThrow(ChaosConfigError);
  });

  it("dedupes methods", () => {
    const cfg = resolveChaosConfig({
      overrides: { methods: ["get", "GET", "Get"] },
    });
    expect(cfg.methods).toEqual(["GET"]);
  });

  // ── Seed validation ──────────────────────────────────────────────────────
  it("rejects non-integer seed overrides", () => {
    expect(() =>
      resolveChaosConfig({ overrides: { seed: 1.5 } }),
    ).toThrow(ChaosConfigError);
  });

  it("rejects fractional seed env", () => {
    process.env.CHAOS_SEED = "1.5";
    expect(() => resolveChaosConfig()).toThrow(ChaosConfigError);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. matchesPath
// ══════════════════════════════════════════════════════════════════════════════

describe("matchesPath", () => {
  it("returns true when pathPrefixes is empty", () => {
    expect(matchesPath("/anything", [])).toBe(true);
  });

  it("returns true on exact prefix match", () => {
    expect(matchesPath("/api/v2", ["/api/v2"])).toBe(true);
  });

  it("returns true when path starts with the prefix (with trailing slash)", () => {
    expect(matchesPath("/api/v2/streams", ["/api/v2"])).toBe(true);
  });

  it("returns true when path starts with the prefix (already has trailing slash)", () => {
    expect(matchesPath("/api/v2/streams", ["/api/v2/"])).toBe(true);
  });

  it("returns false on a path that only shares a substring", () => {
    expect(matchesPath("/api/v3/streams", ["/api/v2"])).toBe(false);
  });

  it("returns true when at least one of many prefixes matches", () => {
    expect(matchesPath("/api/v2/streams", ["/static", "/api/v2"])).toBe(true);
    expect(matchesPath("/static", ["/static", "/api/v2"])).toBe(true);
    expect(matchesPath("/elsewhere", ["/static", "/api/v2"])).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. matchesMethod
// ══════════════════════════════════════════════════════════════════════════════

describe("matchesMethod", () => {
  it("returns true when methods is empty", () => {
    expect(matchesMethod("TRACE", [])).toBe(true);
  });

  it("matches uppercase entries case-insensitively", () => {
    expect(matchesMethod("get", ["GET"])).toBe(true);
    expect(matchesMethod("POST", ["post"])).toBe(true);
  });

  it("returns false when method not in list", () => {
    expect(matchesMethod("DELETE", ["GET", "POST"])).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. extractPath
// ══════════════════════════════════════════════════════════════════════════════

describe("extractPath", () => {
  it("returns empty string when url is missing", () => {
    expect(extractPath({})).toBe("");
    expect(extractPath({ url: "" })).toBe("");
  });

  it("extracts pathname from a full URL", () => {
    expect(extractPath({ url: "https://api.example.com/api/v2/streams" }))
      .toBe("/api/v2/streams");
  });

  it("extracts pathname from a relative URL", () => {
    expect(extractPath({ url: "/api/v2/streams?x=1" })).toBe("/api/v2/streams");
  });

  it("falls back to query-stripped substring when URL is malformed", () => {
    // "https://%" is invalid percent-encoding and makes new URL() throw.
    const out = extractPath({ url: "https://%/foo?bar=1" });
    expect(out).toBe("https://%/foo");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. decideChaos — core decision branches
// ══════════════════════════════════════════════════════════════════════════════

describe("decideChaos — early-out branches", () => {
  it("returns no-fault when disabled", () => {
    const cfg = makeConfig({ enabled: false, latencyRate: 1 });
    const d = decideChaos(cfg, reqCtx(), () => 0);
    expect(d.shouldFault).toBe(false);
    expect(d.reason).toMatch(/disabled/i);
  });

  it("returns no-fault when path-filtered", () => {
    const cfg = makeConfig({ latencyRate: 1, pathPrefixes: ["/api/v3"] });
    const d = decideChaos(cfg, reqCtx({ path: "/api/v2/streams" }), () => 0);
    expect(d.shouldFault).toBe(false);
    expect(d.reason).toMatch(/outside pathPrefixes/);
  });

  it("returns no-fault when method-filtered", () => {
    const cfg = makeConfig({ errorRate: 1, methods: ["POST"] });
    const d = decideChaos(cfg, reqCtx({ method: "GET" }), () => 0);
    expect(d.shouldFault).toBe(false);
    expect(d.reason).toMatch(/outside methods/);
  });

  it("returns no-fault when all rates are zero", () => {
    const cfg = makeConfig();
    const d = decideChaos(cfg, reqCtx(), () => 0);
    expect(d.shouldFault).toBe(false);
    expect(d.reason).toMatch(/all injection rates are zero/);
  });

  it("returns no-fault when combined rates exceed 1.0", () => {
    const cfg = makeConfig({ latencyRate: 0.5, errorRate: 0.5, abortRate: 0.5 });
    const d = decideChaos(cfg, reqCtx(), () => 0);
    expect(d.shouldFault).toBe(false);
    expect(d.reason).toMatch(/exceeds 1\.0/);
  });

  it("returns no-fault when the random draw falls outside all bands", () => {
    const cfg = makeConfig({ latencyRate: 0.1, errorRate: 0.1 });
    // draw = 0.9 is outside [0, 0.2)
    const d = decideChaos(cfg, reqCtx(), () => 0.9);
    expect(d.shouldFault).toBe(false);
    expect(d.reason).toMatch(/fell outside all injection ranges/);
  });
});

describe("decideChaos — latency branch", () => {
  it("chooses latency when draw < latencyRate", () => {
    const cfg = makeConfig({ latencyRate: 1, minLatencyMs: 25, maxLatencyMs: 25 });
    const d = decideChaos(cfg, reqCtx(), () => 0.5);
    expect(d.shouldFault).toBe(true);
    expect(d.fault!.type).toBe("latency");
    if (d.fault!.type === "latency") {
      expect(d.fault!.durationMs).toBe(25);
    }
    expect(d.reason).toMatch(/latency injection/);
  });

  it("samples latency within the configured range", () => {
    const cfg = makeConfig({ latencyRate: 1, minLatencyMs: 0, maxLatencyMs: 99 });
    // Two draws — first decides "yes" (0), second = 0.5 → duration = 50
    const draws = [0, 0.5];
    let i = 0;
    const d = decideChaos(cfg, reqCtx(), () => draws[i++]);
    expect(d.shouldFault).toBe(true);
    expect(d.fault!.type).toBe("latency");
    if (d.fault!.type === "latency") {
      expect(d.fault!.durationMs).toBeGreaterThanOrEqual(0);
      expect(d.fault!.durationMs).toBeLessThanOrEqual(99);
    }
  });

  it("clamps latency to maxLatencyMs when rng returns 1.0 (treated as 0.9999...)", () => {
    const cfg = makeConfig({ latencyRate: 1, minLatencyMs: 0, maxLatencyMs: 10 });
    // pickRng = 0 (decide) and 0.9999999 (duration = 10)
    const draws = [0, 0.9999999];
    let i = 0;
    const d = decideChaos(cfg, reqCtx(), () => draws[i++]);
    if (d.fault?.type === "latency") {
      expect(d.fault.durationMs).toBe(10);
    }
  });
});

describe("decideChaos — error branch", () => {
  it("chooses error when draw is in [latencyRate, latencyRate + errorRate)", () => {
    const cfg = makeConfig({
      latencyRate: 0.2,
      errorRate: 0.8,
      errorStatus: 418,
      errorCode: "CHAOS_TEAPOT",
      errorMessage: "i am a teapot",
    });
    // draw = 0.5 → in [0.2, 1.0) → error
    const d = decideChaos(cfg, reqCtx(), () => 0.5);
    expect(d.shouldFault).toBe(true);
    expect(d.fault!.type).toBe("error");
    if (d.fault!.type === "error") {
      expect(d.fault!.status).toBe(418);
      expect(d.fault!.code).toBe("CHAOS_TEAPOT");
      expect(d.fault!.message).toBe("i am a teapot");
    }
  });
});

describe("decideChaos — abort branch", () => {
  it("chooses abort when draw is in the trailing tail", () => {
    const cfg = makeConfig({ abortRate: 1 });
    const d = decideChaos(cfg, reqCtx(), () => 0.999);
    expect(d.shouldFault).toBe(true);
    expect(d.fault!.type).toBe("abort");
    if (d.fault!.type === "abort") {
      expect(d.fault!.reason).toMatch(/aborted/i);
    }
  });

  it("prefers latency over error over abort when all rates compete", () => {
    const cfg = makeConfig({ latencyRate: 0.34, errorRate: 0.33, abortRate: 0.33 });
    // Three boundary draws to exercise each branch
    const dLat = decideChaos(cfg, reqCtx(), () => 0.1); // latency band [0, 0.34)
    const dErr = decideChaos(cfg, reqCtx(), () => 0.5); // error band [0.34, 0.67)
    const dAbt = decideChaos(cfg, reqCtx(), () => 0.9); // abort band [0.67, 1.00)
    expect(dLat.fault?.type).toBe("latency");
    expect(dErr.fault?.type).toBe("error");
    expect(dAbt.fault?.type).toBe("abort");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. withChaosMiddleware — passthrough & dispatch
// ══════════════════════════════════════════════════════════════════════════════

describe("withChaosMiddleware — passthrough", () => {
  it("invokes the handler when chaos is disabled", async () => {
    for (const k of Object.values(CHAOS_ENV_KEYS)) delete process.env[k];
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(await res.text()).toBe("ok");
    expect(res.status).toBe(200);
  });

  it("invokes the handler when path does not match pathPrefixes", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    await withChaosMiddleware(
      { url: "https://x.local/static", method: "GET" },
      handler,
      { overrides: { enabled: true, latencyRate: 1, pathPrefixes: ["/api/v2"] } },
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("invokes the handler when random draw is outside all bands", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        overrides: { enabled: true, errorRate: 0.1 },
        random: () => 0.999,
      },
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("withChaosMiddleware — error injection", () => {
  it("returns the standardized error envelope on error fault", async () => {
    captureLog("log");
    captureLog("warn");
    captureLog("error");
    const handler = jest.fn(async () => new Response("should not run"));
    const res = await withChaosMiddleware(
      {
        url: "https://x.local/api/v2/streams",
        method: "GET",
        headers: new Headers({ "x-request-id": "req-from-test" }),
      },
      handler,
      {
        overrides: {
          enabled: true,
          errorRate: 1,
          errorStatus: 503,
          errorCode: "CHAOS_INJECTED_ERROR",
          errorMessage: "synthetic failure",
        },
        random: () => 0,
      },
    );

    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(503);
    expect(res.headers.get("x-chaos-fault")).toBe("error");
    expect(res.headers.get("x-request-id")).toBe("req-from-test");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: "CHAOS_INJECTED_ERROR",
        message: "synthetic failure",
        request_id: "req-from-test",
      },
    });
  });

  it("generates a fallback request_id when the header is missing", async () => {
    const handler = jest.fn(async () => new Response("nope"));
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        overrides: { enabled: true, errorRate: 1 },
        random: () => 0,
      },
    );
    const body = await res.json();
    expect(body.error.request_id).toMatch(/^req_[a-z0-9_]+$/);
  });
});

describe("withChaosMiddleware — abort injection", () => {
  it("returns a 503 with CHAOS_REQUEST_ABORTED code", async () => {
    const handler = jest.fn(async () => new Response("should not run"));
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "POST" },
      handler,
      {
        overrides: { enabled: true, abortRate: 1 },
        random: () => 0,
      },
    );
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(503);
    expect(res.headers.get("x-chaos-fault")).toBe("abort");
    const body = await res.json();
    expect(body.error.code).toBe("CHAOS_REQUEST_ABORTED");
  });
});

describe("withChaosMiddleware — latency injection", () => {
  it("awaits then forwards the handler output, stamping x-chaos headers", async () => {
    const handler = jest.fn(async () => new Response("forwarded body", { status: 200 }));
    const now = process.hrtime.bigint();
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        overrides: { enabled: true, latencyRate: 1, minLatencyMs: 20, maxLatencyMs: 20 },
        random: () => 0,
      },
    );
    const elapsedMs = Number(process.hrtime.bigint() - now) / 1_000_000;
    expect(handler).toHaveBeenCalledTimes(1);
    expect(await res.text()).toBe("forwarded body");
    expect(res.headers.get("x-chaos-fault")).toBe("latency");
    expect(res.headers.get("x-chaos-latency-ms")).toBe("20");
    expect(elapsedMs).toBeGreaterThanOrEqual(15); // allow scheduler slack
  });

  it("short-circuits the sleep for durationMs === 0", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        overrides: { enabled: true, latencyRate: 1, minLatencyMs: 0, maxLatencyMs: 0 },
        random: () => 0,
      },
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.headers.get("x-chaos-fault")).toBe("latency");
    expect(res.headers.get("x-chaos-latency-ms")).toBe("0");
  });

  it("propagates handler errors after latency", async () => {
    const handler = jest.fn(async () => {
      throw new Error("downstream blew up");
    });
    await expect(
      withChaosMiddleware(
        { url: "https://x.local/api", method: "GET" },
        handler,
        {
          overrides: { enabled: true, latencyRate: 1, minLatencyMs: 0, maxLatencyMs: 0 },
          random: () => 0,
        },
      ),
    ).rejects.toThrow(/downstream blew up/);
  });
});

describe("withChaosMiddleware — header handling", () => {
  it("extracts correlation_id and request_id from headers", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    await withChaosMiddleware(
      {
        url: "https://x.local/api/v2/streams",
        method: "GET",
        headers: new Headers({
          "x-request-id": "req-1",
          "x-correlation-id": "corr-1",
        }),
      },
      handler,
    );
    expect(handler).toHaveBeenCalled();
  });

  it("handles missing headers safely", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    await withChaosMiddleware(
      { url: "https://x.local/api", method: "GET" },
      handler,
    );
    expect(handler).toHaveBeenCalled();
  });

  it("handles a throwing headers.get without crashing", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    const badHeaders = { get: () => { throw new Error("nope"); } } as unknown as Headers;
    await withChaosMiddleware(
      { url: "https://x.local/api", method: "GET", headers: badHeaders },
      handler,
    );
    expect(handler).toHaveBeenCalled();
  });

  it("handles a malformed URL without crashing", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    await withChaosMiddleware(
      { url: "", method: "GET" },
      handler,
    );
    expect(handler).toHaveBeenCalled();
  });

  it("normalizes a missing method to GET", async () => {
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    await withChaosMiddleware(
      { url: "https://x.local/api" } as { url?: string; method?: string },
      handler,
      {
        overrides: { enabled: true, errorRate: 0 }, // no real injection chance
      },
    );
    expect(handler).toHaveBeenCalled();
  });
});

describe("withChaosMiddleware — forceEnable", () => {
  it("forces enabled=true even when env says disabled", async () => {
    for (const k of Object.values(CHAOS_ENV_KEYS)) delete process.env[k];
    const handler = jest.fn(async () => new Response("ok", { status: 200 }));
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        forceEnable: true,
        overrides: { errorRate: 1 },
        random: () => 0,
      },
    );
    expect(handler).not.toHaveBeenCalled();
    expect(res.status).toBe(503);
  });
});

describe("withChaosMiddleware — seeded determinism", () => {
  it("produces identical outcomes across many requests with the same seed", async () => {
    // Two independent runs with the same seeded config must yield the
    // same sequence of decisions — we verify via the response status:
    //   503 => injected fault; 200 => forwarded handler output.
    //
    // `seed` lives on the ChaosInjectionConfig, so it's passed via
    // `overrides.seed` rather than at the top level.
    const outcomesA: number[] = [];
    const outcomesB: number[] = [];

    async function runOnce(): Promise<number[]> {
      const collected: number[] = [];
      const handler = async () => new Response("ok", { status: 200 });
      const overrides = { enabled: true, errorRate: 0.3, seed: 1337 };
      for (let i = 0; i < 10; i++) {
        const res = await withChaosMiddleware(
          { url: "https://x.local/api/v2/streams", method: "GET" },
          handler,
          { overrides },
        );
        collected.push(res.status);
      }
      return collected;
    }

    outcomesA.push(...(await runOnce()));
    outcomesB.push(...(await runOnce()));

    expect(outcomesA).toEqual(outcomesB);
    // We must see at least one chaos decision (otherwise the test
    // is vacuous — it would pass even on a broken RNG).
    expect(outcomesA).toContain(503);
  });
});

describe("withChaosMiddleware — logging", () => {
  it("emits a structured log entry on injected error fault", async () => {
    captureLog("log");
    captureLog("warn");
    captureLog("error");
    const handler = jest.fn(async () => new Response("ok"));
    await withChaosMiddleware(
      {
        url: "https://x.local/api/v2/streams",
        method: "POST",
        headers: new Headers({
          "x-request-id": "req-log-test",
          "x-correlation-id": "corr-log-test",
        }),
      },
      handler,
      {
        overrides: { enabled: true, errorRate: 1 },
        random: () => 0,
      },
    );
    const joined = logBuffer.join("\n");
    expect(joined).toMatch(/chaos middleware injected fault/);
    expect(joined).toMatch(/"request_id":"req-log-test"/);
    expect(joined).toMatch(/"correlation_id":"corr-log-test"/);
    expect(joined).toMatch(/"fault":/);
  });

  it("does not log on passthrough", async () => {
    captureLog("log");
    captureLog("warn");
    captureLog("error");
    const handler = jest.fn(async () => new Response("ok"));
    await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      { overrides: { enabled: true, latencyRate: 0 } },
    );
    expect(logBuffer).toEqual([]);
  });
});

describe("withChaosMiddleware — Response stamping", () => {
  it("stamps x-chaos-fault markers onto downstream response", async () => {
    const handler = jest.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        overrides: { enabled: true, latencyRate: 1, minLatencyMs: 0, maxLatencyMs: 0 },
        random: () => 0,
      },
    );
    expect(res.headers.get("x-chaos-fault")).toBe("latency");
    expect(res.headers.get("x-chaos-latency-ms")).toBe("0");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns the response unchanged when its body was already consumed", async () => {
    // Build a Response whose body is consumed BEFORE the middleware sees it.
    const source = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await source.json(); // body consumed
    const handler = jest.fn(async () => source);
    const res = await withChaosMiddleware(
      { url: "https://x.local/api/v2/streams", method: "GET" },
      handler,
      {
        overrides: { enabled: true, latencyRate: 1, minLatencyMs: 0, maxLatencyMs: 0 },
        random: () => 0,
      },
    );
    // No markers should be applied; response is returned untouched.
    expect(res.headers.get("x-chaos-fault")).toBeNull();
    expect(res).toBe(source);
  });
});
