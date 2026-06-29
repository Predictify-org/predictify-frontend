import {
  detectVersion,
  migrateStreamV1toV2,
  migrateStreamV2toV1,
  batchMigrateV1toV2,
} from "./engine";
import type { StreamV1, StreamV2 } from "./schema";

describe("Stream Migration Engine", () => {
  describe("detectVersion", () => {
    it("detects V1 format (flat structure without version field)", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        token: "XLM",
      };

      expect(detectVersion(v1)).toBe(1);
    });

    it("detects V2 format (has version field)", () => {
      const v2: StreamV2 = {
        id: "stream-1",
        v: 2,
        metadata: {
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        state: { status: "active" },
        payment: {
          recipient: "Alice",
          rate: "100 XLM / month",
          schedule: "Monthly",
          token: "XLM",
        },
      };

      expect(detectVersion(v2)).toBe(2);
    });

    it("defaults to V2 if has metadata", () => {
      const obj = {
        id: "stream-1",
        metadata: { createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
      };

      expect(detectVersion(obj)).toBe(2);
    });
  });

  describe("migrateStreamV1toV2", () => {
    it("migrates basic stream fields to V2 structure", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.id).toBe("stream-1");
      expect(v2.v).toBe(2);
      expect(v2.metadata.createdAt).toBe("2026-01-01T00:00:00Z");
      expect(v2.metadata.updatedAt).toBe("2026-01-02T00:00:00Z");
      expect(v2.state.status).toBe("active");
      expect(v2.state.nextAction).toBe("pause");
      expect(v2.payment.recipient).toBe("Alice");
      expect(v2.payment.rate).toBe("100 XLM / month");
      expect(v2.payment.schedule).toBe("Monthly");
      expect(v2.payment.token).toBe("XLM");
    });

    it("groups PII fields into optional pii namespace", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "active",
        email: "alice@example.com",
        label: "Design work",
        memo: "Q1 retainer",
        partnerId: "partner-123",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.pii).toEqual({
        email: "alice@example.com",
        label: "Design work",
        memo: "Q1 retainer",
        partnerId: "partner-123",
      });
    });

    it("omits empty PII namespace", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.pii).toBeUndefined();
    });

    it("groups accounting fields into optional accounting namespace", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "active",
        senderAddress: "GD123...",
        vestedAmount: "1000000000",
        releasedAmount: "500000000",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.accounting).toEqual({
        senderAddress: "GD123...",
        vestedAmount: "1000000000",
        releasedAmount: "500000000",
      });
    });

    it("groups settlement fields", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "paused",
        settlementTxHash: "abc123def456",
        pausedAt: "2026-02-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.settlement).toEqual({
        txHash: "abc123def456",
        pausedAt: "2026-02-01T00:00:00Z",
      });
    });

    it("groups flattened withdrawal fields", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "ended",
        withdrawalState: "pending",
        withdrawalRequestedAt: "2026-02-01T00:00:00Z",
        withdrawalLastCheckedAt: "2026-02-02T00:00:00Z",
        withdrawalAttempts: 3,
        withdrawalFailureCode: "timeout",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-02T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.withdrawal).toEqual({
        state: "pending",
        requestedAt: "2026-02-01T00:00:00Z",
        lastCheckedAt: "2026-02-02T00:00:00Z",
        attempts: 3,
        failureCode: "timeout",
      });
    });

    it("groups flattened cancellation fields", () => {
      const v1: StreamV1 = {
        id: "stream-1",
        recipient: "Alice",
        rate: "100 XLM / month",
        schedule: "Monthly",
        status: "cancelled",
        cancellationRecipientPayout: "1000000",
        cancellationSenderRefund: "500000",
        cancellationTotalAmount: "1500000",
        cancellationAlreadyReleased: "0",
        cancellationToken: "XLM",
        cancellationRecipientTxHash: "txhash1",
        cancellationCancelledAt: "2026-02-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
        token: "XLM",
      };

      const v2 = migrateStreamV1toV2(v1);

      expect(v2.cancellation).toEqual({
        recipientPayout: "1000000",
        senderRefund: "500000",
        totalAmount: "1500000",
        alreadyReleased: "0",
        token: "XLM",
        recipientTxHash: "txhash1",
        cancelledAt: "2026-02-01T00:00:00Z",
      });
    });
  });

  describe("migrateStreamV2toV1", () => {
    it("flattens V2 structure back to V1", () => {
      const v2: StreamV2 = {
        id: "stream-1",
        v: 2,
        metadata: {
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        },
        state: { status: "active", nextAction: "pause" },
        payment: {
          recipient: "Alice",
          rate: "100 XLM / month",
          schedule: "Monthly",
          token: "XLM",
        },
        pii: { email: "alice@example.com" },
      };

      const v1 = migrateStreamV2toV1(v2);

      expect(v1.id).toBe("stream-1");
      expect(v1.recipient).toBe("Alice");
      expect(v1.createdAt).toBe("2026-01-01T00:00:00Z");
      expect(v1.email).toBe("alice@example.com");
      expect(v1.status).toBe("active");
    });

    it("flattens nested withdrawal object", () => {
      const v2: StreamV2 = {
        id: "stream-1",
        v: 2,
        metadata: {
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        state: { status: "ended" },
        payment: {
          recipient: "Alice",
          rate: "100 XLM / month",
          schedule: "Monthly",
          token: "XLM",
        },
        withdrawal: {
          state: "succeeded",
          requestedAt: "2026-02-01T00:00:00Z",
          lastCheckedAt: "2026-02-02T00:00:00Z",
          attempts: 1,
        },
      };

      const v1 = migrateStreamV2toV1(v2);

      expect(v1.withdrawalState).toBe("succeeded");
      expect(v1.withdrawalAttempts).toBe(1);
    });
  });

  describe("batchMigrateV1toV2", () => {
    it("migrates multiple V1 streams", () => {
      const streams: StreamV1[] = [
        {
          id: "stream-1",
          recipient: "Alice",
          rate: "100 XLM / month",
          schedule: "Monthly",
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          token: "XLM",
        },
        {
          id: "stream-2",
          recipient: "Bob",
          rate: "50 XLM / week",
          schedule: "Weekly",
          status: "draft",
          createdAt: "2026-01-05T00:00:00Z",
          updatedAt: "2026-01-05T00:00:00Z",
          token: "XLM",
        },
      ];

      const result = batchMigrateV1toV2(streams);

      expect(result.migrated).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("handles streams that are already V2", () => {
      const streams: StreamV2[] = [
        {
          id: "stream-1",
          v: 2,
          metadata: {
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
          state: { status: "active" },
          payment: {
            recipient: "Alice",
            rate: "100 XLM / month",
            schedule: "Monthly",
            token: "XLM",
          },
        },
      ];

      const result = batchMigrateV1toV2(streams);

      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("counts successful migrations in batch", () => {
      const streams = [
        {
          id: "stream-1",
          recipient: "Alice",
          rate: "100 XLM / month",
          schedule: "Monthly",
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          token: "XLM",
        },
        {
          id: "stream-2",
          recipient: "Bob",
          rate: "50 XLM / week",
          schedule: "Weekly",
          status: "draft",
          createdAt: "2026-01-05T00:00:00Z",
          updatedAt: "2026-01-05T00:00:00Z",
          token: "XLM",
        },
        {
          id: "stream-3",
          recipient: "Charlie",
          rate: "25 XLM / day",
          schedule: "Daily",
          status: "ended",
          createdAt: "2026-01-10T00:00:00Z",
          updatedAt: "2026-01-10T00:00:00Z",
          token: "XLM",
        },
      ] as StreamV1[];

      const result = batchMigrateV1toV2(streams);

      expect(result.migrated).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
