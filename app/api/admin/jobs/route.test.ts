/** @jest-environment node */
import { GET } from "./route";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { settlementQueue, webhookQueue, retryQueue } from "@/app/lib/queue";
import { NextResponse } from "next/server";

jest.mock("@/app/lib/internal-service-auth", () => ({
  requireInternalServiceAuth: jest.fn(),
}));

jest.mock("@/app/lib/auth", () => ({
  tryAuthenticateRequest: jest.fn(),
}));

jest.mock("@/app/lib/queue", () => ({
  settlementQueue: { getAllJobs: jest.fn() },
  webhookQueue:    { getAllJobs: jest.fn() },
  retryQueue:      { getAllJobs: jest.fn() },
}));

const makeMockAuthFailure = () =>
  NextResponse.json(
    { error: { code: "INTERNAL_AUTH_REQUIRED", message: "Auth required" } },
    { status: 401 },
  );

const emptyQueue = () => [];

const sampleJob = (overrides: Partial<{
  id: string; attempts: number; maxAttempts: number;
}> = {}) => ({
  id:               overrides.id ?? "job-abc-123",
  queueName:        "settlement-queue",
  attempts:         overrides.attempts ?? 0,
  maxAttempts:      overrides.maxAttempts ?? 3,
  createdAt:        "2024-01-01T00:00:00.000Z",
  correlationContext: { correlation_id: "corr-1", request_id: "req-1" },
});

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/admin/jobs", {
    method: "GET",
    headers,
  });
}

describe("GET /api/admin/jobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (settlementQueue.getAllJobs as jest.Mock).mockReturnValue(emptyQueue());
    (webhookQueue.getAllJobs as jest.Mock).mockReturnValue(emptyQueue());
    (retryQueue.getAllJobs as jest.Mock).mockReturnValue(emptyQueue());
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it("returns 401 when internal-service auth fails and no admin JWT is present", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(makeMockAuthFailure());
    (tryAuthenticateRequest as jest.Mock).mockReturnValue(null);

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error?.code).toBe("INTERNAL_AUTH_REQUIRED");
  });

  it("allows access when internal-service auth succeeds", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
  });

  it("allows access when admin JWT is present (role admin)", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(makeMockAuthFailure());
    (tryAuthenticateRequest as jest.Mock).mockReturnValue({
      walletAddress: "GB...",
      actorId: "admin-1",
      role: "admin",
    });

    const response = await GET(makeRequest({ Authorization: "Bearer admin-token" }));

    expect(response.status).toBe(200);
  });

  it("returns 401 when JWT is present but role is not admin", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(makeMockAuthFailure());
    (tryAuthenticateRequest as jest.Mock).mockReturnValue({
      walletAddress: "GB...",
      actorId: "user-1",
      role: "user",
    });

    const response = await GET(makeRequest({ Authorization: "Bearer user-token" }));

    expect(response.status).toBe(401);
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  it("returns correct top-level keys in response body", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({ serviceName: "admin-cli" });

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body).toHaveProperty("data.queues");
    expect(body).toHaveProperty("data.totals");
  });

  it("returns all three queue names", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({ serviceName: "admin-cli" });

    const response = await GET(makeRequest());
    const body = await response.json();
    const queueKeys = Object.keys(body.data.queues);

    expect(queueKeys).toContain("settlement-queue");
    expect(queueKeys).toContain("webhook-queue");
    expect(queueKeys).toContain("retry-queue");
  });

  it("totals reflect jobs across all queues", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({ serviceName: "admin-cli" });
    (settlementQueue.getAllJobs as jest.Mock).mockReturnValue([sampleJob()]);
    (webhookQueue.getAllJobs as jest.Mock).mockReturnValue([sampleJob({ id: "job-2" })]);
    (retryQueue.getAllJobs as jest.Mock).mockReturnValue(emptyQueue());

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.data.totals.total).toBe(2);
    expect(body.data.totals.pending).toBe(2);
    expect(body.data.totals.failed).toBe(0);
  });

  it("marks a job as failed when attempts >= maxAttempts", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({ serviceName: "admin-cli" });
    (retryQueue.getAllJobs as jest.Mock).mockReturnValue([
      sampleJob({ id: "job-failed", attempts: 3, maxAttempts: 3 }),
    ]);

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.data.totals.failed).toBe(1);
    expect(body.data.totals.pending).toBe(0);
    const failedJob = body.data.queues["retry-queue"].jobs[0];
    expect(failedJob.failed).toBe(true);
  });

  it("returns the auth error body from the auth layer directly", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(makeMockAuthFailure());
    (tryAuthenticateRequest as jest.Mock).mockReturnValue(null);

    const response = await GET(makeRequest());
    const body = await response.json();

    // The auth layer returns its own response; the code/message should be intact.
    expect(body.error?.code).toBe("INTERNAL_AUTH_REQUIRED");
    expect(response.status).toBe(401);
  });
});
