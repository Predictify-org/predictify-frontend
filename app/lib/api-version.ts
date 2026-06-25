/**
 * API versioning utilities.
 *
 * v1 → v2 field mapping for stream objects:
 *   - `actions`        → `allowed_actions`  (renamed)
 *   - `createdAt`      → `created_at`       (snake_case)
 *   - (new)            → `settlement`       (null until settled)
 */

import type { StreamStatus } from "@/app/types/openapi";

/** Raw stream shape returned by the data layer / v1 contract. */
export interface StreamV1 {
  id: string;
  recipient: string;
  rate: string;
  status: StreamStatus;
  actions?: string[];
  nextAction?: string;
  createdAt: string;
}

/** v2 wire shape — the canonical contract for /api/v2/streams. */
export interface StreamV2 {
  id: string;
  recipient: string;
  rate: string;
  status: StreamStatus;
  /** Replaces v1 `actions`. */
  allowed_actions: string[];
  /** ISO-8601 timestamp; replaces v1 `createdAt`. */
  created_at: string;
  /**
   * Settlement details once a stream has been settled, otherwise `null`.
   * Clients must handle `null` explicitly.
   */
  settlement: StreamSettlement | null;
}

export interface StreamSettlement {
  settled_at: string;
  amount: string;
  currency: string;
}

/** Convert a v1 stream object to the v2 wire shape. */
export function toV2Stream(v1: StreamV1): StreamV2 {
  const allowedActions = v1.actions ?? (v1.nextAction ? [v1.nextAction] : []);
  return {
    id: v1.id,
    recipient: v1.recipient,
    rate: v1.rate,
    status: v1.status,
    allowed_actions: allowedActions,
    created_at: v1.createdAt,
    settlement: null,
  };
}
