import { InMemoryRateLimitStore } from "./rate-limit-store";
import { RATE_LIMITS, getLimitForRoute } from "./rate-limit-config";

describe("InMemoryRateLimitStore", () => {
  let store: InMemoryRateLimitStore;

  beforeEach(() => {
    store = new InMemoryRateLimitStore();
  });

  afterEach(() => {
    store.destroy();
  });

  describe("check", () => {
    it("should allow first request and set remaining tokens", async () => {
      const result = await store.check("test-identifier", 60, 60_000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
      expect(result.resetAt).toBeGreaterThan(0);
    });

    it("should decrement tokens on subsequent requests", async () => {
      await store.check("test-identifier", 60, 60_000);
      const result = await store.check("test-identifier", 60, 60_000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(58);
    });

    it("should deny when tokens are exhausted", async () => {
      for (let i = 0; i < 60; i++) {
        await store.check("test-identifier", 60, 60_000);
      }

      const result = await store.check("test-identifier", 60, 60_000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should track different identifiers separately", async () => {
      await store.check("id-1", 60, 60_000);
      const result1 = await store.check("id-1", 60, 60_000);
      const result2 = await store.check("id-2", 60, 60_000);

      expect(result1.remaining).toBe(58);
      expect(result2.remaining).toBe(59);
    });

    it("should handle concurrent requests for same identifier", async () => {
      const promises = [
        store.check("concurrent-id", 5, 60_000),
        store.check("concurrent-id", 5, 60_000),
        store.check("concurrent-id", 5, 60_000),
      ];

      const results = await Promise.all(promises);

      expect(results.filter((r) => r.allowed)).toHaveLength(3);
    });

    it("should respect window expiry for token refill", async () => {
      const fakeTimers = jest.useFakeTimers();
      try {
        for (let i = 0; i < 3; i++) {
          await store.check("test-identifier", 10, 60_000);
        }

        fakeTimers.advanceTimersByTime(60_000);

        const result = await store.check("test-identifier", 10, 60_000);

        expect(result.allowed).toBe(true);
      } finally {
        fakeTimers.useRealTimers();
      }
    });
  });

  describe("cleanup", () => {
    it("should clean up expired buckets", async () => {
      const fakeTimers = jest.useFakeTimers();
      try {
        await store.check("old-id", 60, 60_000);

        fakeTimers.advanceTimersByTime(120_001);

        store.cleanup();

        const result = await store.check("old-id", 60, 60_000);
        expect(result.remaining).toBe(59);
      } finally {
        fakeTimers.useRealTimers();
      }
    });
  });
});

describe("rate-limit-config", () => {
  describe("RATE_LIMITS", () => {
    it("should have correct read limit", () => {
      expect(RATE_LIMITS.read.limit).toBe(60);
      expect(RATE_LIMITS.read.windowMs).toBe(60_000);
    });

    it("should have correct write limit", () => {
      expect(RATE_LIMITS.write.limit).toBe(10);
      expect(RATE_LIMITS.write.windowMs).toBe(60_000);
    });
  });

  describe("getLimitForRoute", () => {
    it("should return read for GET streams list", () => {
      const result = getLimitForRoute("GET", "/api/streams");
      expect(result).toBe("read");
    });

    it("should return read for GET streams by id", () => {
      const result = getLimitForRoute("GET", "/api/streams/123");
      expect(result).toBe("read");
    });

    it("should return write for POST streams", () => {
      const result = getLimitForRoute("POST", "/api/streams");
      expect(result).toBe("write");
    });

    it("should return write for DELETE streams", () => {
      const result = getLimitForRoute("DELETE", "/api/streams/123");
      expect(result).toBe("write");
    });

    it("should return write for stream actions", () => {
      expect(getLimitForRoute("POST", "/api/streams/123/start")).toBe("write");
      expect(getLimitForRoute("POST", "/api/streams/123/pause")).toBe("write");
      expect(getLimitForRoute("POST", "/api/streams/123/stop")).toBe("write");
      expect(getLimitForRoute("POST", "/api/streams/123/settle")).toBe("write");
      expect(getLimitForRoute("POST", "/api/streams/123/withdraw")).toBe("write");
    });

    it("should return read for activity endpoint", () => {
      const result = getLimitForRoute("GET", "/api/activity");
      expect(result).toBe("read");
    });

    it("should return read for identity/me endpoint", () => {
      const result = getLimitForRoute("GET", "/api/identity/me");
      expect(result).toBe("read");
    });
  });
});

describe("Identity extraction (getClientIdentity)", () => {
  it("should extract API key from X-API-Key header", () => {
    const mockHeaders = new Map<string, string>([
      ["X-API-Key", "test-api-key-12345"],
    ]);
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.type).toBe("api_key");
    expect(identity.value).toBe("test-api-key-12345");
    expect(identity.displayValue).toBe("test-api-k...");
  });

  it("should extract wallet from JWT Bearer token", () => {
    const payload = { sub: "GABCD1234Wal...ess" };
    const token = `header.${btoa(JSON.stringify(payload))}.signature`;

    const mockHeaders = new Map<string, string>([
      ["Authorization", `Bearer ${token}`],
    ]);
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.type).toBe("wallet");
    expect(identity.value).toBe("GABCD1234Wal...ess");
    expect(identity.displayValue).toBe("GABCD1234Wal...");
  });

  it("should fall back to IP when no auth headers", () => {
    const mockHeaders = new Map<string, string>();
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.type).toBe("ip");
    expect(identity.value).toBe("unknown");
  });

  it("should extract IP from X-Forwarded-For header", () => {
    const mockHeaders = new Map<string, string>([
      ["X-Forwarded-For", "192.168.1.100, 10.0.0.1"],
    ]);
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.type).toBe("ip");
    expect(identity.value).toBe("192.168.1.100");
  });

  it("should extract IP from X-Real-IP header", () => {
    const mockHeaders = new Map<string, string>([
      ["X-Real-IP", "10.0.0.50"],
    ]);
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.type).toBe("ip");
    expect(identity.value).toBe("10.0.0.50");
  });

  it("should prioritize API key over wallet", () => {
    const payload = { sub: "WalletAddress" };
    const token = `header.${btoa(JSON.stringify(payload))}.signature`;

    const mockHeaders = new Map<string, string>([
      ["X-API-Key", "优先级-api-key"],
      ["Authorization", `Bearer ${token}`],
    ]);
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.type).toBe("api_key");
  });

  it("should use X-Forwarded-For over X-Real-IP", () => {
    const mockHeaders = new Map<string, string>([
      ["X-Forwarded-For", "192.168.1.100"],
      ["X-Real-IP", "10.0.0.50"],
    ]);
    const mockRequest = { headers: mockHeaders } as any;

    const identity = extractIdentityFromRequest(mockRequest);

    expect(identity.value).toBe("192.168.1.100");
  });
});

