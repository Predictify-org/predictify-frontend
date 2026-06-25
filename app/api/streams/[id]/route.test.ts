/** @jest-environment node */
import { GET, POST, DELETE } from "./route";
import { db, resetDb } from "@/app/lib/db";
import { createCache } from "@/app/lib/cache";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";

describe("Stream Details Route - GET /api/streams/:id and mutations", () => {
  const streamId = "stream-ada";
  const tenantId = "org-acme";

  beforeEach(async () => {
    resetDb();
    resetRateLimitStore();

    // Populate tenant field on the stream in DB for testing finding by tenant
    const stream = db.streams.get(streamId);
    if (stream) {
      (stream as any).tenant = tenantId;
      db.streams.set(streamId, stream);
    }

    // Set default cache state (disabled by default in tests)
    process.env.STREAMPAY_CACHE_DISABLED = "true";
  });

  it("returns 400 Bad Request if tenant ID is empty/missing", async () => {
    const req = new Request(`http://localhost/api/streams/${streamId}`, {
      method: "GET",
      headers: {}, // no x-tenant-id
    });
    const res = await GET(req, { params: Promise.resolve({ id: streamId }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_TENANT");
  });

  it("handles GET cache HIT and MISS correctly", async () => {
    // Enable cache specifically for this test
    process.env.STREAMPAY_CACHE_DISABLED = "false";
    
    // We want to verify cache hits.
    // First, let's spy on streamCache methods to delegate to a live cache
    const mod = await import("@/app/lib/cache");
    const liveCache = createCache<any>("stream", 300000);
    
    const getSpy = jest.spyOn(mod.streamCache, "get").mockImplementation((t, id) => liveCache.get(t, id));
    const setSpy = jest.spyOn(mod.streamCache, "set").mockImplementation((t, id, v) => liveCache.set(t, id, v));
    const invalidateSpy = jest.spyOn(mod.streamCache, "invalidate").mockImplementation((t, id) => liveCache.invalidate(t, id));

    try {
      // First request -> Cache MISS
      const req1 = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "GET",
        headers: { "x-tenant-id": tenantId },
      });
      const res1 = await GET(req1, { params: Promise.resolve({ id: streamId }) });
      expect(res1.status).toBe(200);
      expect(res1.headers.get("X-Cache")).toBe("MISS");
      expect(getSpy).toHaveBeenCalledWith(tenantId, streamId);
      expect(setSpy).toHaveBeenCalled();

      // Second request -> Cache HIT
      const req2 = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "GET",
        headers: { "x-tenant-id": tenantId },
      });
      const res2 = await GET(req2, { params: Promise.resolve({ id: streamId }) });
      expect(res2.status).toBe(200);
      expect(res2.headers.get("X-Cache")).toBe("HIT");
      
      const body = await res2.json();
      expect(body.data.id).toBe(streamId);
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
      invalidateSpy.mockRestore();
    }
  });

  it("enforces cross-tenant isolation on DB reads", async () => {
    const req = new Request(`http://localhost/api/streams/${streamId}`, {
      method: "GET",
      headers: { "x-tenant-id": "wrong-tenant" },
    });
    const res = await GET(req, { params: Promise.resolve({ id: streamId }) });
    expect(res.status).toBe(404);
  });

  it("invalidates cache on POST and DELETE mutations", async () => {
    process.env.STREAMPAY_CACHE_DISABLED = "false";

    const mod = await import("@/app/lib/cache");
    const liveCache = createCache<any>("stream", 300000);
    
    // Seed liveCache
    const stream = db.streams.get(streamId)!;
    liveCache.set(tenantId, streamId, stream);

    const getSpy = jest.spyOn(mod.streamCache, "get").mockImplementation((t, id) => liveCache.get(t, id));
    const invalidateSpy = jest.spyOn(mod.streamCache, "invalidate").mockImplementation((t, id) => liveCache.invalidate(t, id));

    try {
      // Verify cached initially
      expect(liveCache.get(tenantId, streamId)).not.toBeNull();

      // POST updates stream and invalidates cache
      const reqPOST = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "POST",
        headers: { "x-tenant-id": tenantId, "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Updated Label" }),
      });
      const resPOST = await POST(reqPOST, { params: Promise.resolve({ id: streamId }) });
      expect(resPOST.status).toBe(200);
      expect(invalidateSpy).toHaveBeenCalledWith(tenantId, streamId);
      expect(liveCache.get(tenantId, streamId)).toBeNull();

      // Seed cache again
      liveCache.set(tenantId, streamId, stream);

      // DELETE deletes stream and invalidates cache
      // Make stream deletable (not active/paused)
      const nonActiveStream = { ...stream, status: "ended" as const };
      db.streams.set(streamId, nonActiveStream);
      liveCache.set(tenantId, streamId, nonActiveStream);

      const reqDELETE = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenantId },
      });
      const resDELETE = await DELETE(reqDELETE, { params: Promise.resolve({ id: streamId }) });
      expect(resDELETE.status).toBe(204);
      expect(invalidateSpy).toHaveBeenCalledWith(tenantId, streamId);
      expect(liveCache.get(tenantId, streamId)).toBeNull();
    } finally {
      getSpy.mockRestore();
      invalidateSpy.mockRestore();
    }
  });

  it("handles non-existent streams in POST/DELETE", async () => {
    const reqPOST = new Request(`http://localhost/api/streams/non-existent`, {
      method: "POST",
      headers: { "x-tenant-id": tenantId, "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Updated Label" }),
    });
    const resPOST = await POST(reqPOST, { params: Promise.resolve({ id: "non-existent" }) });
    expect(resPOST.status).toBe(404);

    const reqDELETE = new Request(`http://localhost/api/streams/non-existent`, {
      method: "DELETE",
      headers: { "x-tenant-id": tenantId },
    });
    const resDELETE = await DELETE(reqDELETE, { params: Promise.resolve({ id: "non-existent" }) });
    expect(resDELETE.status).toBe(404);
  });

  it("handles malformed JSON body in POST", async () => {
    const reqPOST = new Request(`http://localhost/api/streams/${streamId}`, {
      method: "POST",
      headers: { "x-tenant-id": tenantId, "Content-Type": "application/json" },
      body: "invalid-json",
    });
    const resPOST = await POST(reqPOST, { params: Promise.resolve({ id: streamId }) });
    expect(resPOST.status).toBe(400);
  });
});
