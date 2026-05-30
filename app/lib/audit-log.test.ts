/** @jest-environment node */

import { AppendOnlyAuditLogStore } from "./audit-log";

describe("AppendOnlyAuditLogStore", () => {
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
