/** @jest-environment node */
import { POST } from "./route";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { webhookDeliveryWorker } from "@/app/lib/webhook-delivery-worker";
import { NextResponse } from "next/server";

jest.mock("@/app/lib/internal-service-auth", () => ({
  requireInternalServiceAuth: jest.fn(),
}));

jest.mock("@/app/lib/auth", () => ({
  tryAuthenticateRequest: jest.fn(),
}));

jest.mock("@/app/lib/webhook-delivery-worker", () => ({
  webhookDeliveryWorker: {
    reissueDelivery: jest.fn(),
  },
}));

const mockAuthFailureResponse = NextResponse.json(
  { error: { code: "INTERNAL_AUTH_REQUIRED", message: "Auth required" } },
  { status: 401 },
);

const mockDeliveryWorker = webhookDeliveryWorker as {
  reissueDelivery: jest.Mock;
};

describe("POST /api/admin/webhooks/redeliver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth tests ─────────────────────────────────────────────────────────────

  it("returns 401 when internal-service auth fails and no admin JWT is present", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(mockAuthFailureResponse);
    (tryAuthenticateRequest as jest.Mock).mockReturnValue(null);

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-123" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error?.code).toBe("INTERNAL_AUTH_REQUIRED");
  });

  it("allows access when internal-service auth succeeds", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
      keyId: "current",
      timestamp: new Date().toISOString(),
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: true,
      newDeliveryId: "redeliver-new-uuid",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-123" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("allows access when admin JWT is present (role admin)", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(mockAuthFailureResponse);
    (tryAuthenticateRequest as jest.Mock).mockReturnValue({
      walletAddress: "GB..." as string,
      actorId: "admin-1" as string,
      role: "admin" as const,
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: true,
      newDeliveryId: "redeliver-new-uuid",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-123" }),
      headers: { Authorization: "Bearer some-admin-token" },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 401 when JWT is present but role is not admin", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(mockAuthFailureResponse);
    (tryAuthenticateRequest as jest.Mock).mockReturnValue({
      walletAddress: "GB..." as string,
      actorId: "user-1" as string,
      role: "user" as const,
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-123" }),
      headers: { Authorization: "Bearer some-user-token" },
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  // ── Body parsing / validation tests ───────────────────────────────────────

  it("returns 400 for malformed JSON body", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: "not-json",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error?.code).toBe("INVALID_REQUEST_BODY");
  });

  it("returns 400 for missing deliveryId in body", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for empty deliveryId in body", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("accepts extra unexpected fields in body", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: true,
      newDeliveryId: "redeliver-new-uuid",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-123", extraField: "should not cause issues" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  // ── Worker interaction tests ──────────────────────────────────────────────

  it("calls reissueDelivery with the deliveryId from the body", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: true,
      newDeliveryId: "redeliver-new-uuid",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-456" }),
    });
    await POST(request);

    expect(mockDeliveryWorker.reissueDelivery).toHaveBeenCalledTimes(1);
    expect(mockDeliveryWorker.reissueDelivery).toHaveBeenCalledWith("del-456");
  });

  it("returns 200 with newDeliveryId on successful redelivery", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: true,
      newDeliveryId: "redeliver-abc-123",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-789" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data?.deliveryId).toBe("redeliver-abc-123");
    expect(body.data?.originalDeliveryId).toBe("del-789");
  });

  it("returns 404 when worker reports delivery not found", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: false,
      error: "Delivery 'del-999' not found.",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-999" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error?.code).toBe("DELIVERY_NOT_FOUND");
  });

  it("returns 400 when worker reports delivery lacks snapshots", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "admin-cli",
    });
    mockDeliveryWorker.reissueDelivery.mockResolvedValue({
      ok: false,
      error: "Delivery 'del-old' does not have full event/endpoint data.",
    });

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-old" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error?.code).toBe("DELIVERY_NO_SNAPSHOT");
  });

  it("includes request_id in the error envelope", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(mockAuthFailureResponse);
    (tryAuthenticateRequest as jest.Mock).mockReturnValue(null);

    const request = new Request("http://localhost/api/admin/webhooks/redeliver", {
      method: "POST",
      body: JSON.stringify({ deliveryId: "del-123" }),
    });
    const response = await POST(request);

    const body = await response.json();
    expect(body.error?.request_id).toBeDefined();
    expect(typeof body.error.request_id).toBe("string");
  });
});
