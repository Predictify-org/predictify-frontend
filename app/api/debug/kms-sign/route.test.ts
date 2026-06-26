/** @jest-environment node */
import { POST } from "./route";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { NextResponse } from "next/server";

// Mock the dependencies
const mockSigner = {
  getProviderName: () => "local-mock",
  sign: jest.fn().mockResolvedValue(Buffer.from("mock-signature")),
  getPublicKey: jest.fn().mockResolvedValue("mock-public-key"),
};

jest.mock("../../../lib/kms/factory", () => ({
  getSigner: () => mockSigner,
}));

jest.mock("../../../lib/internal-service-auth", () => ({
  requireInternalServiceAuth: jest.fn(),
}));

describe("KMS Debug Sign Route", () => {
  let originalNodeEnv: string | undefined;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (process.env as any).NODE_ENV = "development";
  });

  it("returns 404 NOT_FOUND error envelope in production", async () => {
    (process.env as any).NODE_ENV = "production";
    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      body: JSON.stringify({ payload: "hello" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);
    
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
    expect(body.status).toBe(404);
  });

  it("returns 404 NOT_FOUND error envelope when internal auth fails", async () => {
    // requireInternalServiceAuth returns a NextResponse (like a 404 / 401 response) if auth fails
    const mockAuthFailureResponse = NextResponse.json({ error: "Auth failed" }, { status: 404 });
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue(mockAuthFailureResponse);

    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      body: JSON.stringify({ payload: "hello" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
    expect(body.status).toBe(404);
  });

  it("signs request successfully when auth is valid", async () => {
    // requireInternalServiceAuth returns the identity details on success
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "debug-client",
      keyId: "current",
      timestamp: new Date().toISOString(),
    });

    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      body: JSON.stringify({ payload: "hello world" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.provider).toBe("local-mock");
    expect(body.publicKey).toBe("mock-public-key");
    expect(body.signature).toBe(Buffer.from("mock-signature").toString("hex"));
  });

  it("returns 422 INVALID_REQUEST error envelope when content-length header is too large", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "debug-client",
    });

    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      headers: {
        "content-length": String(16 * 1024 + 2000),
      },
      body: JSON.stringify({ payload: "hello" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.code).toBe("INVALID_REQUEST");
    expect(body.status).toBe(422);
  });

  it("returns 422 INVALID_FIELD_VALUE error envelope when payload size exceeds 16KB", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "debug-client",
    });

    // Create a payload larger than 16KB (16 * 1024 bytes)
    const largePayload = "a".repeat(16 * 1024 + 1);
    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      body: JSON.stringify({ payload: largePayload }),
    });

    const response = await POST(request);
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.code).toBe("INVALID_FIELD_VALUE");
    expect(body.status).toBe(422);
  });

  it("returns 400 MISSING_REQUIRED_FIELD error envelope when payload is empty", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "debug-client",
    });

    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      body: JSON.stringify({ payload: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.code).toBe("MISSING_REQUIRED_FIELD");
    expect(body.status).toBe(400);
  });

  it("returns 422 INVALID_REQUEST error envelope when payload is not a string", async () => {
    (requireInternalServiceAuth as jest.Mock).mockResolvedValue({
      serviceName: "debug-client",
    });

    const request = new Request("http://localhost/api/debug/kms-sign", {
      method: "POST",
      body: JSON.stringify({ payload: 12345 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.code).toBe("INVALID_REQUEST");
    expect(body.status).toBe(422);
  });
});
