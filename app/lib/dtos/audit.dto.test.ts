import { AuditResponseSchema, AuditEntrySchema } from "./audit.dto";

describe("Audit DTOs", () => {
  it("validates a correct AuditEntry", () => {
    const validEntry = {
      id: "audit-123",
      actor: {
        id: "user-1",
        role: "admin",
      },
      target: {
        type: "stream",
        id: "stream-1",
        account: "acct_123",
      },
      action: "stream.create",
      beforeHash: null,
      afterHash: "hash-after",
      diffHash: "hash-diff",
      requestId: "req-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      prevHash: null,
      entryHash: "hash-entry",
      retentionUntil: "2025-01-01T00:00:00.000Z",
    };

    const result = AuditEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });

  it("fails on invalid actor role", () => {
    const invalidEntry = {
      id: "audit-123",
      actor: {
        id: "user-1",
        role: "superadmin", // Invalid role
      },
      target: {
        type: "stream",
        id: "stream-1",
      },
      action: "stream.create",
      beforeHash: null,
      afterHash: null,
      diffHash: null,
      requestId: "req-1",
      timestamp: "2024-01-01T00:00:00.000Z",
      prevHash: null,
      entryHash: "hash-entry",
      retentionUntil: "2025-01-01T00:00:00.000Z",
    };

    const result = AuditEntrySchema.safeParse(invalidEntry);
    expect(result.success).toBe(false);
  });

  it("validates a complete AuditResponse", () => {
    const validResponse = {
      access: {
        actorId: "user-1",
        role: "admin",
      },
      data: [],
      links: {
        self: "/api/audit",
      },
      meta: {
        chainIntact: true,
        retentionDays: 365,
        total: 0,
      },
    };

    const result = AuditResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });
});
