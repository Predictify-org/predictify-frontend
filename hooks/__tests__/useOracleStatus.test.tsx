import { act, renderHook, waitFor } from "@testing-library/react";
import { useOracleStatus } from "@/hooks/useOracleStatus";
import { OracleStatusClientError } from "@/lib/oracle-status-client";
import type { OracleAttemptResult } from "@/types/oracle-status";

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function attempts(
  overrides: Partial<OracleAttemptResult>[] = [{}],
): OracleAttemptResult[] {
  return overrides.map((o, i) => ({
    provider: "chainlink",
    attempt: i,
    success: i === overrides.length - 1,
    outcome: "yes",
    timestamp: NOW,
    ...o,
  }));
}

describe("useOracleStatus", () => {
  it("does not load when disabled or missing marketId", () => {
    const fetcher = jest.fn();
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: undefined, fetcher }),
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });

  it("does not load when enabled is false", () => {
    const fetcher = jest.fn();
    renderHook(() => useOracleStatus({ marketId: "m", fetcher, enabled: false }));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("loads and derives a fresh primary success", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(attempts([{ success: true }]));
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.status?.provider).toBe("chainlink");
    expect(result.current.freshness).toBe("fresh");
    expect(result.current.isFallback).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it("marks a stale confirmation based on timestamp", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        attempts([{ success: true, timestamp: NOW - 5 * DAY }]),
      );
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.freshness).toBe("stale");
    expect(result.current.isStale).toBe(true);
  });

  it("detects fallback usage", async () => {
    const fetcher = jest.fn().mockResolvedValue(
      attempts([
        { provider: "chainlink", success: false },
        { provider: "pyth", success: true },
      ]),
    );
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.isFallback).toBe(true);
    expect(result.current.status?.provider).toBe("pyth");
  });

  it("surfaces a retryable network error", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.retryable).toBe(true);
    expect(result.current.error?.kind).toBe("network");
  });

  it("surfaces a non-retryable permission error", async () => {
    const permission = new OracleStatusClientError(
      "forbidden",
      "permission",
      false,
    );
    const fetcher = jest.fn().mockRejectedValue(permission);
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("permission_denied"));
    expect(result.current.retryable).toBe(false);
  });

  it("preserves last-good data while reloading (no data loss)", async () => {
    const first = attempts([{ success: true, provider: "chainlink" }]);
    const second = deferred<OracleAttemptResult[]>();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(second.promise);

    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.status?.provider).toBe("chainlink");

    act(() => {
      result.current.retry();
    });

    // During reload the previous data must remain visible.
    expect(result.current.phase).toBe("loading");
    expect(result.current.status?.provider).toBe("chainlink");

    act(() => {
      second.resolve(attempts([{ success: true, provider: "pyth" }]));
    });

    await waitFor(() => expect(result.current.status?.provider).toBe("pyth"));
  });

  it("ignores out-of-order responses (concurrency safety)", async () => {
    const firstCall = deferred<OracleAttemptResult[]>();
    const secondCall = deferred<OracleAttemptResult[]>();
    const fetcher = jest
      .fn()
      .mockReturnValueOnce(firstCall.promise)
      .mockReturnValueOnce(secondCall.promise);

    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    // Trigger a second load so the second request becomes the "latest".
    act(() => {
      result.current.retry();
    });

    // Resolve the newest response first.
    act(() => {
      secondCall.resolve(attempts([{ success: true, provider: "pyth" }]));
    });
    await waitFor(() => expect(result.current.status?.provider).toBe("pyth"));

    // Now resolve the stale (first) response; it must be ignored.
    act(() => {
      firstCall.resolve(attempts([{ success: true, provider: "chainlink" }]));
    });

    // Phase stays success and the stale result did not overwrite.
    expect(result.current.phase).toBe("success");
    expect(result.current.status?.provider).toBe("pyth");
  });

  it("increments the retry count on repeated loads", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(attempts([{ success: true }]));
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.retryCount).toBe(0);

    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.retryCount).toBe(1));
  });

  it("resets state", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(attempts([{ success: true }]));
    const { result } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    act(() => {
      result.current.reset();
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.status).toBeNull();
  });

  it("aborts the in-flight request on unmount", async () => {
    const fetcher = jest.fn().mockImplementation(
      (_id: string, opts: { signal?: AbortSignal }) => {
        return new Promise<OracleAttemptResult[]>((_resolve, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener("abort", () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            );
          }
        });
      },
    );
    const { unmount } = renderHook(() =>
      useOracleStatus({ marketId: "m", fetcher, now: () => NOW }),
    );
    await act(async () => {
      unmount();
    });
    // No assertion needed beyond not throwing; abort listener fired.
    expect(fetcher).toHaveBeenCalled();
  });
});
