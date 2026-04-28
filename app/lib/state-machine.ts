import { StreamStatus, StreamAction } from "@/app/types/openapi";

export type TransitionResult = 
  | { ok: true; nextStatus: StreamStatus }
  | { ok: false; error: string; code: "ILLEGAL_TRANSITION" };

/**
 * Authoritative transition table for StreamPay streams.
 * Maps [CurrentStatus][Action] -> NextStatus
 */
const TRANSITIONS: Partial<Record<StreamStatus, Partial<Record<StreamAction, StreamStatus>>>> = {
  draft: {
    start: "active",
    stop: "ended",
  },
  active: {
    pause: "paused",
    stop: "ended",
    settle: "ended",
  },
  paused: {
    start: "active", // start and resume are often synonymous in UX
    pause: "paused", // Idempotent
    stop: "ended",
    settle: "ended",
  },
  ended: {
    stop: "ended", // Idempotent
    settle: "ended", // Idempotent
    withdraw: "withdrawn",
  },
  withdrawn: {
    withdraw: "withdrawn", // Idempotent
  }
};

/**
 * Handle idempotent transitions where the action is already applied.
 */
const IDEMPOTENT_ACTIONS: Partial<Record<StreamStatus, StreamAction[]>> = {
  active: ["start"],
  paused: ["pause"],
  ended: ["stop", "settle"],
  withdrawn: ["withdraw"],
};

export function transition(currentStatus: StreamStatus, action: StreamAction): TransitionResult {
  // 1. Check for explicit transitions
  const nextStatus = TRANSITIONS[currentStatus]?.[action];
  if (nextStatus) {
    return { ok: true, nextStatus };
  }

  // 2. Check for idempotent actions (no state change)
  if (IDEMPOTENT_ACTIONS[currentStatus]?.includes(action)) {
    return { ok: true, nextStatus: currentStatus };
  }

  // 3. Reject illegal transitions
  return { 
    ok: false, 
    error: `Action '${action}' is illegal for a stream in '${currentStatus}' state.`,
    code: "ILLEGAL_TRANSITION" 
  };
}
