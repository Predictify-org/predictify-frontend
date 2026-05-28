/**
 * Aggregate metric snapshot for a specific tenant within a rolling window.
 */
export interface MetricSnapshot {
  stellarSubmissionsTotal?: number;
  stellarSubmissionsFailed?: number;
  dlqDepth?: number;
  tenantId: string;
  streamCreations: number;
  settleAttempts: number;
  timestamp: number;
}

export interface AnomalyThresholds {
  submissionFailureThreshold?: number;
  maxDlqDepth?: number;
  creationBurstLimit: number; // e.g., new streams per hour
  settleRateLimit: number;    // e.g., settle attempts per hour
}

export interface AnomalyAlert {
  tenantId: string;
  ruleName: "STREAM_CREATION_BURST" | "SETTLE_RATE_SPIKE";
  observedValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}

export enum ContractStreamStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SETTLED = "SETTLED",
  ENDED = "ENDED",
  CANCELLED = "CANCELLED",
}

export interface OnChainStream {
  id: string;
  recipient_address: string;
  /**
   * SEP-41 token address for this stream's escrow.
   * "XLM" = native lumens; "CODE:ISSUER" = any Stellar Classic / SEP-41 asset.
   * All amounts are i128 raw units — no per-decimal logic in the contract layer.
   */
  token: string;
  total_amount: bigint;
  released_amount: bigint;
  velocity: bigint;
  last_update_timestamp: number;
  status: ContractStreamStatus;
}

/**
 * On-chain result of cancel_stream.
 *
 * Escrow-conservation invariant:
 *   recipient_payout + sender_refund === total_amount - released_amount
 *
 * The contract escrow is fully drained — no dust remains after cancellation.
 * Both legs use the stream's own token; tokens are never mixed across streams.
 */
export interface OnChainCancellationResult {
  stream_id: string;
  /** Raw i128 units paid to the recipient (vested − already released). */
  recipient_payout: bigint;
  /** Raw i128 units refunded to the sender (total − vested). */
  sender_refund: bigint;
  /** Token used for both legs. */
  token: string;
  /** Tx hash for the recipient payout. */
  recipient_tx_hash: string;
  /** Tx hash for the sender refund (absent when refund is zero). */
  sender_tx_hash?: string;
  /** Unix timestamp of the cancellation. */
  cancelled_at: number;
}

export interface InvariantResult {
  isValid: boolean;
  error?: string;
}
