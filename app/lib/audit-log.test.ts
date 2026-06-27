/** @jest-environment node */

import { AppendOnlyAuditLogStore } from "./audit-log";

describe("AppendOnlyAuditLogStore", () => {
  it("uses a 30-day retention window for new entries", () => {
    const store = new AppendOnlyAuditLogStore();

    const entry = store.append({
      action: "stream.settle",
      actor: { id: "ops-admin-1", role: "admin" },
      after: { status: "ended" },
      before: { status: "active" },
      requestId: "req-retention",
      target: { account: "acct_demo_001", id: "stream-1", type: "stream" },
      timestamp: "2026-04-28T10:00:00.000Z",
    });

    const expectedRetention = new Date("2026-05-28T10:00:00.000Z").toISOString();
    expect(entry.retentionUntil).toBe(expectedRetention);
  });

  it("creates a tamper-evident hash chain and rejects mutation attempts", () => {
    const store = new AppendOnlyAuditLogStore();

    const first = store.append({
      action: "stream.settle",
      actor: { id: "ops-admin-1", role: "admin" },
      after: { status: "ended" },
      before: { status: "active" },
      requestId: "req-1",
      target: { account: "acct_demo_001", id: "stream-1", type: "stream" },
      timestamp: "2026-04-28T10:00:00.000Z",
    });

    const second = store.append({
      action: "stream.withdraw",
      actor: { id: "ops-admin-1", role: "admin" },
      after: { status: "withdrawn" },
      before: { status: "ended" },
      requestId: "req-2",
      target: { account: "acct_demo_001", id: "stream-1", type: "stream" },
      timestamp: "2026-04-28T10:05:00.000Z",
    });

    expect(second.prevHash).toBe(first.entryHash);
    expect(store.assertIntegrity()).toBe(true);
    expect(() => store.updateEntry(first.id, { action: "stream.stop.override" })).toThrow("AUDIT_LOG_APPEND_ONLY");
    expect(() => store.deleteEntry(second.id)).toThrow("AUDIT_LOG_APPEND_ONLY");
  });

  it("archives expired entries and restores them without breaking the hash chain", () => {
    const store = new AppendOnlyAuditLogStore();

    const first = store.append({
      action: "stream.settle",
      actor: { id: "ops-admin-1", role: "admin" },
      after: { status: "ended" },
      before: { status: "active" },
      requestId: "req-archive-1",
      target: { account: "acct_demo_001", id: "stream-1", type: "stream" },
      timestamp: "2024-01-01T10:00:00.000Z",
    });

    const second = store.append({
      action: "stream.withdraw",
      actor: { id: "ops-admin-1", role: "admin" },
      after: { status: "withdrawn" },
      before: { status: "ended" },
      requestId: "req-archive-2",
      target: { account: "acct_demo_001", id: "stream-1", type: "stream" },
      timestamp: "2024-01-02T10:00:00.000Z",
    });

    const archived = store.archiveExpiredEntries("2024-02-05T00:00:00.000Z");

    expect(archived).toHaveLength(2);
    expect(store.count()).toBe(0);
    expect(store.assertIntegrity()).toBe(true);

    const restored = store.restoreArchivedEntries();

    expect(restored).toHaveLength(2);
    expect(restored[0].entryHash).toBe(first.entryHash);
    expect(restored[1].prevHash).toBe(first.entryHash);
    expect(restored[1].entryHash).toBe(second.entryHash);
    expect(store.count()).toBe(2);
    expect(store.assertIntegrity()).toBe(true);
  });

  it("redacts target account labels in exports", () => {
    const store = new AppendOnlyAuditLogStore();

    store.append({
      action: "stream.stop.override",
      actor: { id: "support-1", role: "support" },
      after: { status: "ended" },
      before: { status: "draft" },
      requestId: "req-export",
      target: { account: "acct_sensitive_target", id: "stream-2", type: "stream" },
      timestamp: "2026-04-28T11:00:00.000Z",
    });

    const [row] = store.exportRows({ requestId: "req-export" });

    expect(row.redactedTargetAccount).toBe("acct***rget");
    expect(row.redactionPolicy).toBe("mask-target-account");
  });
});
