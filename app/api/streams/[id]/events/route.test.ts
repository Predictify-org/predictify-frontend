import { GET } from "./route";
import { db, resetDb, getStore } from "@/app/lib/db";
import { eventBus } from "@/app/lib/event-bus";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@/app/lib/auth";

const TEST_JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

describe("GET /api/streams/:id/events (SSE)", () => {
  beforeEach(() => {
    resetDb();
    jest.clearAllMocks();
  });

  function createAuthToken(walletAddress: string, role: string = "user"): string {
    return jwt.sign(
      { 
        sub: walletAddress, 
        role, 
        actorId: walletAddress,
        iss: "streampay", 
        aud: "streampay-api" 
      },
      TEST_JWT_SECRET,
      { expiresIn: "1h" }
    );
  }

  it("returns 401 if no authorization header is provided", async () => {
    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { "x-tenant-id": "tenant-1" },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res).toBeDefined();
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 if authorization header is malformed", async () => {
    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": "InvalidFormat",
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res).toBeDefined();
    expect(res.status).toBe(401);
  });

  it("returns 401 if JWT token is invalid", async () => {
    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": "Bearer invalid-token",
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(401);
  });

  it("returns 422 if stream ID is empty", async () => {
    const token = createAuthToken("GD7H...3J4K");
    const req = new Request("http://localhost/api/streams/ /events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: " " }) });
    expect(res.status).toBe(422);
    
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 if tenant ID header is missing", async () => {
    const token = createAuthToken("GD7H...3J4K");
    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(400);
    
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT");
  });

  it("returns 400 if tenant ID header is empty", async () => {
    const token = createAuthToken("GD7H...3J4K");
    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "   ",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(400);
    
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT");
  });

  it("returns 404 if stream does not exist", async () => {
    const token = createAuthToken("GD7H...3J4K");
    const req = new Request("http://localhost/api/streams/nonexistent/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
    
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 if user does not own the stream", async () => {
    // Create a stream owned by a different wallet
    const { streamRepository } = getStore();
    streamRepository.streams.set("stream-ada", {
      id: "stream-ada",
      recipient: "GDOTHERWALLETADDRESS",
      rate: "120 XLM / month",
      schedule: "Pays every 30 days",
      status: "active",
      nextAction: "pause",
      createdAt: "2026-04-01T09:00:00Z",
      updatedAt: "2026-04-28T10:30:00Z",
      token: "XLM",
    });

    const token = createAuthToken("GD7H...3J4K"); // Different wallet
    const req = new Request("http://localhost/api/streams/stream-ada/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(403);
    
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 200 and establishes SSE for authorized user (stream owner)", async () => {
    const { streamRepository } = getStore();
    const walletAddress = "GD7H...3J4K";
    
    streamRepository.streams.set("stream-ada", {
      id: "stream-ada",
      recipient: walletAddress,
      rate: "120 XLM / month",
      schedule: "Pays every 30 days",
      status: "active",
      nextAction: "pause",
      createdAt: "2026-04-01T09:00:00Z",
      updatedAt: "2026-04-28T10:30:00Z",
      token: "XLM",
    });

    const token = createAuthToken(walletAddress);
    const req = new Request("http://localhost/api/streams/stream-ada/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(res.headers.get("Connection")).toBe("keep-alive");
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
    expect(res.headers.get("X-Correlation-ID")).toBeTruthy();
  });

  it("returns 200 and establishes SSE for admin user (any stream)", async () => {
    const { streamRepository } = getStore();
    
    streamRepository.streams.set("stream-ada", {
      id: "stream-ada",
      recipient: "GDOTHERWALLETADDRESS",
      rate: "120 XLM / month",
      schedule: "Pays every 30 days",
      status: "active",
      nextAction: "pause",
      createdAt: "2026-04-01T09:00:00Z",
      updatedAt: "2026-04-28T10:30:00Z",
      token: "XLM",
    });

    const token = createAuthToken("GDADMIN...ADMIN", "admin");
    const req = new Request("http://localhost/api/streams/stream-ada/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("includes correlation IDs in response headers", async () => {
    const { streamRepository } = getStore();
    const walletAddress = "GD7H...3J4K";
    
    streamRepository.streams.set("stream-ada", {
      id: "stream-ada",
      recipient: walletAddress,
      rate: "120 XLM / month",
      schedule: "Pays every 30 days",
      status: "active",
      nextAction: "pause",
      createdAt: "2026-04-01T09:00:00Z",
      updatedAt: "2026-04-28T10:30:00Z",
      token: "XLM",
    });

    const token = createAuthToken(walletAddress);
    const correlationId = "test-correlation-123";
    const req = new Request("http://localhost/api/streams/stream-ada/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
        "x-correlation-id": correlationId,
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-ada" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Correlation-ID")).toBe(correlationId);
  });

  it("includes request_id in error responses", async () => {
    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { "x-tenant-id": "tenant-1" },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error.request_id).toBeTruthy();
    expect(typeof body.error.request_id).toBe("string");
  });

  it("handles JWT with missing required claims", async () => {
    // Create a token without required claims
    const token = jwt.sign(
      { sub: "GD7H...3J4K" }, // Missing iss and aud
      TEST_JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(401);
  });

  it("handles JWT with wrong issuer", async () => {
    const token = jwt.sign(
      { 
        sub: "GD7H...3J4K",
        iss: "wrong-issuer",
        aud: "streampay-api",
      },
      TEST_JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(401);
  });

  it("handles JWT with wrong audience", async () => {
    const token = jwt.sign(
      { 
        sub: "GD7H...3J4K",
        iss: "streampay",
        aud: "wrong-audience",
      },
      TEST_JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = new Request("http://localhost/api/streams/stream-123/events", {
      headers: { 
        "authorization": `Bearer ${token}`,
        "x-tenant-id": "tenant-1",
      },
    }) as any;
    
    const res = await GET(req, { params: Promise.resolve({ id: "stream-123" }) });
    expect(res.status).toBe(401);
  });
});
