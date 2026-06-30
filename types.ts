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
  /** Stream cancellations in the observation window. */
  streamCancels?: number;
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
  /** Maximum stream cancels per minute before a burst alert fires. */
  cancelBurstLimit?: number;
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
  ruleName:
    | "STREAM_CREATION_BURST"
    | "SETTLE_RATE_SPIKE"
    | "HIGH_SUBMISSION_FAILURE_RATE"
    | "DLQ_DEPTH_EXCEEDED"
    | "STREAM_CANCEL_BURST";
  /** Value observed for the rule's metric. */
  observedValue: number;
  /** Threshold the observed value exceeded. */
  threshold: number;
  /** Severity used for on-call routing. */
  severity: 'low' | 'medium' | 'high';
  /** ISO-8601 timestamp the alert was generated. */
  detectedAt: string;
}

/**
 * Mirror of the on-chain `StreamStatus` enum (see `contracts/.../storage.rs`).
 *
 * Kept as a string enum so log lines and DB rows are human-readable. The
 * values must match the contract exactly — do not rename without a
 * coordinated migration.
 */
export enum ContractStreamStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  SETTLED = "SETTLED",
  ENDED = "ENDED",
  CANCELLED = "CANCELLED",
}

/**
 * View model returned by the on-chain client when reading a stream.
 *
 * All amount fields are stroop-denominated `bigint`s. Convert to a
 * display string with `lib/format-bigint.ts` before showing in the UI.
 */
export interface OnChainStream {
  /** Numeric stream id formatted as a base-10 string. */
  id: string;
  /** Recipient Stellar address (G...). */
  recipient_address: string;
  /** Total escrowed amount, in token base units. */
  total_amount: bigint;
  /** Amount already released to the recipient. */
  released_amount: bigint;
  /** Release rate (base units per second). */
  velocity: bigint;
  /** Unix epoch seconds of the last on-chain update. */
  last_update_timestamp: number;
  /** Current status from the contract's state machine. */
  status: ContractStreamStatus;
  /** Token contract address (C...). */
  token: string;
}

/**
 * Result of cancelling a stream on chain.
 *
 * Both legs (recipient payout, sender refund) emit separate transfers;
 * the sender refund hash is optional because zero-balance refunds are
 * elided.
 */
export interface OnChainCancellationResult {
  /** Stream id that was cancelled. */
  stream_id: string;
  /** Vested amount paid out to the recipient. */
  recipient_payout: bigint;
  /** Unvested remainder refunded to the sender. */
  sender_refund: bigint;
  /** Token contract address (C...). */
  token: string;
  /** Hash of the recipient payout transaction. */
  recipient_tx_hash: string;
  /** Hash of the sender refund transaction, if any. */
  sender_tx_hash?: string;
  /** Unix epoch seconds of cancellation. */
  cancelled_at: number;
}

export interface InvariantResult {
  isValid: boolean;
  error?: string;
}

// =============================================================================
// Soroban Error Taxonomy
// =============================================================================
// Typed error enum for Soroban RPC and on-chain contract failures.
// Every variant maps to a stable ErrorCode in app/lib/errors/ so that
// Problem+JSON envelopes are deterministic across the stack.
// =============================================================================

/**
 * Discriminated union of all Soroban failure modes.
 *
 * These variants are emitted by `lib/onChainClient.ts` (and its future
 * production RPC-backed replacement) and consumed by the error mapper
 * in `app/lib/errors/mapper.ts`.
 */// =============================================================================
// Soroban Error Taxonomy
// =============================================================================

/**
 * Discriminated union of all Soroban failure modes.
 */
export enum SorobanErrorCode {
  SimulationFailed = "SimulationFailed",
  SimulationTimeout = "SimulationTimeout",
  SubmitTimeout = "SubmitTimeout",
  SubmitFailed = "SubmitFailed",
  SubmitBadAuth = "SubmitBadAuth",
  SubmitInsufficientFunds = "SubmitInsufficientFunds",
  RpcUnavailable = "RpcUnavailable",
  RpcTimeout = "RpcTimeout",
  ContractNotFound = "ContractNotFound",
  StreamNotFound = "StreamNotFound",
  StreamAlreadyExists = "StreamAlreadyExists",
  Unknown = "Unknown",
}

/**
 * Custom error class thrown by the on-chain client.
 */
export class SorobanError extends Error {
  readonly variant: SorobanErrorCode;
  readonly meta?: Record<string, unknown>;
  readonly statusCode?: number;

  constructor(
    variant: SorobanErrorCode,
    message: string,
    options?: {
      meta?: Record<string, unknown>;
      statusCode?: number;
      cause?: unknown;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "SorobanError";
    this.variant = variant;
    this.meta = options?.meta;
    this.statusCode = options?.statusCode;
    Object.setPrototypeOf(this, SorobanError.prototype);
  }

  static isSorobanError(value: unknown): value is SorobanError {
    return value instanceof SorobanError && typeof value.variant === "string";
  }
}