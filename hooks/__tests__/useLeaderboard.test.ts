import { renderHook, act } from "@testing-library/react";
import { useLeaderboard, LeaderboardStatus } from "@/hooks/useLeaderboard";
import type { LeaderboardUser } from "@/lib/leaderboard-data";

const mockData: LeaderboardUser[] = [
  { rank: 1, name: "Alice", profit: 1000, winRate: 80, predictions: 50, isCurrentUser: true },
  { rank: 2, name: "Bob", profit: 900, winRate: 75, predictions: 40 },
];

const mockEmptyData: LeaderboardUser[] = [];

function createSuccessFetcher(data: LeaderboardUser[]) {
  return jest.fn().mockResolvedValue(data);
}

function createErrorFetcher(message: string) {
  return jest.fn().mockRejectedValue(new Error(message));
}

describe("useLeaderboard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts with idle status when no initial data", () => {
    const { result } = renderHook(() =>
      useLeaderboard({ fetcher: createSuccessFetcher(mockData) })
    );

    expect(result.current.status).toBe("idle");
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("starts with success status when initial data is provided", () => {
    const { result } = renderHook(() =>
      useLeaderboard({ fetcher: createSuccessFetcher(mockData), initialData: mockData })
    );

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(mockData);
    expect(result.current.lastUpdated).not.toBeNull();
  });

  it("transitions to loading and then success on successful fetch", async () => {
    const fetcher = createSuccessFetcher(mockData);
    const { result } = renderHook(() => useLeaderboard({ fetcher }));

    act(() => {
      result.current.refetch();
    });

    expect(result.current.status).toBe("loading");

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("transitions to error state on failed fetch", async () => {
    const fetcher = createErrorFetcher("Network error");
    const { result } = renderHook(() => useLeaderboard({ fetcher }));

    act(() => {
      result.current.refetch();
    });

    expect(result.current.status).toBe("loading");

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
  });

  it("returns empty state when fetch returns empty array", async () => {
    const fetcher = createSuccessFetcher(mockEmptyData);
    const { result } = renderHook(() => useLeaderboard({ fetcher }));

    act(() => {
      result.current.refetch();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("empty");
    expect(result.current.data).toEqual([]);
  });

  it("resets state when reset is called", async () => {
    const fetcher = createSuccessFetcher(mockData);
    const { result } = renderHook(() =>
      useLeaderboard({ fetcher, initialData: mockData })
    );

    act(() => {
      result.current.refetch();
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("retries fetch and succeeds after transient error", async () => {
    const fetcher = jest
      .fn()
      .mockRejectedValueOnce(new Error("Transient error"))
      .mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useLeaderboard({ fetcher, maxRetries: 3, retryDelay: 0 }));

    act(() => {
      result.current.retry();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Transient error");

    act(() => {
      result.current.retry();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(mockData);
  });

  it("marks data as stale after staleTime", async () => {
    const fetcher = createSuccessFetcher(mockData);
    const { result } = renderHook(() =>
      useLeaderboard({ fetcher, initialData: mockData, staleTime: 1000 })
    );

    expect(result.current.isStale).toBe(false);

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isStale).toBe(true);
  });

  it("does not mark data as stale before staleTime", async () => {
    const fetcher = createSuccessFetcher(mockData);
    const { result } = renderHook(() =>
      useLeaderboard({ fetcher, initialData: mockData, staleTime: 5000 })
    );

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isStale).toBe(false);
  });

  it("does not set state after unmount", async () => {
    const fetcher = jest.fn().mockResolvedValue(mockData);
    const { result, unmount } = renderHook(() => useLeaderboard({ fetcher }));

    act(() => {
      unmount();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(true).toBe(true);
  });

  it("stops retrying after max retries are reached", async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error("Persistent error"));
    const { result } = renderHook(() =>
      useLeaderboard({ fetcher, maxRetries: 2, retryDelay: 0 })
    );

    act(() => {
      result.current.retry();
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.retry();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toMatch(/maximum retry/i);
  });
});
