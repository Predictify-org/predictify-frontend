"use client";

/**
 * useOracleStatus
 *
 * React hook that loads, derives, and exposes oracle freshness + fallback
 * status for a market while preserving the invariants required by the issue:
 *
 *  - Loading, error, retry, stale, and permission states are all modeled.
 *  - The previous (last-good) status is never cleared while a new request is
 *    in flight, so users never lose the data they were looking at.
 *  - Concurrent or out-of-order responses are ignored via a monotonic request
 *    sequence + AbortController, so a slow earlier request cannot overwrite a
 *    newer one (no inconsistent/un-safe result).
 *  - The clock is injectable so state transitions are deterministic in tests.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  deriveOracleStatus,
  unknownOracleStatus,
} from "@/lib/oracle-status";
import {
  fetchOracleAttempts,
  OracleStatusClientError,
} from "@/lib/oracle-status-client";
import type {
  OracleAttemptResult,
  OracleFreshnessOptions,
  OracleStatus,
} from "@/types/oracle-status";

export type OracleStatusPhase =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "permission_denied";

export interface UseOracleStatusOptions {
  marketId?: string;
  fetcher?: (
    marketId: string,
    options: { signal?: AbortSignal },
  ) => Promise<OracleAttemptResult[]>;
  /** When false, no request is made (e.g. feature flag off). Default true. */
  enabled?: boolean;
  /** Load automatically on mount / when marketId changes. Default true. */
  autoLoad?: boolean;
  freshnessOptions?: OracleFreshnessOptions;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

interface State {
  phase: OracleStatusPhase;
  status: OracleStatus | null;
  attempts: OracleAttemptResult[] | null;
  error: OracleStatusClientError | null;
  loadCount: number;
}

const INITIAL_STATE: State = {
  phase: "idle",
  status: null,
  attempts: null,
  error: null,
  loadCount: 0,
};

type Action =
  | { type: "load" }
  | { type: "success"; status: OracleStatus; attempts: OracleAttemptResult[] }
  | { type: "error"; error: OracleStatusClientError }
  | { type: "permission"; error: OracleStatusClientError }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      // Preserve `status`/`attempts` so the UI keeps showing last-good data.
      return {
        ...state,
        phase: "loading",
        error: null,
        loadCount: state.loadCount + 1,
      };
    case "success":
      return {
        ...state,
        phase: "success",
        status: action.status,
        attempts: action.attempts,
        error: null,
      };
    case "error":
      return { ...state, phase: "error", error: action.error };
    case "permission":
      return { ...state, phase: "permission_denied", error: action.error };
    case "reset":
      return INITIAL_STATE;
    default:
      return state;
  }
}

export interface UseOracleStatusResult {
  phase: OracleStatusPhase;
  status: OracleStatus | null;
  attempts: OracleAttemptResult[] | null;
  error: OracleStatusClientError | null;
  lastUpdatedAt: number | null;
  freshness: OracleStatus["freshness"];
  isStale: boolean;
  isFallback: boolean;
  retryCount: number;
  retryable: boolean;
  load: () => void;
  retry: () => void;
  reset: () => void;
}

export function useOracleStatus(
  options: UseOracleStatusOptions = {},
): UseOracleStatusResult {
  const { marketId, enabled = true, autoLoad = true } = options;

  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Keep the latest options in refs so the stable `load` callback always reads
  // fresh values without needing to be re-created (avoids effect churn).
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const load = useCallback(() => {
    const current = optsRef.current;
    const id = current.marketId?.trim();

    if (!id || current.enabled === false) {
      return;
    }

    const fetcher = current.fetcher ?? fetchOracleAttempts;
    const seq = (requestSeqRef.current += 1);
    const controller = new AbortController();

    // Cancel any in-flight request so only the newest one can apply.
    abortRef.current?.abort();
    abortRef.current = controller;

    dispatch({ type: "load" });

    fetcher(id, { signal: controller.signal })
      .then((attempts) => {
        if (!mountedRef.current || seq !== requestSeqRef.current) {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        const now = optsRef.current.now ?? Date.now;
        const status = deriveOracleStatus(
          attempts,
          now(),
          optsRef.current.freshnessOptions,
        );
        dispatch({ type: "success", status, attempts });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || seq !== requestSeqRef.current) {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        const clientError =
          error instanceof OracleStatusClientError
            ? error
            : new OracleStatusClientError(
                error instanceof Error
                  ? error.message
                  : "Oracle status request failed.",
                "network",
                true,
              );

        if (clientError.kind === "permission") {
          dispatch({ type: "permission", error: clientError });
        } else {
          dispatch({ type: "error", error: clientError });
        }
      });
  }, []);

  const retry = useCallback(() => {
    load();
  }, [load]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    requestSeqRef.current += 1;
    dispatch({ type: "reset" });
  }, []);

  useEffect(() => {
    if (enabled && autoLoad && marketId?.trim()) {
      load();
    }
    // Intentionally depend only on marketId so re-renders with new options
    // (e.g. freshness threshold) do not trigger duplicate loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, enabled, autoLoad]);

  const status = state.status ?? unknownOracleStatus();

  return {
    phase: state.phase,
    status: state.status,
    attempts: state.attempts,
    error: state.error,
    lastUpdatedAt: status.lastUpdatedAt,
    freshness: status.freshness,
    isStale: status.freshness === "stale",
    isFallback: status.fallback?.usedFallback ?? false,
    retryCount: Math.max(0, state.loadCount - 1),
    retryable: state.error?.retryable ?? false,
    load,
    retry,
    reset,
  };
}
