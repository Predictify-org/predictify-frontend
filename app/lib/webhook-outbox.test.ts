import { describe, it, expect, beforeEach, vi } from "vitest";
import { webhookOutboxStore, WebhookOutboxStore } from "./webhook-outbox";
import { WebhookEndpoint, WebhookEvent } from "./webhook-delivery";
import { WebhookDeliveryWorker } from "./webhook-delivery-worker";

describe("WebhookOutboxStore", () => {
  let store: WebhookOutboxStore;

  beforeEach(() => {
    store = new WebhookOutboxStore();
  });

  it("should add an event to the outbox", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    const entry = store.addToOutbox(endpoint, event);

    expect(entry).toBeDefined();
    expect(entry.id).toContain("outbox-");
    expect(entry.status).toBe("pending");
    expect(entry.endpoint).toEqual(endpoint);
    expect(entry.event).toEqual(event);
    expect(entry.attempts).toBe(0);
  });

  it("should get outbox entry by id", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    const entry = store.addToOutbox(endpoint, event);
    const retrieved = store.getOutboxEntry(entry.id);

    expect(retrieved).toEqual(entry);
  });

  it("should get all outbox entries", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event1: WebhookEvent = {
      id: "test-event-id-1",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };
    const event2: WebhookEvent = {
      id: "test-event-id-2",
      eventType: "stream.updated",
      streamId: "stream-123",
      data: { foo: "baz" },
      timestamp: new Date().toISOString(),
    };

    store.addToOutbox(endpoint, event1);
    store.addToOutbox(endpoint, event2);

    const entries = store.getAllOutboxEntries();
    expect(entries.length).toBe(2);
  });

  it("should get pending outbox entries", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    const entry = store.addToOutbox(endpoint, event);
    store.updateOutboxEntry(entry.id, { status: "delivered" });
    store.addToOutbox(endpoint, event);

    const pending = store.getPendingOutboxEntries();
    expect(pending.length).toBe(1);
  });

  it("should update outbox entry status", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    const entry = store.addToOutbox(endpoint, event);
    const updated = store.updateOutboxEntry(entry.id, {
      status: "delivered",
      attempts: 1,
    });

    expect(updated?.status).toBe("delivered");
    expect(updated?.attempts).toBe(1);
  });

  it("should clear all entries", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    store.addToOutbox(endpoint, event);
    store.clear();
    expect(store.getAllOutboxEntries().length).toBe(0);
  });

  it("should return statistics", () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 3,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    const entry1 = store.addToOutbox(endpoint, event);
    const entry2 = store.addToOutbox(endpoint, event);
    store.updateOutboxEntry(entry1.id, { status: "delivered" });
    store.updateOutboxEntry(entry2.id, { status: "dlq" });

    const stats = store.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.delivered).toBe(1);
    expect(stats.dlq).toBe(1);
  });
});

describe("WebhookDeliveryWorker - Outbox", () => {
  let store: WebhookOutboxStore;
  let worker: WebhookDeliveryWorker;

  beforeEach(() => {
    store = new WebhookOutboxStore();
    worker = new WebhookDeliveryWorker(
      { maxAttempts: 1 },
      () => Promise.resolve()
    );
  });

  it("should process outbox entries", async () => {
    const endpoint: WebhookEndpoint = {
      id: "test-endpoint",
      url: "https://example.com/webhook",
      maxRetries: 1,
    };
    const event: WebhookEvent = {
      id: "test-event-id",
      eventType: "stream.created",
      streamId: "stream-123",
      data: { foo: "bar" },
      timestamp: new Date().toISOString(),
    };

    // Mock the attemptDelivery to simulate success
    const originalAttemptDelivery = worker["client"].attemptDelivery;
    worker["client"].attemptDelivery = vi
      .fn()
      .mockResolvedValue({ success: true, statusCode: 200, shouldRetry: false });

    const entry = store.addToOutbox(endpoint, event);

    await worker.processOutboxEntry(entry);

    const updated = store.getOutboxEntry(entry.id);
    expect(updated?.status).toBe("delivered");

    // Restore original method
    worker["client"].attemptDelivery = originalAttemptDelivery;
  });
});
