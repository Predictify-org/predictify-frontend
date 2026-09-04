import { useState, useCallback, useRef, useEffect } from "react";
import { LeaderboardUser } from "@/lib/leaderboard-data";

export type LeaderboardStatus = "idle" | "loading" | "success" | "error" | "empty";

export interface LeaderboardState {
  status: LeaderboardStatus;
  data: LeaderboardUser[];
  error: string | null;
  lastUpdated: number | null;
  isStale: boolean;
}

export interface UseLeaderboardOptions {
  /** Initial data to seed the state with (useful for SSR/hydration) */
  initialData?: LeaderboardUser[];
  /** Maximum age in ms before data is considered stale */
  staleTime?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Data fetcher function */
  fetcher: () => Promise<LeaderboardUser[]>;
}

export interface UseLeaderboardReturn extends LeaderboardState {
  refetch: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_MAX_RETRIES = 3;

export function useLeaderboard({
  initialData = [],
  staleTime = DEFAULT_STALE_TIME,
  retryDelay = DEFAULT_RETRY_DELAY,
  maxRetries = DEFAULT_MAX_RETRIES,
  fetcher,
}: UseLeaderboardOptions): UseLeaderboardReturn {
  const [state, setState] = useState<LeaderboardState>(() => ({
    status: initialData.length > 0 ? "success" : "idle",
    data: initialData,
    error: null,
    lastUpdated: initialData.length > 0 ? Date.now() : null,
    isStale: false,
  }));

  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const executeFetch = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    setState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const data = await fetcher();

      if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

      const now = Date.now();
      setState({
        status: data.length === 0 ? "empty" : "success",
        data,
        error: null,
        lastUpdated: now,
        isStale: false,
      });
      retryCountRef.current = 0;
    } catch (err) {
      if (!mountedRef.current || currentFetchId !== fetchIdRef.current) return;

      const message = err instanceof Error ? err.message : "Unknown error";
      setState((prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));
    }
  }, [fetcher]);

  const refetch = useCallback(async () => {
    await executeFetch();
  }, [executeFetch]);

  const retry = useCallback(async () => {
    retryCountRef.current += 1;
    if (retryCountRef.current >= maxRetries) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Maximum retry attempts reached. Please try again later.",
      }));
      return;
    }

    if (retryDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    await executeFetch();
  }, [executeFetch, maxRetries, retryDelay]);

  const reset = useCallback(() => {
    retryCountRef.current = 0;
    setState({
      status: initialData.length > 0 ? "success" : "idle",
      data: initialData,
      error: null,
      lastUpdated: initialData.length > 0 ? Date.now() : null,
      isStale: false,
    });
  }, [initialData]);

  useEffect(() => {
    if (state.status === "success" && state.lastUpdated) {
      const interval = setInterval(() => {
        const age = Date.now() - state.lastUpdated!;
        if (age > staleTime) {
          setState((prev) => ({ ...prev, isStale: true }));
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [state.status, state.lastUpdated, staleTime]);

  return {
    ...state,
    refetch,
    retry,
    reset,
  };
}
