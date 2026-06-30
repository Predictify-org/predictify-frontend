import { InMemoryStreamStore, pauseRoute, resumeRoute, type StreamRecord } from "./stream-events";

function createStream(overrides: Partial<StreamRecord> = {}): StreamRecord {
  return {
    availableBalance: 0n,
    escrowBalance: 100n,
    id: "stream-1",
    lastSettlementAt: 0,
    status: "active",
    tenantId: "tenant-a",
    ...overrides,
  };
}

describe("InMemoryStreamStore.applyEvent", () => {
  it("pauses an active stream", async () => {
    const store = new InMemoryStreamStore([createStream()]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "key-1",
      type: "pause",
    });

    expect(result.ok).toBe(true);
    const stream = store.getStream("stream-1");
    expect(stream?.status).toBe("paused");
  });

  it("returns 409 for illegal pause transition", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "draft" })]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "key-2",
      type: "pause",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(409);
      expect(result.error.code).toBe("ILLEGAL_TRANSITION");
    }
  });

  it("starts a paused stream", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "paused" })]);
 
    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "key-3",
      type: "start",
    });
 
    expect(result.ok).toBe(true);
    expect(store.getStream("stream-1")?.status).toBe("active");
  });
 
  it("returns 409 for illegal start transition", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "active" })]);
 
    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "key-4",
      type: "start",
    });
 
    const stopResult = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      type: "stop",
    });
    expect(stopResult.ok).toBe(true);
 
    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "key-5",
      type: "start",
    });
 
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(409);
      expect(result.error.code).toBe("ILLEGAL_TRANSITION");
    }
  });

  it("rejects commands from other tenants", async () => {
    const store = new InMemoryStreamStore([createStream({ tenantId: "tenant-a" })]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-b",
      idempotencyKey: "key-6",
      type: "pause",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(403);
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("returns 404 for unknown streams", async () => {
    const store = new InMemoryStreamStore([]);

    const result = await store.applyEvent("unknown", {
      actorTenantId: "tenant-a",
      idempotencyKey: "key-7",
      type: "pause",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(404);
      expect(result.error.code).toBe("NOT_FOUND");
    }

    expect(store.getStream("unknown")).toBeUndefined();
  });

  it("supports idempotent pause retries", async () => {
    const store = new InMemoryStreamStore([createStream()]);

    const first = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "same-key",
      type: "pause",
    });

    const second = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "same-key",
      type: "pause",
    });

    expect(first).toEqual(second);
    expect(store.metrics.pauseAttempts).toBe(2);
    expect(store.metrics.pauseSuccess).toBe(2);
    expect(store.getStream("stream-1")?.status).toBe("paused");
  });

  it("returns 409 when the same idempotency key is reused for a different command", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "active" })]);

    const pause = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "shared-key",
      type: "pause",
    });
    expect(pause.ok).toBe(true);

    const start = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "shared-key",
      type: "start",
    });
    expect(start.ok).toBe(false);
    if (!start.ok) {
      expect(start.error.httpStatus).toBe(409);
      expect(start.error.code).toBe("ILLEGAL_TRANSITION");
    }
    expect(store.getStream("stream-1")?.status).toBe("paused");
  });

  it("settles from escrow into available and enforces non-negative invariants", async () => {
    const store = new InMemoryStreamStore([createStream({ availableBalance: 1n, escrowBalance: 5n })]);

    const ok = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      at: 99,
      settleAmount: 5n,
      type: "settle_tick",
    });

    expect(ok.ok).toBe(true);
    const stream = store.getStream("stream-1");
    expect(stream?.availableBalance).toBe(6n);
    expect(stream?.escrowBalance).toBe(0n);
    expect(stream?.lastSettlementAt).toBe(99);

    const insufficient = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      settleAmount: 1n,
      type: "settle_tick",
    });

    expect(insufficient.ok).toBe(false);
    if (!insufficient.ok) {
      expect(insufficient.error.httpStatus).toBe(409);
      expect(insufficient.error.code).toBe("INSUFFICIENT_ESCROW");
    }

    const final = store.getStream("stream-1");
    expect(final?.availableBalance).toBeGreaterThanOrEqual(0n);
    expect(final?.escrowBalance).toBeGreaterThanOrEqual(0n);
  });

  it("rejects settle tick with negative amount", async () => {
    const store = new InMemoryStreamStore([createStream()]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      settleAmount: -1n,
      type: "settle_tick",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(400);
      expect(result.error.code).toBe("INVALID_COMMAND");
    }
  });

  it("returns 409 for settle tick on ended streams", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "ended" })]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      settleAmount: 1n,
      type: "settle_tick",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(409);
      expect(result.error.code).toBe("ILLEGAL_TRANSITION");
    }
  });

  it("executes concurrent pause + settle atomically without negative balances", async () => {
    const store = new InMemoryStreamStore([createStream({ availableBalance: 2n, escrowBalance: 10n })]);

    const pausePromise = store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "pause-atomic",
      processingDelayMs: 20,
      type: "pause",
    });

    const settlePromise = store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      at: 77,
      settleAmount: 4n,
      type: "settle_tick",
    });

    const [pauseResult, settleResult] = await Promise.all([pausePromise, settlePromise]);
    expect(pauseResult.ok).toBe(true);
    expect(settleResult.ok).toBe(true);

    const final = store.getStream("stream-1");
    expect(final?.status).toBe("paused");
    expect(final?.availableBalance).toBeGreaterThanOrEqual(0n);
    expect(final?.escrowBalance).toBeGreaterThanOrEqual(0n);
    expect((final?.availableBalance ?? 0n) + (final?.escrowBalance ?? 0n)).toBe(12n);
  });

  it("executes concurrent resume + stop with exactly one illegal transition", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "paused" })]);

    const startPromise = store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "start-atomic",
      processingDelayMs: 20,
      type: "start",
    });

    const stopPromise = store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      type: "stop",
    });

    const [startResult, stopResult] = await Promise.all([startPromise, stopPromise]);

    const outcomes = [startResult, stopResult].map((item) => (item.ok ? "ok" : item.error.code));
    expect(outcomes).toContain("ok");

    const final = store.getStream("stream-1");
    expect(final?.status).toBe("ended");

    const illegalStart = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "start-illegal",
      type: "start",
    });
    expect(illegalStart.ok).toBe(false);
    if (!illegalStart.ok) {
      expect(illegalStart.error.httpStatus).toBe(409);
      expect(illegalStart.error.code).toBe("ILLEGAL_TRANSITION");
    }
  });

  it("tracks pause and resume metrics including failures", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "active" })]);

    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "m1",
      type: "pause",
    });

    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "m2",
      type: "pause",
    });

    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "m3",
      type: "start",
    });

    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "m4",
      type: "pause",
    });

    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      type: "stop",
    });

    await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      idempotencyKey: "m5",
      type: "start",
    });

    expect(store.metrics.pauseAttempts).toBe(3);
    expect(store.metrics.pauseSuccess).toBe(3);
    expect(store.metrics.pauseFailures).toBe(0);

    expect(store.metrics.resumeAttempts).toBe(2);
    expect(store.metrics.resumeSuccess).toBe(1);
    expect(store.metrics.resumeFailures).toBe(1);
  });

  it("is idempotent for stop on ended streams", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "ended" })]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      type: "stop",
    });

    expect(result.ok).toBe(true);
    expect(store.getStream("stream-1")?.status).toBe("ended");
  });

  it("returns 400 for unsupported command types", async () => {
    const store = new InMemoryStreamStore([createStream()]);

    const result = await store.applyEvent("stream-1", {
      actorTenantId: "tenant-a",
      type: "unknown_command" as never,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.httpStatus).toBe(400);
      expect(result.error.code).toBe("INVALID_COMMAND");
    }
  });
});

