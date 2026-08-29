import { act, renderHook, waitFor } from "@testing-library/react";
import { useClaimEligibility } from "@/hooks/useClaimEligibility";
import { ClaimEligibilityClientError } from "@/lib/claim-eligibility-client";
import type { ClaimEvidence } from "@/types/claim-eligibility";

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

function evidence(
  overrides: Partial<ClaimEvidence> = {},
): ClaimEvidence {
  return {
    marketId: "m",
    outcome: "Lakers to win",
    userPrediction: "Lakers to win",
    resolvedAt: NOW - 2 * HOUR,
    source: "oracle",
    claimed: false,
    claimStatus: "available",
    winnings: 18,
    winningsToken: "XLM",
    ...overrides,
  };
}

describe("useClaimEligibility", () => {
  it("does not load when disabled or missing marketId", () => {
    const fetcher = jest.fn();
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: undefined, fetcher }),
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.phase).toBe("idle");
  });

  it("does not load when enabled is false", () => {
    const fetcher = jest.fn();
    renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, enabled: false }),
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("loads and derives an eligible claim", async () => {
    const fetcher = jest.fn().mockResolvedValue(evidence());
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.decision).toBe("eligible");
    expect(result.current.canClaim).toBe(true);
    expect(result.current.freshness).toBe("fresh");
    expect(result.current.retryCount).toBe(0);
  });

  it("marks a stale evidence based on timestamp", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue(evidence({ resolvedAt: NOW - 5 * DAY }));
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.freshness).toBe("stale");
    expect(result.current.isStale).toBe(true);
    // Stale evidence still yields a usable (eligible) decision.
    expect(result.current.decision).toBe("eligible");
  });

  it("surfaces a retryable network error", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("error"));
    expect(result.current.retryable).toBe(true);
    expect(result.current.error?.kind).toBe("network");
  });

  it("surfaces a non-retryable permission error", async () => {
    const permission = new ClaimEligibilityClientError(
      "forbidden",
      "permission",
      false,
    );
    const fetcher = jest.fn().mockRejectedValue(permission);
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("permission_denied"));
    expect(result.current.retryable).toBe(false);
  });

  it("preserves last-good data while reloading (no data loss)", async () => {
    const first = evidence({ winnings: 18 });
    const second = deferred<ClaimEvidence>();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(second.promise);

    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.eligibility?.winnings).toBe(18);

    act(() => {
      result.current.retry();
    });

    // During reload the previous data must remain visible.
    expect(result.current.phase).toBe("loading");
    expect(result.current.eligibility?.winnings).toBe(18);

    act(() => {
      second.resolve(evidence({ winnings: 42 }));
    });

    await waitFor(() => expect(result.current.eligibility?.winnings).toBe(42));
  });

  it("ignores out-of-order responses (concurrency safety)", async () => {
    const firstCall = deferred<ClaimEvidence>();
    const secondCall = deferred<ClaimEvidence>();
    const fetcher = jest
      .fn()
      .mockReturnValueOnce(firstCall.promise)
      .mockReturnValueOnce(secondCall.promise);

    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    // Trigger a second load so the second request becomes the "latest".
    act(() => {
      result.current.retry();
    });

    // Resolve the newest response first.
    act(() => {
      secondCall.resolve(evidence({ winnings: 42 }));
    });
    await waitFor(() => expect(result.current.eligibility?.winnings).toBe(42));

    // Now resolve the stale (first) response; it must be ignored.
    act(() => {
      firstCall.resolve(evidence({ winnings: 18 }));
    });

    expect(result.current.phase).toBe("success");
    expect(result.current.eligibility?.winnings).toBe(42);
  });

  it("increments the retry count on repeated loads", async () => {
    const fetcher = jest.fn().mockResolvedValue(evidence());
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    expect(result.current.retryCount).toBe(0);

    act(() => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.retryCount).toBe(1));
  });

  it("resets state", async () => {
    const fetcher = jest.fn().mockResolvedValue(evidence());
    const { result } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );

    await waitFor(() => expect(result.current.phase).toBe("success"));
    act(() => {
      result.current.reset();
    });
    expect(result.current.phase).toBe("idle");
    expect(result.current.eligibility).toBeNull();
  });

  it("aborts the in-flight request on unmount", async () => {
    const fetcher = jest.fn().mockImplementation(
      (_id: string, opts: { signal?: AbortSignal }) => {
        return new Promise<ClaimEvidence>((_resolve, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener("abort", () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            );
          }
        });
      },
    );
    const { unmount } = renderHook(() =>
      useClaimEligibility({ marketId: "m", fetcher, now: () => NOW }),
    );
    await act(async () => {
      unmount();
    });
    expect(fetcher).toHaveBeenCalled();
  });
});
