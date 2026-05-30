import {
  createInMemoryPersistenceStore,
  createPostgresPersistenceStore,
  db,
  decodeCursor,
  createDefaultStore,
  encodeCursor,
  idempotencyToken,
  POSTGRES_ROLLOUT_NOTES,
  POSTGRES_SCHEMA_SKETCH,
  setStore,
  getStore,
  resetDb,
} from "@/app/lib/db";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

describe("repository adapters", () => {
  afterEach(() => {
    setStore(createInMemoryPersistenceStore());
  });

  it("seeds the default in-memory store and resets transient state", () => {
    const store = createInMemoryPersistenceStore();
    setStore(store);

    expect(store.streamRepository.users.size).toBe(1);
    expect(store.streamRepository.streams.size).toBe(3);
    expect(store.streamRepository.activity.size).toBe(6);

    store.streamRepository.streams.set("stream-extra", {
      id: "stream-extra",
      recipient: "Extra Recipient",
      rate: "5 XLM / month",
      schedule: "Monthly",
      status: "draft",
      nextAction: "start",
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-01T00:00:00Z",
      token: "XLM",
    });
    store.idempotencyStore.set("streams.create:abc", { ok: true });
    store.exportRepository.jobs.set("job-1", {
      id: "job-1",
      ownerId: "owner-1",
      status: "pending",
      requestedAt: "2026-05-01T00:00:00Z",
      expiresAt: "2026-05-08T00:00:00Z",
      fileName: "job-1.csv",
      rows: 0,
    });
    store.exportRepository.audit.push({
      id: "audit-1",
      exportId: "job-1",
      type: "export.requested",
      timestamp: "2026-05-01T00:00:00Z",
    });

    resetDb();

    expect(getStore().streamRepository.streams.size).toBe(3);
    expect(getStore().streamRepository.streams.has("stream-extra")).toBe(false);
    expect(getStore().idempotencyStore.size).toBe(0);
    expect(getStore().exportRepository.jobs.size).toBe(0);
    expect(getStore().exportRepository.audit.length).toBe(0);
  });

  it("keeps the legacy db facade wired to the active repository store", () => {
    const store = createInMemoryPersistenceStore();
    setStore(store);

    // Verify operations on db facade route to the active store
    const testUser = { wallet_address: "TEST", email: "test@test.com", display_name: "Test", avatar_url: null, created_at: "" };
    db.users.set("TEST", testUser);
    expect(store.streamRepository.users.get("TEST")).toBe(testUser);

    const testStream = { id: "TEST_STR", recipient: "Test", rate: "1", schedule: "1", status: "active", nextAction: "pause", createdAt: "", updatedAt: "", token: "XLM" } as any;
    db.streams.set("TEST_STR", testStream);
    expect(store.streamRepository.streams.get("TEST_STR")).toBe(testStream);

    const testActivity = { id: "TEST_ACT", type: "wallet.connected", timestamp: "", description: "" };
    db.activity.set("TEST_ACT", testActivity);
    expect(store.streamRepository.activity.get("TEST_ACT")).toBe(testActivity);

    db.idempotency.set("TEST_IDEM", "val");
    expect(store.idempotencyStore.get("TEST_IDEM")).toBe("val");

    const testJob = { id: "TEST_JOB", ownerId: "owner", status: "pending", requestedAt: "", expiresAt: "", fileName: "", rows: 0 } as any;
    db.exportJobs.set("TEST_JOB", testJob);
    expect(store.exportRepository.jobs.get("TEST_JOB")).toBe(testJob);

    expect(db.exportAudit).toBe(store.exportRepository.audit);

    const testPromise = Promise.resolve();
    db.exportProcessing.set("TEST_PROC", testPromise);
    expect(store.exportRepository.processing.get("TEST_PROC")).toBe(testPromise);
  });

  it("serializes concurrent work for the same lock key", async () => {
    const store = createInMemoryPersistenceStore();
    const gate = deferred();
    const order: string[] = [];

    const first = store.streamRepository.withLock("stream-ada", async () => {
      order.push("first:start");
      await gate.promise;
      order.push("first:end");
      return "first";
    });

    const second = store.streamRepository.withLock("stream-ada", async () => {
      order.push("second:start");
      return "second";
    });

    await Promise.resolve();
    expect(order).toEqual(["first:start"]);

    gate.resolve();

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("allows different lock keys to proceed independently", async () => {
    const store = createInMemoryPersistenceStore();
    const gate = deferred();
    const order: string[] = [];

    const first = store.streamRepository.withLock("stream-ada", async () => {
      order.push("first:start");
      await gate.promise;
      order.push("first:end");
    });

    const second = store.streamRepository.withLock("stream-kemi", async () => {
      order.push("second:start");
    });

    await second;
    expect(order).toContain("second:start");

    gate.resolve();
    await first;
  });

  it("preserves cursor encoding and decoding semantics", () => {
    const id = "stream-ada";
    const cursor = encodeCursor(id);

    expect(decodeCursor(cursor)).toBe(id);
    expect(() => decodeCursor("")).toThrow("Invalid cursor: must be non-empty string");
  });

  it("preserves idempotency token scoping", () => {
    expect(idempotencyToken("streams.create", "abc123")).toBe("streams.create:abc123");
  });

  it("tracks idempotency and export state through the repository seam", () => {
    const store = createInMemoryPersistenceStore();

    store.idempotencyStore.set("streams.pause:key-1", { data: "cached" });
    expect(store.idempotencyStore.has("streams.pause:key-1")).toBe(true);
    expect(store.idempotencyStore.get("streams.pause:key-1")).toEqual({ data: "cached" });

    store.exportRepository.jobs.set("job-1", {
      id: "job-1",
      ownerId: "owner-1",
      status: "ready",
      requestedAt: "2026-05-01T00:00:00Z",
      expiresAt: "2026-05-08T00:00:00Z",
      fileName: "job-1.csv",
      rows: 3,
    });
    store.exportRepository.audit.push({
      id: "audit-1",
      exportId: "job-1",
      type: "export.downloaded",
      timestamp: "2026-05-02T00:00:00Z",
    });
    store.exportRepository.processing.set("job-1", Promise.resolve());

    expect(store.exportRepository.jobs.get("job-1")?.status).toBe("ready");
    expect(store.exportRepository.audit.some((record) => record.type === "export.downloaded")).toBe(true);
    expect(store.exportRepository.processing.has("job-1")).toBe(true);
    expect(store.exportRepository.jobs.entries().next().value?.[0]).toBe("job-1");
    expect(store.exportRepository.jobs.delete("job-1")).toBe(true);
    expect(store.exportRepository.jobs.has("job-1")).toBe(false);
    expect(store.exportRepository.audit.toArray()).toHaveLength(1);
  });

  it("exposes a postgres adapter seam plus schema and rollout notes", () => {
    const store = createPostgresPersistenceStore({
      executor: {
        query: async () => ({ rows: [] }),
      },
    });

    expect(store.kind).toBe("postgres");
    expect(POSTGRES_SCHEMA_SKETCH).toContain("create table streams");
    expect(POSTGRES_SCHEMA_SKETCH).toContain("create table idempotency_keys");
    expect(POSTGRES_ROLLOUT_NOTES.length).toBeGreaterThanOrEqual(4);
    expect(() => store.streamRepository.streams.get("stream-ada")).toThrow(
      "PostgreSQL persistence seam is defined",
    );
    expect(() => store.exportRepository.audit.toArray()).toThrow(
      "PostgreSQL persistence seam is defined",
    );
    expect(() => store.idempotencyStore.reset()).toThrow(
      "PostgreSQL persistence seam is defined",
    );
  });

  it("resets a durable store back to the default in-memory adapter", () => {
    setStore(
      createPostgresPersistenceStore({
        executor: {
          query: async () => ({ rows: [] }),
        },
      }),
    );

    resetDb();

    expect(getStore().kind).toBe("memory");
    expect(getStore().streamRepository.streams.size).toBe(
      createDefaultStore().streamRepository.streams.size,
    );
  });
});
