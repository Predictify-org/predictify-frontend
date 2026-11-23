import { z } from "zod";
import { http, HttpError } from "@/lib/http";

const response = (
  status: number,
  body: string | null = null,
  headers: Record<string, string> = {},
) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: jest.fn().mockResolvedValue(body ?? ""),
  }) as unknown as Response;

describe("http", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("returns a zod-parsed response", async () => {
    global.fetch = jest.fn().mockResolvedValue(response(200, '{"value":42}')) as typeof fetch;
    await expect(http("/test", { schema: z.object({ value: z.number() }) })).resolves
      .toEqual({ value: 42 });
  });

  it("maps malformed JSON and schema mismatches to parse errors", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response(200, "not-json"))
      .mockResolvedValueOnce(response(200, '{"value":"wrong"}')) as typeof fetch;

    await expect(http("/test", { schema: z.object({ value: z.number() }) }))
      .rejects.toMatchObject({ kind: "parse" });
    await expect(http("/test", { schema: z.object({ value: z.number() }) }))
      .rejects.toMatchObject({ kind: "parse" });
  });

  it("handles 204 responses", async () => {
    global.fetch = jest.fn().mockResolvedValue(response(204)) as typeof fetch;
    await expect(http("/test", { method: "POST", schema: z.unknown(), retries: 0 }))
      .resolves.toBeUndefined();
  });

  it("maps caller abort and timeout distinctly", async () => {
    const caller = new AbortController();
    global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as typeof fetch;

    const aborted = http("/test", { schema: z.unknown(), signal: caller.signal });
    caller.abort();
    await expect(aborted).rejects.toMatchObject({ kind: "aborted" });

    global.fetch = jest.fn((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as typeof fetch;
    await expect(http("/test", {
      schema: z.unknown(),
      timeoutMs: 25,
      retries: 0,
    })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("retries 429 and respects Retry-After", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(response(429, null, { "Retry-After": "2" }))
      .mockResolvedValueOnce(response(200, '{"ok":true}')) as typeof fetch;

    const promise = http("/test", {
      schema: z.object({ ok: z.boolean() }),
      retries: 1,
    });
    await jest.advanceTimersByTimeAsync(2000);
    await expect(promise).resolves.toEqual({ ok: true });
  });

  it("does not retry POST by default", async () => {
    global.fetch = jest.fn().mockResolvedValue(response(500, "failed")) as typeof fetch;
    await expect(http("/test", {
      method: "POST",
      body: { name: "Ada" },
      schema: z.unknown(),
    })).rejects.toMatchObject({ kind: "status", status: 500 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries network errors and exhausts retries", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as typeof fetch;
    const promise = http("/test", {
      schema: z.unknown(),
      retries: 2,
      backoffMs: 100,
    });
    const assertion = expect(promise).rejects.toMatchObject({ kind: "network" });
    await jest.runAllTimersAsync();
    await assertion;
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
