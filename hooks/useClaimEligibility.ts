"use client";

/**
 * useClaimEligibility
 *
 * React hook that loads, derives, and exposes claim eligibility from
 * authoritative evidence for a (market, account) pair while preserving the
 * invariants required by the issue:
 *
 *  - Loading, error, retry, stale, and permission states are all modeled.
 *  - The previous (last-good) eligibility is never cleared while a new request
 *    is in flight, so users never lose the data they were looking at.
 *  - Concurrent or out-of-order responses are ignored via a monotonic request
 *    sequence + AbortController, so a slow earlier request cannot overwrite a
 *    newer one (no inconsistent / unsafe result).
 *  - The clock is injectable so state transitions are deterministic in tests.
 */

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  deriveClaimEligibility,
  unknownClaimEligibility,
} from "@/lib/claim-eligibility";
import {
  fetchClaimEligibility,
  ClaimEligibilityClientError,
} from "@/lib/claim-eligibility-client";
import type {
  ClaimEligibility,
  ClaimEligibilityFreshnessOptions,
  ClaimEvidence,
} from "@/types/claim-eligibility";

export type ClaimEligibilityPhase =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "permission_denied";

export interface UseClaimEligibilityOptions {
  marketId?: string;
  /** Connected account used to scope the request (drives the permission state). */
  account?: string;
  fetcher?: (
    marketId: string,
    options: { account?: string; signal?: AbortSignal },
  ) => Promise<ClaimEvidence>;
  /** When false, no request is made (e.g. feature flag off). Default true. */
  enabled?: boolean;
  /** Load automatically on mount / when inputs change. Default true. */
  autoLoad?: boolean;
  freshnessOptions?: ClaimEligibilityFreshnessOptions;
  /** Injectable clock for deterministic tests. */
  now?: () => number;
}

interface State {
  phase: ClaimEligibilityPhase;
  eligibility: ClaimEligibility | null;
  error: ClaimEligibilityClientError | null;
  loadCount: number;
}

const INITIAL_STATE: State = {
  phase: "idle",
  eligibility: null,
  error: null,
  loadCount: 0,
};

type Action =
  | { type: "load" }
  | { type: "success"; eligibility: ClaimEligibility }
  | { type: "error"; error: ClaimEligibilityClientError }
  | { type: "permission"; error: ClaimEligibilityClientError }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load":
      // Preserve `eligibility` so the UI keeps showing last-good data.
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
        eligibility: action.eligibility,
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

export interface UseClaimEligibilityResult {
  phase: ClaimEligibilityPhase;
  eligibility: ClaimEligibility | null;
  error: ClaimEligibilityClientError | null;
  decision: ClaimEligibility["decision"] | "unknown";
  canClaim: boolean;
  freshness: ClaimEligibility["freshness"];
  isStale: boolean;
  retryCount: number;
  retryable: boolean;
  load: () => void;
  retry: () => void;
  reset: () => void;
}

export function useClaimEligibility(
  options: UseClaimEligibilityOptions = {},
): UseClaimEligibilityResult {
  const { marketId, account, enabled = true, autoLoad = true } = options;

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

    const fetcher = current.fetcher ?? fetchClaimEligibility;
    const seq = (requestSeqRef.current += 1);
    const controller = new AbortController();

    // Cancel any in-flight request so only the newest one can apply.
    abortRef.current?.abort();
    abortRef.current = controller;

    dispatch({ type: "load" });

    fetcher(id, { account: current.account, signal: controller.signal })
      .then((evidence) => {
        if (!mountedRef.current || seq !== requestSeqRef.current) {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        const now = optsRef.current.now ?? Date.now;
        const eligibility = deriveClaimEligibility(
          evidence,
          now(),
          optsRef.current.freshnessOptions,
        );
        dispatch({ type: "success", eligibility });
      })
      .catch((error: unknown) => {
        if (!mountedRef.current || seq !== requestSeqRef.current) {
          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        const clientError =
          error instanceof ClaimEligibilityClientError
            ? error
            : new ClaimEligibilityClientError(
                error instanceof Error
                  ? error.message
                  : "Claim eligibility request failed.",
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
    // Intentionally depend only on marketId/account so re-renders with new
    // options (e.g. freshness threshold) do not trigger duplicate loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId, account, enabled, autoLoad]);

  const eligibility = state.eligibility ?? unknownClaimEligibility(marketId ?? "");

  return {
    phase: state.phase,
    eligibility: state.eligibility,
    error: state.error,
    decision: eligibility.decision,
    canClaim: eligibility.canClaim,
    freshness: eligibility.freshness,
    isStale: eligibility.freshness === "stale",
    retryCount: Math.max(0, state.loadCount - 1),
    retryable: state.error?.retryable ?? false,
    load,
    retry,
    reset,
  };
}
