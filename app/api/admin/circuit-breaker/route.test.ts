/** @jest-environment node */
import { POST, GET } from "./route";
import { _resetAdminStateForTesting } from "@/app/lib/admin-guard";

const ADMIN_ADDRESS = "GADMIN_TEST_ADDRESS_12345";

/** Build a request with the test admin wallet address header. */
function makeRequest(
  method: "POST" | "GET",
  body?: Record<string, unknown>,
): Request {
  return new Request("http://localhost/api/admin/circuit-breaker", {
    method,
    headers: {
      "Content-Type": "application/json",
      "Actor-Wallet-Address": ADMIN_ADDRESS,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Build a request without admin credentials. */
function makeUnauthorizedRequest(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/admin/circuit-breaker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  _resetAdminStateForTesting(ADMIN_ADDRESS);
});

describe("POST /api/admin/circuit-breaker", () => {
  it("trips the indexer circuit breaker and returns updated state", async () => {
    const request = makeRequest("POST", { target: "indexer", open: true });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.indexer.open).toBe(true);
    expect(body.data.indexer.updatedAt).not.toBeNull();
    expect(body.data.webhook.open).toBe(false);
  });

  it("resets the webhook circuit breaker after tripping it", async () => {
    // First trip it
    await POST(makeRequest("POST", { target: "webhook", open: true }));
    // Then reset
    const response = await POST(makeRequest("POST", { target: "webhook", open: false }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.webhook.open).toBe(false);
  });

  it("returns 422 when target is missing", async () => {
    const response = await POST(makeRequest("POST", { open: true }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when target is invalid", async () => {
    const response = await POST(makeRequest("POST", { target: "unknown-system", open: true }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when body is not valid JSON", async () => {
    const request = new Request("http://localhost/api/admin/circuit-breaker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Actor-Wallet-Address": ADMIN_ADDRESS,
      },
      body: "not-json{{",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 403 when caller is not the admin", async () => {
    const response = await POST(makeUnauthorizedRequest({ target: "indexer", open: true }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("Unauthorized");
  });
});

describe("GET /api/admin/circuit-breaker", () => {
  it("returns all circuit breaker states for the admin", async () => {
    const response = await GET(makeRequest("GET"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty("indexer");
    expect(body.data).toHaveProperty("webhook");
    expect(body.data.indexer.open).toBe(false);
    expect(body.data.webhook.open).toBe(false);
  });

  it("returns 403 for unauthenticated GET requests", async () => {
    const request = new Request("http://localhost/api/admin/circuit-breaker", {
      method: "GET",
    });
    const response = await GET(request);
    expect(response.status).toBe(403);
  });
});
