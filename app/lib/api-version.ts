import type { Stream } from "@/app/types/openapi";

/**
 * API versioning utilities.
 *
 * v1 → v2 field mapping for stream objects:
 *   - `actions`        → `allowed_actions`  (renamed)
 *   - `createdAt`      → `created_at`       (snake_case)
 *   - (new)            → `settlement`       (null until settled)
 */

/** Raw stream shape returned by the data layer / v1 contract. */
export interface StreamV1 {
  id: string;
  recipient: string;
  rate: string;
  status: "draft" | "active" | "paused" | "ended";
  actions: string[];
  createdAt: string;
}

/** v2 wire shape — the canonical contract for /api/v2/streams. */
export interface StreamV2 {
  id: string;
  recipient: string;
  rate: string;
  status: "draft" | "active" | "paused" | "ended";
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
  return {
    id: v1.id,
    recipient: v1.recipient,
    rate: v1.rate,
    status: v1.status,
    allowed_actions: v1.actions,
    created_at: v1.createdAt,
    settlement: null,
  };
}

/** Convert a db Stream object to the StreamV1 shape. */
export function dbStreamToV1(stream: Stream): StreamV1 {
  return {
    id: stream.id,
    recipient: stream.recipient,
    rate: stream.rate,
    status: stream.status as StreamV1["status"],
    actions: stream.nextAction ? [stream.nextAction] : [],
    createdAt: stream.createdAt,
  };
}
