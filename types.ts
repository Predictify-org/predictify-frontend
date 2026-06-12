/**
 * A point-in-time snapshot of per-tenant operational metrics.
 *
 * Emitted by the anomaly detector and the metrics scraper. All counters
 * are monotonic within a tenant; gauges (`dlqDepth`, latencies) reflect
 * the value at `timestamp`.
 */
export interface MetricSnapshot {
  /** Tenant (organisation) the snapshot is scoped to. */
  tenantId: string;
  /** Streams created in the observation window. */
  streamCreations: number;
  /** Settle attempts (successful or otherwise) in the observation window. */
  settleAttempts: number;
  /** Unix epoch milliseconds at which the snapshot was taken. */
  timestamp: number;
  /** Total Stellar transaction submissions in the window. */
  stellarSubmissionsTotal?: number;
  /** Submissions that returned a failure result. */
  stellarSubmissionsFailed?: number;
  /** Current dead-letter queue depth for failed background jobs. */
  dlqDepth?: number;
  /** Age in seconds of the oldest pending job in the queue. */
  oldestPendingJobSeconds?: number;
  /** Rolling p95 latency for settlement transactions. */
  p95SettlementLatencySeconds?: number;
}

export interface AnomalyThresholds {
  creationBurstLimit: number;
  settleRateLimit: number;
  submissionFailureThreshold?: number;
  maxDlqDepth?: number;
}

export interface AnomalyAlert {
  tenantId: string;
  ruleName: "STREAM_CREATION_BURST" | "SETTLE_RATE_SPIKE" | "HIGH_SUBMISSION_FAILURE_RATE" | "DLQ_DEPTH_EXCEEDED";
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
  total_amount: bigint;
  released_amount: bigint;
  velocity: bigint;
  last_update_timestamp: number;
  status: ContractStreamStatus;
  token: string;
}

export interface OnChainCancellationResult {
  stream_id: string;
  recipient_payout: bigint;
  sender_refund: bigint;
  token: string;
  recipient_tx_hash: string;
  sender_tx_hash?: string;
  cancelled_at: number;
}

export interface InvariantResult {
  isValid: boolean;
  error?: string;
}