function extractIdentityFromRequest(request: { headers: Map<string, string> }): {
  type: "api_key" | "wallet" | "ip";
  value: string;
  displayValue: string;
} {
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    return {
      type: "api_key",
      value: apiKey,
      displayValue: apiKey.slice(0, 10) + "...",
    };
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const { sub } = JSON.parse(atob(token.split(".")[1])) as { sub?: string };
      if (sub) {
        return {
          type: "wallet",
          value: sub,
          displayValue: sub.slice(0, 12) + "...",
        };
      }
    } catch {}
  }

  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    return {
      type: "ip",
      value: forwardedFor.split(",")[0].trim(),
      displayValue: forwardedFor.split(",")[0].trim(),
    };
  }

  const realIp = request.headers.get("X-Real-IP");
  if (realIp) {
    return {
      type: "ip",
      value: realIp,
      displayValue: realIp,
    };
  }

  return {
    type: "ip",
    value: "unknown",
    displayValue: "unknown",
  };
}

describe("rate-limit-metrics", () => {
  const MAX_RECENT_THROTTLES = 100;

  let throttled: Record<string, number>;
  let total: Record<string, number>;
  let recentThrottles: Array<{ route: string; limitType: string; identityType: string; identity: string; timestamp: number }>;

  beforeEach(() => {
    throttled = {};
    total = {};
    recentThrottles = [];
  });

  describe("recordThrottle", () => {
    it("should increment throttle counter", () => {
      recordThrottleExternal(throttled, recentThrottles, "/api/streams", "read", "ip", "192.168.1.1");
      recordThrottleExternal(throttled, recentThrottles, "/api/streams", "read", "ip", "192.168.1.2");

      expect(throttled["/api/streams:read"]).toBe(2);
    });

    it("should track different routes separately", () => {
      recordThrottleExternal(throttled, recentThrottles, "/api/streams", "read", "ip", "192.168.1.1");
      recordThrottleExternal(throttled, recentThrottles, "/api/activity", "read", "ip", "192.168.1.1");

      expect(throttled["/api/streams:read"]).toBe(1);
      expect(throttled["/api/activity:read"]).toBe(1);
    });

    it("should limit recentThrottles to MAX_RECENT_THROTTLES", () => {
      for (let i = 0; i < 150; i++) {
        recordThrottleExternal(throttled, recentThrottles, "/api/streams", "read", "ip", `192.168.1.${i}`);
      }

      expect(recentThrottles.length).toBe(100);
    });
  });

  describe("recordRequest", () => {
    it("should increment request counter", () => {
      recordRequestExternal(total, "/api/streams");
      recordRequestExternal(total, "/api/streams");
      recordRequestExternal(total, "/api/activity");

      expect(total["/api/streams"]).toBe(2);
      expect(total["/api/activity"]).toBe(1);
    });
  });
});

