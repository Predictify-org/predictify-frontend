/**
 * @module state-machine
 *
 * Authoritative stream lifecycle state machine for StreamPay.
 *
 * ## Stream lifecycle
 * ```
 * draft ──start──► active ──pause──► paused ──start──► active
 *   │                │                  │
 *   └──stop──►       └──stop/settle──►  └──stop/settle──►
 *                                                        ended ──withdraw──► withdrawn
 * ```
 *
 * ## Idempotent transitions
 * Certain actions are idempotent when the stream is already in the target
 * state (e.g. `start` on an `active` stream, `pause` on a `paused` stream).
 * These return `ok: true` with the unchanged status rather than an error.
 *
 * ## Usage
 * ```ts
 * const result = transition("active", "pause");
 * if (result.ok) console.log(result.nextStatus); // "paused"
 * ```
 */

import { StreamStatus, StreamAction } from "@/app/types/openapi";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Result of a state transition attempt.
 *
 * - `ok: true`  — transition is valid; `nextStatus` is the new status.
 * - `ok: false` — transition is illegal; `error` describes why.
 */
export type TransitionResult =
  | { ok: true; nextStatus: StreamStatus }
  | { ok: false; error: string; code: "ILLEGAL_TRANSITION" };

// ── Transition table ──────────────────────────────────────────────────────────

/**
 * Authoritative transition table.
 * Maps `[currentStatus][action]` → `nextStatus`.
 *
 * Only explicitly listed transitions are valid. All others are rejected
 * with `ILLEGAL_TRANSITION`.
 */
const TRANSITIONS: Partial<Record<StreamStatus, Partial<Record<StreamAction, StreamStatus>>>> = {
  draft: {
    start: "active",
    stop:  "ended",
  },
  active: {
    pause:  "paused",
    stop:   "ended",
    settle: "ended",
  },
  paused: {
    start:  "active",
    pause:  "paused",  // idempotent
    stop:   "ended",
    settle: "ended",
  },
  ended: {
    stop:     "ended",     // idempotent
    settle:   "ended",     // idempotent
    withdraw: "withdrawn",
  },
  withdrawn: {
    withdraw: "withdrawn", // idempotent
  },
};

/**
 * Actions that are idempotent when the stream is already in the implied
 * target state. These return `ok: true` with the current status unchanged.
 */
const IDEMPOTENT_ACTIONS: Partial<Record<StreamStatus, StreamAction[]>> = {
  active:    ["start"],
  paused:    ["pause"],
  ended:     ["stop", "settle"],
  withdrawn: ["withdraw"],
};

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * Compute the next stream status for a given action.
 *
 * **Preconditions:** `currentStatus` and `action` must be valid enum members.
 *
 * **Postconditions:**
 * - Returns `{ ok: true, nextStatus }` when the transition is valid.
 * - Returns `{ ok: false, code: "ILLEGAL_TRANSITION", error }` when the
 *   action is not permitted in the current status.
 *
 * **Idempotency:** Actions that are already applied (e.g. `pause` on a
 * `paused` stream) return `ok: true` with `nextStatus === currentStatus`.
 *
 * **Errors:**
 * - `ILLEGAL_TRANSITION` — action not permitted in current status.
 *
 * @param currentStatus - The stream's current lifecycle status.
 * @param action        - The action to apply.
 * @returns             {@link TransitionResult}
 *
 * @example
 * ```ts
 * transition("active", "pause")   // { ok: true, nextStatus: "paused" }
 * transition("draft",  "withdraw") // { ok: false, code: "ILLEGAL_TRANSITION", ... }
 * transition("paused", "pause")   // { ok: true, nextStatus: "paused" } (idempotent)
 * ```
 */
export function transition(
  currentStatus: StreamStatus,
  action: StreamAction,
): TransitionResult {
  // 1. Explicit transition
  const nextStatus = TRANSITIONS[currentStatus]?.[action];
  if (nextStatus) return { ok: true, nextStatus };

  // 2. Idempotent action (no state change)
  if (IDEMPOTENT_ACTIONS[currentStatus]?.includes(action)) {
    return { ok: true, nextStatus: currentStatus };
  }

  // 3. Illegal transition
  return {
    ok: false,
    error: `Action '${action}' is illegal for a stream in '${currentStatus}' state.`,
    code: "ILLEGAL_TRANSITION",
  };
}