describe("pauseRoute and resumeRoute", () => {
  it("requires Idempotency-Key for pause and resume", async () => {
    const store = new InMemoryStreamStore([createStream()]);

    const pause = await pauseRoute(store, {
      actorTenantId: "tenant-a",
      headers: {},
      streamId: "stream-1",
    });
    expect(pause.ok).toBe(false);
    if (!pause.ok) {
      expect(pause.error.httpStatus).toBe(400);
    }

    const resume = await resumeRoute(store, {
      actorTenantId: "tenant-a",
      headers: {},
      streamId: "stream-1",
    });
    expect(resume.ok).toBe(false);
    if (!resume.ok) {
      expect(resume.error.httpStatus).toBe(400);
    }
  });

  it("pipes Idempotency-Key through to command handling", async () => {
    const store = new InMemoryStreamStore([createStream()]);

    const first = await resumeRoute(store, {
      actorTenantId: "tenant-a",
      headers: { "idempotency-key": "route-key" },
      streamId: "stream-1",
    });
    expect(first.ok).toBe(true);

    const second = await resumeRoute(store, {
      actorTenantId: "tenant-a",
      headers: { "idempotency-key": "route-key" },
      streamId: "stream-1",
    });

    expect(second).toEqual(first);
  });

  it("resumes through route handler when idempotency key is present", async () => {
    const store = new InMemoryStreamStore([createStream({ status: "paused" })]);

    const result = await resumeRoute(store, {
      actorTenantId: "tenant-a",
      headers: { "idempotency-key": "resume-key" },
      streamId: "stream-1",
    });

    expect(result.ok).toBe(true);
    expect(store.getStream("stream-1")?.status).toBe("active");
  });
});
