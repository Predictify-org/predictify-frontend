import {
  EventSourceLike,
  NotificationStream,
} from "@/lib/notification-stream";

class FakeEventSource implements EventSourceLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string; lastEventId?: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn();
}

const notification = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: "notification-1",
    userId: "user-1",
    category: "market",
    title: "Market resolved",
    timestamp: "2026-08-28T10:00:00.000Z",
    read: false,
    ...overrides,
  });

describe("NotificationStream", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function setup(overrides: Partial<ConstructorParameters<typeof NotificationStream>[0]> = {}) {
    const sources: FakeEventSource[] = [];
    const urls: string[] = [];
    const onNotification = jest.fn();
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const stream = new NotificationStream({
      url: "/api/notifications/stream",
      expectedUserId: "user-1",
      onNotification,
      baseRetryMs: 100,
      maxRetryMs: 400,
      connectTimeoutMs: 1_000,
      logger,
      eventSourceFactory: (url) => {
        urls.push(url);
        const source = new FakeEventSource();
        sources.push(source);
        return source;
      },
      ...overrides,
    });
    return { stream, sources, urls, onNotification, logger };
  }

  it("delivers a valid event once and rejects duplicate, malformed, and wrong-user events", () => {
    const { stream, sources, onNotification, logger } = setup();
    stream.start();

    sources[0].onmessage?.({ data: notification(), lastEventId: "event-1" });
    sources[0].onmessage?.({ data: notification(), lastEventId: "event-1" });
    sources[0].onmessage?.({ data: "not-json", lastEventId: "event-2" });
    sources[0].onmessage?.({
      data: notification({ href: "javascript:alert(1)" }),
      lastEventId: "event-unsafe-link",
    });
    sources[0].onmessage?.({
      data: notification({ userId: "another-user" }),
      lastEventId: "event-3",
    });

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onNotification.mock.calls[0][0]).toMatchObject({
      id: "notification-1",
      userId: "user-1",
    });
    expect(onNotification.mock.calls[0][0].timestamp).toEqual(
      new Date("2026-08-28T10:00:00.000Z")
    );
    expect(logger.warn).toHaveBeenCalledWith(
      "Notification stream payload rejected",
      { reason: "invalid-payload" }
    );
    expect(logger.warn).toHaveBeenCalledWith(
      "Notification stream payload rejected",
      { reason: "user-mismatch" }
    );
  });

  it("schedules only one reconnect and resumes from the last accepted event", () => {
    const { stream, sources, urls } = setup();
    stream.start();
    sources[0].onopen?.();
    sources[0].onmessage?.({ data: notification(), lastEventId: "event-42" });
    const staleError = sources[0].onerror;

    staleError?.();
    staleError?.();
    expect(sources[0].close).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(99);
    expect(sources).toHaveLength(1);
    jest.advanceTimersByTime(1);

    expect(sources).toHaveLength(2);
    expect(new URL(urls[1]).searchParams.get("lastEventId")).toBe("event-42");
  });

  it("ignores stale callbacks from a replaced connection", () => {
    const { stream, sources, onNotification } = setup();
    stream.start();
    const staleMessage = sources[0].onmessage;
    sources[0].onerror?.();
    jest.advanceTimersByTime(100);

    staleMessage?.({ data: notification({ id: "stale" }), lastEventId: "stale" });
    sources[1].onmessage?.({ data: notification({ id: "current" }), lastEventId: "current" });

    expect(onNotification).toHaveBeenCalledTimes(1);
    expect(onNotification.mock.calls[0][0].id).toBe("current");
  });

  it("recovers when a connection attempt times out", () => {
    const { stream, sources, logger } = setup({ connectTimeoutMs: 50 });
    stream.start();

    jest.advanceTimersByTime(50);
    expect(sources[0].close).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Notification stream connection timed out",
      { attempt: 1 }
    );

    jest.advanceTimersByTime(100);
    expect(sources).toHaveLength(2);
  });

  it("does not acknowledge an event when the state handler fails", () => {
    const onNotification = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("store unavailable");
      })
      .mockImplementationOnce(() => undefined);
    const { stream, sources, logger } = setup({ onNotification });
    stream.start();

    const event = { data: notification(), lastEventId: "retryable-event" };
    sources[0].onmessage?.(event);
    sources[0].onmessage?.(event);

    expect(onNotification).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      "Notification stream handler failed"
    );
  });

  it("stops cleanly and prevents pending reconnects", () => {
    const { stream, sources } = setup();
    stream.start();
    sources[0].onerror?.();
    stream.stop();
    jest.runOnlyPendingTimers();

    expect(sources).toHaveLength(1);
  });

  it("rejects cross-origin stream URLs before credentials can be sent", () => {
    expect(
      () =>
        new NotificationStream({
          url: "https://attacker.example/stream",
          expectedUserId: "user-1",
          onNotification: jest.fn(),
        })
    ).toThrow("same-origin");
  });
});
