export type StreamStatus = "draft" | "active" | "paused" | "ended" | "withdrawn" | "cancelled";
export type StreamAction = "start" | "pause" | "stop" | "settle" | "withdraw" | "cancel";
export type WithdrawalState = "pending" | "succeeded" | "failed";

export interface WithdrawalStatus {
  state: WithdrawalState;
  requestedAt: string;
  lastCheckedAt: string;
  attempts: number;
  settlementTxHash?: string;
  confirmedTxHash?: string;
  horizonCursor?: string;
  failureCode?: string;
}

/**
 * Describes the refund split produced by cancel_stream.
 *
 * Invariant (escrow-conservation):
 *   recipientPayout + senderRefund === totalAmount - alreadyReleased
 *
 * All amounts are i128 raw units — no per-decimal logic here.
 * The contract escrow is fully drained after cancellation (no dust).
 */
export interface CancellationSplit {
  /** Raw units paid to the recipient (vested but not yet released). */
  recipientPayout: string;
  /** Raw units refunded to the sender (unvested remainder). */
  senderRefund: string;
  /** Total escrowed amount at the time of cancellation (raw units). */
  totalAmount: string;
  /** Amount already released before cancellation (raw units). */
  alreadyReleased: string;
  /** SEP-41 token address used for both legs of the split. */
  token: string;
  /** On-chain tx hash for the recipient payout leg. */
  recipientTxHash: string;
  /** On-chain tx hash for the sender refund leg (omitted when refund is zero). */
  senderTxHash?: string;
  /** ISO-8601 timestamp of the cancellation. */
  cancelledAt: string;
}

export interface Stream {
  id: string;
  recipient: string;
  rate: string;
  schedule: string;
  status: StreamStatus;
  nextAction?: StreamAction;
  email?: string;       // PII
  label?: string;       // PII
  memo?: string;        // PII
  partnerId?: string;   // PII
  createdAt: string;
  updatedAt: string;
  settlementTxHash?: string;
  withdrawal?: WithdrawalStatus;
  /**
   * SEP-41 token address for this stream's escrow.
   * "XLM" = native lumens; "CODE:ISSUER" = any Stellar Classic asset.
   * Amounts are always i128 raw units. Defaults to "XLM".
   */
  token: string;
  /**
   * Present only on cancelled streams. Contains the full refund-split
   * breakdown so callers can verify the escrow-conservation invariant.
   */
  cancellation?: CancellationSplit;
  /**
   * Wallet address of the stream sender (payer). Required for the refund leg
   * of cancel_stream. Stored at creation time.
   */
  senderAddress?: string;
  /**
   * Vested amount at the time of the last on-chain update (raw i128 units).
   * Tracks how much the recipient has earned so far.
   */
  vestedAmount?: string;
  /**
   * Amount already released to the recipient before this operation (raw i128 units).
   */
  releasedAmount?: string;
}

export interface User {
  wallet_address: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id: string;
}

export interface ApiErrorResponse {
  error: ApiError;
}

/** Stable error codes returned on invalid stream state transitions. */
export type TransitionErrorCode =
  | "ILLEGAL_TRANSITION"
  | "INVALID_COMMAND"
  | "STREAM_NOT_FOUND";

export interface TransitionError {
  code: TransitionErrorCode;
  message: string;
  current_status: StreamStatus;
  attempted_action: StreamAction;
}

export interface PaginatedMeta {
  hasNext: boolean;
  nextCursor: string | null;
  total: number;
}

export interface PaginationLinks {
  self: string;
  next?: string;
  prev?: string;
}

export interface ActivityEvent {
  id: string;
  type: string;
  streamId?: string;
  timestamp: string;
  description: string;
}

export type ExportJobStatus = "pending" | "ready" | "failed" | "expired";

export interface ExportJob {
  id: string;
  ownerId: string;
  requestedAt: string;
  status: ExportJobStatus;
  signedUrl?: string;
  signedUrlExpiresAt?: string;
  expiresAt: string;
  fileName: string;
  rows: number;
}
