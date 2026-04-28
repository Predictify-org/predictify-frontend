export type StreamStatus = "draft" | "active" | "paused" | "ended" | "withdrawn";
export type StreamAction = "start" | "pause" | "stop" | "settle" | "withdraw";
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
  requestedAt: string;
  status: ExportJobStatus;
  signedUrl?: string;
  signedUrlExpiresAt?: string;
  expiresAt: string;
  fileName: string;
  rows: number;
}
