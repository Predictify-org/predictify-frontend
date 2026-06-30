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

    const getSpy = jest.spyOn(mod.streamCache, "get").mockImplementation((t, id, n) => liveCache.get(t, id, n));
    const setSpy = jest.spyOn(mod.streamCache, "set").mockImplementation((t, id, v, n) => liveCache.set(t, id, v, n));
    const invalidateSpy = jest.spyOn(mod.streamCache, "invalidate").mockImplementation((t, id, n) => liveCache.invalidate(t, id, n));

    try {
      // First request -> Cache MISS
      const req1 = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "GET",
        headers: { "x-tenant-id": tenantId },
      });
      const res1 = await GET(req1, { params: Promise.resolve({ id: streamId }) });
      expect(res1.status).toBe(200);
      expect(res1.headers.get("X-Cache")).toBe("MISS");
      expect(getSpy).toHaveBeenCalledWith(tenantId, streamId, "testnet");
      expect(setSpy).toHaveBeenCalledWith(tenantId, streamId, expect.anything(), "testnet");

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

  it("does not leak cache across networks (network-segmented keys)",
    async () => {
    process.env.STREAMPAY_CACHE_DISABLED = "false";

    // Simulate the bug scenario: data was cached under testnet, then the
    // process config switches to mainnet. The route MUST NOT return the
    // testnet entry on the next GET — i.e. the cache is partitioned by
    // network, not by stream-id alone. NB: this test only proves cache
    // partitioning, not that the DB returns network-specific data.
    const mod = await import("@/app/lib/cache");
    const liveCache = createCache<any>("stream", 300000);

    const getSpy = jest.spyOn(mod.streamCache, "get").mockImplementation((t, id, n) => liveCache.get(t, id, n));
    const setSpy = jest.spyOn(mod.streamCache, "set").mockImplementation((t, id, v, n) => liveCache.set(t, id, v, n));

    const previousNetwork = process.env.STELLAR_NETWORK;
    try {
      // 1) Fetch on testnet -> cache populated under network="testnet"
      process.env.STELLAR_NETWORK = "testnet";
      const reqTestnet = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "GET",
        headers: { "x-tenant-id": tenantId },
      });
      const resTestnet = await GET(reqTestnet, { params: Promise.resolve({ id: streamId }) });
      expect(resTestnet.status).toBe(200);
      expect(resTestnet.headers.get("X-Cache")).toBe("MISS");
      expect(setSpy).toHaveBeenLastCalledWith(tenantId, streamId, expect.anything(), "testnet");

      // 2) Switch to mainnet; the next GET MUST NOT hit the testnet cache
      process.env.STELLAR_NETWORK = "mainnet";
      const reqMainnet = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "GET",
        headers: { "x-tenant-id": tenantId },
      });
      const resMainnet = await GET(reqMainnet, { params: Promise.resolve({ id: streamId }) });
      expect(resMainnet.status).toBe(200);
      expect(resMainnet.headers.get("X-Cache")).toBe("MISS");
      expect(getSpy).toHaveBeenLastCalledWith(tenantId, streamId, "mainnet");
      expect(setSpy).toHaveBeenLastCalledWith(tenantId, streamId, expect.anything(), "mainnet");
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
      process.env.STELLAR_NETWORK = previousNetwork;
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

    // Seed liveCache (under the active testnet network)
    const stream = db.streams.get(streamId)!;
    liveCache.set(tenantId, streamId, stream, "testnet");

    const getSpy = jest.spyOn(mod.streamCache, "get").mockImplementation((t, id, n) => liveCache.get(t, id, n));
    const invalidateSpy = jest.spyOn(mod.streamCache, "invalidate").mockImplementation((t, id, n) => liveCache.invalidate(t, id, n));

    try {
      // Verify cached initially (under the same network the route reads from)
      expect(liveCache.get(tenantId, streamId, "testnet")).not.toBeNull();

      // POST updates stream and invalidates cache
      const reqPOST = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "POST",
        headers: { "x-tenant-id": tenantId, "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Updated Label" }),
      });
      const resPOST = await POST(reqPOST, { params: Promise.resolve({ id: streamId }) });
      expect(resPOST.status).toBe(200);
      expect(invalidateSpy).toHaveBeenCalledWith(tenantId, streamId, "testnet");
      expect(liveCache.get(tenantId, streamId, "testnet")).toBeNull();

      // Seed cache again (under testnet)
      liveCache.set(tenantId, streamId, stream, "testnet");

      // DELETE deletes stream and invalidates cache
      // Make stream deletable (not active/paused)
      const nonActiveStream = { ...stream, status: "ended" as const };
      db.streams.set(streamId, nonActiveStream);
      liveCache.set(tenantId, streamId, nonActiveStream, "testnet");

      const reqDELETE = new Request(`http://localhost/api/streams/${streamId}`, {
        method: "DELETE",
        headers: { "x-tenant-id": tenantId },
      });
      const resDELETE = await DELETE(reqDELETE, { params: Promise.resolve({ id: streamId }) });
      expect(resDELETE.status).toBe(204);
      expect(invalidateSpy).toHaveBeenLastCalledWith(tenantId, streamId, "testnet");
      expect(liveCache.get(tenantId, streamId, "testnet")).toBeNull();
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
