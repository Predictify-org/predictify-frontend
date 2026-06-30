/**
 * Tests for GET /api/metrics — token-gated Prometheus metrics endpoint.
 */

import { GET } from "./route";
import { recordRequest, recordThrottle, resetMetrics } from "@/app/lib/rate-limit-metrics";

const TOKEN = "test-metrics-token-123";

function makeRequest(authorization?: string): Request {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) headers.authorization = authorization;
  return new Request("http://localhost/api/metrics", { method: "GET", headers });
}

describe("GET /api/metrics", () => {
  const originalToken = process.env.METRICS_AUTH_TOKEN;

  beforeEach(() => {
    resetMetrics();
    process.env.METRICS_AUTH_TOKEN = TOKEN;
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.METRICS_AUTH_TOKEN;
    else process.env.METRICS_AUTH_TOKEN = originalToken;
  });

  it("returns 503 when no token is configured", async () => {
    delete process.env.METRICS_AUTH_TOKEN;
    const res = await GET(makeRequest(`Bearer ${TOKEN}`));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("METRICS_DISABLED");
  });

  it("returns 401 when the Authorization header is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe("Bearer");
  });

  it("returns 401 when the Authorization header is malformed", async () => {
    const res = await GET(makeRequest("Token abc"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the token is incorrect", async () => {
    const res = await GET(makeRequest("Bearer wrong-token"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns Prometheus metrics for a valid token", async () => {
    recordRequest("/api/streams");
    recordRequest("/api/streams");
    recordThrottle("/api/streams", "perMinute", "wallet", "GABC");

    const res = await GET(makeRequest(`Bearer ${TOKEN}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toContain("# TYPE streampay_requests_total counter");
    expect(text).toContain('streampay_requests_total{route="/api/streams"} 2');
    expect(text).toContain(
      'streampay_rate_limit_throttled_total{route="/api/streams",limit_type="perMinute"} 1'
    );
    expect(text).toContain("streampay_metrics_up 1");
  });

  it("accepts a case-insensitive bearer scheme", async () => {
    const res = await GET(makeRequest(`bearer ${TOKEN}`));
    expect(res.status).toBe(200);
  });
});
