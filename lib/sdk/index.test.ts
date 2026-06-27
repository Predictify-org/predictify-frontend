import { StreamPayClient, StreamPaySdkError, type EventSourceLike } from "./index";

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
    statusText: status >= 400 ? "Error" : "OK",
  });
}

class FakeEventSource implements EventSourceLike {
  listeners = new Map<string, (event: MessageEvent<string>) => void>();
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  closed = false;

  close(): void {
    this.closed = true;
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, listener);
  }

  emit(type: string, data: unknown): void {
    const listener = this.listeners.get(type);
    listener?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

describe("StreamPayClient", () => {
  it("sends typed REST requests with auth and correlation headers", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        data: [{ id: "stream-1", recipient: "Ada", rate: "10 XLM/month", status: "active" }],
        meta: { total: 1 },
      }),
    );
    const client = new StreamPayClient({
      baseUrl: "https://api.streampay.test",
      fetchFn,
      requestIdFactory: () => "req-test",
      token: "partner-token",
    });

    const result = await client.listStreams({ limit: 10, status: "active" });

    expect(result.data[0].id).toBe("stream-1");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.streampay.test/api/v2/streams?limit=10&status=active",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
    const headers = fetchFn.mock.calls[0][1].headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer partner-token");
    expect(headers.get("x-request-id")).toBe("req-test");
  });

  it("adds idempotency keys and JSON bodies for stream creation", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse({
        data: { id: "stream-2", recipient: "Kemi", rate: "5 XLM/week", status: "draft" },
      }),
    );
    const client = new StreamPayClient({ baseUrl: "https://api.streampay.test", fetchFn });

    await client.createStream(
      { recipient: "Kemi", rate: "5", schedule: "week" },
      { idempotencyKey: "create-kemi" },
    );

    const init = fetchFn.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ recipient: "Kemi", rate: "5", schedule: "week" }));
    expect((init.headers as Headers).get("Idempotency-Key")).toBe("create-kemi");
  });

  it("normalizes API error envelopes", async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "STREAM_NOT_FOUND",
            message: "Stream not found",
            request_id: "req-api",
          },
        },
        404,
      ),
    );
    const client = new StreamPayClient({ baseUrl: "https://api.streampay.test", fetchFn });

    await expect(client.getStream("missing")).rejects.toMatchObject<Partial<StreamPaySdkError>>({
      code: "STREAM_NOT_FOUND",
      message: "Stream not found",
      requestId: "req-api",
      status: 404,
    });
  });

  it("wraps SSE stream update and settlement events", () => {
    const source = new FakeEventSource();
    const factory = jest.fn(() => source);
    const onUpdate = jest.fn();
    const onSettlement = jest.fn();
    const client = new StreamPayClient({
      baseUrl: "https://api.streampay.test/",
      eventSourceFactory: factory,
      token: "partner-token",
    });

    const subscription = client.subscribeToStream("stream-ada", { onSettlement, onUpdate });

    expect(subscription.url).toBe(
      "https://api.streampay.test/api/streams/events?streamId=stream-ada&token=partner-token",
    );
    source.emit("stream:updated", { id: "stream-ada", status: "active" });
    source.emit("settle:finished", { id: "stream-ada", status: "ended" });

    expect(onUpdate).toHaveBeenCalledWith({ id: "stream-ada", status: "active" });
    expect(onSettlement).toHaveBeenCalledWith({ id: "stream-ada", status: "ended" });

    subscription.close();
    expect(source.closed).toBe(true);
  });
});
