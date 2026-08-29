import {
  fetchOracleAttempts,
  OracleStatusClientError,
} from "@/lib/oracle-status-client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const ATTEMPTS = [
  { provider: "chainlink", attempt: 0, success: false, outcome: "", timestamp: 1700000000 },
  { provider: "pyth", attempt: 1, success: true, outcome: "yes", timestamp: 1700003600000 },
];

describe("fetchOracleAttempts", () => {
  it("rejects an empty marketId without a network call", async () => {
    const fetchImpl = jest.fn();
    await expect(
      fetchOracleAttempts("", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns normalized attempts on success", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ attempts: ATTEMPTS }));
    const result = await fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/oracle-status?marketId=m1"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toHaveLength(2);
    // epoch seconds normalized to ms
    expect(result[0].timestamp).toBe(1700000000000);
    expect(result[1].timestamp).toBe(1700003600000);
  });

  it("accepts a top-level array payload", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(ATTEMPTS));
    const result = await fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never });
    expect(result).toHaveLength(2);
  });

  it("maps 403 to a non-retryable permission error", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ error: "no" }, 403));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "permission", retryable: false });
  });

  it("maps 401 to a non-retryable permission error", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 401));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "permission", retryable: false });
  });

  it("maps 404 to a non-retryable not_found error", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 404));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "not_found", retryable: false });
  });

  it("maps 400 to a non-retryable invalid error", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 400));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
  });

  it("maps 429 and 5xx to retryable network errors", async () => {
    const rateLimited = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 429));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: rateLimited as never }),
    ).rejects.toMatchObject({ kind: "network", retryable: true });

    const serverError = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 503));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: serverError as never }),
    ).rejects.toMatchObject({ kind: "network", retryable: true });
  });

  it("rejects a malformed payload", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({ attempts: [{ provider: "nope", attempt: 0, success: true, timestamp: 1 }] }),
    );
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
  });

  it("rejects non-JSON responses", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Response);
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
  });

  it("maps a network failure to a retryable network error", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new Error("connection reset"));
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "network", retryable: true });
  });

  it("propagates an abort as an aborted error", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const fetchImpl = jest.fn().mockRejectedValue(abortError);
    await expect(
      fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "aborted", retryable: false });
  });

  it("passes the abort signal through to the fetch implementation", async () => {
    const controller = new AbortController();
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ attempts: [] }));
    await fetchOracleAttempts("m1", {
      fetchImpl: fetchImpl as never,
      signal: controller.signal,
    });
    const callArgs = fetchImpl.mock.calls[0][1] as { signal?: AbortSignal };
    expect(callArgs.signal).toBe(controller.signal);
  });

  it("exposes OracleStatusClientError as an instance", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 500));
    try {
      await fetchOracleAttempts("m1", { fetchImpl: fetchImpl as never });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(OracleStatusClientError);
      expect((error as OracleStatusClientError).name).toBe(
        "OracleStatusClientError",
      );
    }
  });
});
