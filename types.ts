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

/**
 * Tunable thresholds that drive the anomaly detector.
 *
 * Defaults come from the global `streampayConfig`; tenants may override
 * individual fields via the admin API.
 */
export interface AnomalyThresholds {
  /** Maximum stream creations per minute before a burst alert fires. */
  creationBurstLimit: number;
  /** Maximum settle attempts per minute before a spike alert fires. */
  settleRateLimit: number;
  /** Submission failure ratio above which the high-failure alert fires. */
  submissionFailureThreshold?: number;
  /** Maximum DLQ depth before the depth-exceeded alert fires. */
  maxDlqDepth?: number;
}

/**
 * A single anomaly alert produced by the detector.
 *
 * `observedValue` and `threshold` are dimensionless and must be
 * interpreted in the context of the originating rule.
 */
export interface AnomalyAlert {
  /** Tenant the alert applies to. */
  tenantId: string;
  /** Which rule produced this alert. */
  ruleName: "STREAM_CREATION_BURST" | "SETTLE_RATE_SPIKE" | "HIGH_SUBMISSION_FAILURE_RATE" | "DLQ_DEPTH_EXCEEDED";
  /** Value observed for the rule's metric. */
  observedValue: number;
  /** Threshold the observed value exceeded. */
  threshold: number;
  /** Severity used for on-call routing. */
  severity: 'low' | 'medium' | 'high';
  /** ISO-8601 timestamp the alert was generated. */
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
