import { checkIpRateLimit, rateLimitResponse, WALLET_RATE_LIMITS } from "./rateLimitIp";
import { InMemoryRateLimitStore } from "@/app/lib/rate-limit-store";
import { resetMetrics } from "@/app/lib/rate-limit-metrics";

jest.mock("next/server", () => ({
  NextResponse: {
    json: <T>(body: T, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      body,
      headers: init?.headers ?? {},
      json: async () => body,
    }),
  },
}));

function makeRequest(ipHeader?: string, ipValue?: string) {
  const headers = new Map<string, string>();
  if (ipHeader && ipValue) {
    headers.set(ipHeader, ipValue);
  }
  return {
    headers,
    nextUrl: { pathname: "/api/auth/wallet" },
  } as any;
}

beforeEach(() => {
  resetMetrics();
});

describe("WALLET_RATE_LIMITS", () => {
  it("should have correct challenge limit", () => {
    expect(WALLET_RATE_LIMITS.challenge.limit).toBe(20);
    expect(WALLET_RATE_LIMITS.challenge.windowMs).toBe(60_000);
  });

  it("should have correct login limit", () => {
    expect(WALLET_RATE_LIMITS.login.limit).toBe(5);
    expect(WALLET_RATE_LIMITS.login.windowMs).toBe(60_000);
  });
});

describe("checkIpRateLimit", () => {
  it("should allow requests under the limit", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest();
    const result = await checkIpRateLimit(req, "login", store);
    expect(result.allowed).toBe(true);
    store.destroy();
  });

  it("should deny when limit is exhausted for login", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest();
    const limit = WALLET_RATE_LIMITS.login.limit;

    for (let i = 0; i < limit; i++) {
      const res = await checkIpRateLimit(req, "login", store);
      expect(res.allowed).toBe(true);
    }

    const blocked = await checkIpRateLimit(req, "login", store);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeDefined();
    expect(blocked.retryAfter).toBeGreaterThan(0);
    store.destroy();
  });

  it("should deny when limit is exhausted for challenge", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest();
    const limit = WALLET_RATE_LIMITS.challenge.limit;

    for (let i = 0; i < limit; i++) {
      const res = await checkIpRateLimit(req, "challenge", store);
      expect(res.allowed).toBe(true);
    }

    const blocked = await checkIpRateLimit(req, "challenge", store);
    expect(blocked.allowed).toBe(false);
    store.destroy();
  });

  it("should track different IPs separately", async () => {
    const store = new InMemoryRateLimitStore();
    const req1 = makeRequest("x-forwarded-for", "1.1.1.1");
    const req2 = makeRequest("x-forwarded-for", "2.2.2.2");

    for (let i = 0; i < 5; i++) {
      await checkIpRateLimit(req1, "login", store);
    }

    const result1 = await checkIpRateLimit(req1, "login", store);
    expect(result1.allowed).toBe(false);

    const result2 = await checkIpRateLimit(req2, "login", store);
    expect(result2.allowed).toBe(true);
    store.destroy();
  });

  it("should use x-forwarded-for header for IP extraction", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest("x-forwarded-for", "203.0.113.50, 10.0.0.1");
    const result = await checkIpRateLimit(req, "login", store);
    expect(result.allowed).toBe(true);
    store.destroy();
  });

  it("should use x-real-ip as fallback", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest("x-real-ip", "10.0.0.99");
    const result = await checkIpRateLimit(req, "login", store);
    expect(result.allowed).toBe(true);
    store.destroy();
  });

  it("should default to 'unknown' when no IP headers present", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest();
    const result = await checkIpRateLimit(req, "login", store);
    expect(result.allowed).toBe(true);
    store.destroy();
  });

  it("should recover after the window expires", async () => {
    jest.useFakeTimers();
    const store = new InMemoryRateLimitStore();
    const req = makeRequest();

    for (let i = 0; i < 5; i++) {
      await checkIpRateLimit(req, "login", store);
    }

    let blocked = await checkIpRateLimit(req, "login", store);
    expect(blocked.allowed).toBe(false);

    jest.advanceTimersByTime(60_001);

    const recovered = await checkIpRateLimit(req, "login", store);
    expect(recovered.allowed).toBe(true);

    jest.useRealTimers();
    store.destroy();
  });
});

describe("rateLimitResponse", () => {
  it("should return 429 with correct error envelope", () => {
    const res = rateLimitResponse(30);
    expect(res.status).toBe(429);
    expect((res as any).body.error.code).toBe("rate_limit_exceeded");
    expect((res as any).body.error.message).toBe("Too many requests. Please try again later.");
  });

  it("should set Retry-After header", () => {
    const res = rateLimitResponse(45);
    expect((res as any).headers["Retry-After"]).toBe("45");
  });
});

describe("rate limit isolation between limit types", () => {
  it("should track challenge and login limits separately for same IP", async () => {
    const store = new InMemoryRateLimitStore();
    const req = makeRequest();

    for (let i = 0; i < 20; i++) {
      const res = await checkIpRateLimit(req, "challenge", store);
      if (i < 20) expect(res.allowed).toBe(true);
    }

    const challengeBlocked = await checkIpRateLimit(req, "challenge", store);
    expect(challengeBlocked.allowed).toBe(false);

    const loginAllowed = await checkIpRateLimit(req, "login", store);
    expect(loginAllowed.allowed).toBe(true);

    store.destroy();
  });
});