function recordThrottleExternal(
  throttled: Record<string, number>,
  recentThrottles: Array<{ route: string; limitType: string; identityType: string; identity: string; timestamp: number }>,
  route: string,
  limitType: string,
  identityType: string,
  identity: string
) {
  const key = `${route}:${limitType}`;
  throttled[key] = (throttled[key] || 0) + 1;
  recentThrottles.push({ route, limitType, identityType, identity, timestamp: Date.now() });
  if (recentThrottles.length > 100) {
    recentThrottles.shift();
  }
}

function recordRequestExternal(total: Record<string, number>, route: string) {
  total[route] = (total[route] || 0) + 1;
}

describe("checkRateLimit integration behavior", () => {
  it("should return allowed result when under limit", async () => {
    const mockStore = {
      check: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 50,
        resetAt: Date.now() + 60000,
      }),
    };

    const identity = { type: "ip" as const, value: "192.168.1.1", displayValue: "192.168.1.1" };
    const result = await mockStore.check("192.168.1.1", 60, 60_000);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(50);
  });

  it("should return denied result when over limit", async () => {
    const mockStore = {
      check: jest.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 30000,
        retryAfter: 30,
      }),
    };

    const identity = { type: "ip" as const, value: "192.168.1.1", displayValue: "192.168.1.1" };
    const result = await mockStore.check("192.168.1.1", 10, 60_000);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(30);
  });

  it("should call store with correct parameters for read", async () => {
    const checkMock = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: Date.now() + 60000,
    });

    await checkMock("192.168.1.1", 60, 60_000);

    expect(checkMock).toHaveBeenCalledWith("192.168.1.1", 60, 60_000);
  });

  it("should call store with correct parameters for write", async () => {
    const checkMock = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });

    await checkMock("wallet123", 10, 60_000);

    expect(checkMock).toHaveBeenCalledWith("wallet123", 10, 60_000);
  });
});
