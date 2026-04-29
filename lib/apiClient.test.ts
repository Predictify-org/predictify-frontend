import { fetchWithIdempotency, fetchWithRetry } from "./apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("retries transient failures and returns parsed JSON", async () => {
    const responses = [
      Promise.resolve(new Response(JSON.stringify({ data: "retry" }), { status: 503, headers: { "Content-Type": "application/json" } })),
      Promise.resolve(new Response(JSON.stringify({ data: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } })),
    ];

    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => responses[callCount++] as Promise<Response>);

    const result = await fetchWithRetry("https://example.com/test", { method: "GET" }, { initialBackoffMs: 1, maxBackoffMs: 10, timeoutMs: 1000, maxAttempts: 2 });

    expect(result).toEqual({ data: "ok" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("fails after max retry attempts", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 503, statusText: "Service Unavailable" }));

    await expect(
      fetchWithRetry("https://example.com/fail", { method: "GET" }, { initialBackoffMs: 1, maxBackoffMs: 1, timeoutMs: 1000, maxAttempts: 2 })
    ).rejects.toThrow(/Network request failed/);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("adds an idempotency key for mutating requests", async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: "ok" }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await fetchWithIdempotency("https://example.com/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });

    const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(callHeaders.get("Idempotency-Key")).toBeTruthy();
  });
});
