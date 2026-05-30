import { createCache, streamCache } from "./cache";

describe("TenantScopedCache", () => {
  const originalEnv = process.env.STREAMPAY_CACHE_DISABLED;

  beforeEach(() => {
    // Enable cache specifically for these unit tests, but restore original environment after
    process.env.STREAMPAY_CACHE_DISABLED = "false";
  });

  afterAll(() => {
    process.env.STREAMPAY_CACHE_DISABLED = originalEnv;
  });

  it("should allow getting and setting cached values", () => {
    const cache = createCache<string>("test-scope");
    cache.set("tenant-1", "id-1", "value-1");
    expect(cache.get("tenant-1", "id-1")).toBe("value-1");
  });

  it("should reject empty or missing tenants on get, set, and invalidate", () => {
    const cache = createCache<string>("test-scope");
    expect(() => cache.get("", "id-1")).toThrow("Tenant is required");
    expect(() => cache.get("   ", "id-1")).toThrow("Tenant is required");
    expect(() => cache.set("", "id-1", "val")).toThrow("Tenant is required");
    expect(() => cache.invalidate("", "id-1")).toThrow("Tenant is required");
  });

  it("should enforce tenant-scoped isolation", () => {
    const cache = createCache<string>("test-scope");
    cache.set("tenant-a", "shared-id", "secret-a");
    cache.set("tenant-b", "shared-id", "secret-b");

    expect(cache.get("tenant-a", "shared-id")).toBe("secret-a");
    expect(cache.get("tenant-b", "shared-id")).toBe("secret-b");
    expect(cache.get("tenant-c", "shared-id")).toBeNull();
  });

  it("should invalidate entries correctly", () => {
    const cache = createCache<string>("test-scope");
    cache.set("tenant-1", "id-1", "value-1");
    expect(cache.get("tenant-1", "id-1")).toBe("value-1");

    cache.invalidate("tenant-1", "id-1");
    expect(cache.get("tenant-1", "id-1")).toBeNull();
  });

  it("should return null for expired entries", async () => {
    const cache = createCache<string>("test-scope", 10); // 10ms TTL
    cache.set("tenant-1", "id-1", "value-1");
    
    // Wait for it to expire
    await new Promise((resolve) => setTimeout(resolve, 20));
    
    expect(cache.get("tenant-1", "id-1")).toBeNull();
  });

  it("should respect disabled mode via env", () => {
    process.env.STREAMPAY_CACHE_DISABLED = "true";
    const cache = createCache<string>("test-scope");
    cache.set("tenant-1", "id-1", "value-1");
    expect(cache.get("tenant-1", "id-1")).toBeNull();
  });

  it("should use default TTL if not specified", () => {
    const cache = createCache<string>("test-scope");
    cache.set("tenant-1", "id-1", "value-1");
    expect(cache.get("tenant-1", "id-1")).toBe("value-1");
  });

  it("should export streamCache singleton", () => {
    expect(streamCache).toBeDefined();
  });
});
