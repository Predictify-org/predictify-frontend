import type { Stream } from "@/app/types/openapi";

/**
 * Schema version for stream storage.
 * Increment when breaking changes are made to the storage format.
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * V1 schema: flat structure with all fields at root level
 */
export interface StreamV1 {
  id: string;
  recipient: string;
  rate: string;
  schedule: string;
  status: string;
  nextAction?: string;
  email?: string;
  label?: string;
  memo?: string;
  partnerId?: string;
  createdAt: string;
  updatedAt: string;
  settlementTxHash?: string;
  token: string;
  senderAddress?: string;
  vestedAmount?: string;
  releasedAmount?: string;
  pausedAt?: string;
  // V1 flattened fields for withdrawal and cancellation
  withdrawalState?: string;
  withdrawalRequestedAt?: string;
  withdrawalLastCheckedAt?: string;
  withdrawalAttempts?: number;
  withdrawalSettlementTxHash?: string;
  withdrawalConfirmedTxHash?: string;
  withdrawalHorizonCursor?: string;
  withdrawalFailureCode?: string;
  cancellationRecipientPayout?: string;
  cancellationSenderRefund?: string;
  cancellationTotalAmount?: string;
  cancellationAlreadyReleased?: string;
  cancellationToken?: string;
  cancellationRecipientTxHash?: string;
  cancellationSenderTxHash?: string;
  cancellationCancelledAt?: string;
}

/**
 * V2 schema: nested structure with grouped fields
 * - metadata: id, createdAt, updatedAt
 * - state: status, nextAction
 * - payment: recipient, rate, schedule, token
 * - pii: email, label, memo, partnerId
 * - accounting: vestedAmount, releasedAmount, senderAddress
 * - settlement: settlementTxHash, pausedAt
 * - withdrawal: nested object
 * - cancellation: nested object
 */
export interface StreamV2 {
  id: string;
  v: typeof CURRENT_SCHEMA_VERSION;
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
  state: {
    status: string;
    nextAction?: string;
  };
  payment: {
    recipient: string;
    rate: string;
    schedule: string;
    token: string;
  };
  pii?: {
    email?: string;
    label?: string;
    memo?: string;
    partnerId?: string;
  };
  accounting?: {
    senderAddress?: string;
    vestedAmount?: string;
    releasedAmount?: string;
  };
  settlement?: {
    txHash?: string;
    pausedAt?: string;
  };
  withdrawal?: {
    state: string;
    requestedAt: string;
    lastCheckedAt: string;
    attempts: number;
    settlementTxHash?: string;
    confirmedTxHash?: string;
    horizonCursor?: string;
    failureCode?: string;
  };
  cancellation?: {
    recipientPayout: string;
    senderRefund: string;
    totalAmount: string;
    alreadyReleased: string;
    token: string;
    recipientTxHash: string;
    senderTxHash?: string;
    cancelledAt: string;
  };
}

export type StorageSchema = StreamV1 | StreamV2;

export interface MigrationResult {
  migrated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}
