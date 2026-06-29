import type { Stream } from "@/app/types/openapi";
import type { StreamV1, StreamV2, MigrationResult } from "./schema";
import { CURRENT_SCHEMA_VERSION } from "./schema";

/**
 * Detect schema version of a stream object
 */
export function detectVersion(stream: any): 1 | 2 {
  // V2 has explicit version field
  if (typeof stream?.v === "number") {
    return stream.v as 1 | 2;
  }
  // V1 has no version field and flat structure
  if (stream?.id && !stream?.metadata) {
    return 1;
  }
  // Default to V2 if has metadata
  return stream?.metadata ? 2 : 1;
}

/**
 * Migrate a single stream from V1 to V2
 */
export function migrateStreamV1toV2(v1: StreamV1): StreamV2 {
  const v2: StreamV2 = {
    id: v1.id,
    v: CURRENT_SCHEMA_VERSION,
    metadata: {
      createdAt: v1.createdAt,
      updatedAt: v1.updatedAt,
    },
    state: {
      status: v1.status,
      nextAction: v1.nextAction,
    },
    payment: {
      recipient: v1.recipient,
      rate: v1.rate,
      schedule: v1.schedule,
      token: v1.token,
    },
  };

  // PII fields (optional)
  if (
    v1.email ||
    v1.label ||
    v1.memo ||
    v1.partnerId
  ) {
    v2.pii = {
      email: v1.email,
      label: v1.label,
      memo: v1.memo,
      partnerId: v1.partnerId,
    };
  }

  // Accounting fields (optional)
  if (
    v1.senderAddress ||
    v1.vestedAmount ||
    v1.releasedAmount
  ) {
    v2.accounting = {
      senderAddress: v1.senderAddress,
      vestedAmount: v1.vestedAmount,
      releasedAmount: v1.releasedAmount,
    };
  }

  // Settlement fields (optional)
  if (v1.settlementTxHash || v1.pausedAt) {
    v2.settlement = {
      txHash: v1.settlementTxHash,
      pausedAt: v1.pausedAt,
    };
  }

  // Withdrawal fields (optional)
  if (v1.withdrawalState) {
    v2.withdrawal = {
      state: v1.withdrawalState,
      requestedAt: v1.withdrawalRequestedAt || "",
      lastCheckedAt: v1.withdrawalLastCheckedAt || "",
      attempts: v1.withdrawalAttempts || 0,
      settlementTxHash: v1.withdrawalSettlementTxHash,
      confirmedTxHash: v1.withdrawalConfirmedTxHash,
      horizonCursor: v1.withdrawalHorizonCursor,
      failureCode: v1.withdrawalFailureCode,
    };
  }

  // Cancellation fields (optional)
  if (v1.cancellationRecipientPayout) {
    v2.cancellation = {
      recipientPayout: v1.cancellationRecipientPayout,
      senderRefund: v1.cancellationSenderRefund || "",
      totalAmount: v1.cancellationTotalAmount || "",
      alreadyReleased: v1.cancellationAlreadyReleased || "",
      token: v1.cancellationToken || "",
      recipientTxHash: v1.cancellationRecipientTxHash || "",
      senderTxHash: v1.cancellationSenderTxHash,
      cancelledAt: v1.cancellationCancelledAt || "",
    };
  }

  return v2;
}

/**
 * Migrate a stream from V2 back to V1 (for legacy compatibility if needed)
 */
export function migrateStreamV2toV1(v2: StreamV2): StreamV1 {
  const v1: StreamV1 = {
    id: v2.id,
    recipient: v2.payment.recipient,
    rate: v2.payment.rate,
    schedule: v2.payment.schedule,
    status: v2.state.status,
    nextAction: v2.state.nextAction,
    createdAt: v2.metadata.createdAt,
    updatedAt: v2.metadata.updatedAt,
    token: v2.payment.token,
    email: v2.pii?.email,
    label: v2.pii?.label,
    memo: v2.pii?.memo,
    partnerId: v2.pii?.partnerId,
    senderAddress: v2.accounting?.senderAddress,
    vestedAmount: v2.accounting?.vestedAmount,
    releasedAmount: v2.accounting?.releasedAmount,
    settlementTxHash: v2.settlement?.txHash,
    pausedAt: v2.settlement?.pausedAt,
  };

  if (v2.withdrawal) {
    v1.withdrawalState = v2.withdrawal.state;
    v1.withdrawalRequestedAt = v2.withdrawal.requestedAt;
    v1.withdrawalLastCheckedAt = v2.withdrawal.lastCheckedAt;
    v1.withdrawalAttempts = v2.withdrawal.attempts;
    v1.withdrawalSettlementTxHash = v2.withdrawal.settlementTxHash;
    v1.withdrawalConfirmedTxHash = v2.withdrawal.confirmedTxHash;
    v1.withdrawalHorizonCursor = v2.withdrawal.horizonCursor;
    v1.withdrawalFailureCode = v2.withdrawal.failureCode;
  }

  if (v2.cancellation) {
    v1.cancellationRecipientPayout = v2.cancellation.recipientPayout;
    v1.cancellationSenderRefund = v2.cancellation.senderRefund;
    v1.cancellationTotalAmount = v2.cancellation.totalAmount;
    v1.cancellationAlreadyReleased = v2.cancellation.alreadyReleased;
    v1.cancellationToken = v2.cancellation.token;
    v1.cancellationRecipientTxHash = v2.cancellation.recipientTxHash;
    v1.cancellationSenderTxHash = v2.cancellation.senderTxHash;
    v1.cancellationCancelledAt = v2.cancellation.cancelledAt;
  }

  return v1;
}

/**
 * Batch migrate streams from V1 to V2
 */
export function batchMigrateV1toV2(
  streams: Array<StreamV1 | StreamV2>,
): MigrationResult {
  const result: MigrationResult = {
    migrated: 0,
    failed: 0,
    errors: [],
  };

  for (const stream of streams) {
    try {
      const version = detectVersion(stream);
      if (version === 1) {
        // Already has a migration applied or is V1
        migrateStreamV1toV2(stream as StreamV1);
        result.migrated++;
      } else {
        // Already V2
        result.migrated++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        id: stream.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}
