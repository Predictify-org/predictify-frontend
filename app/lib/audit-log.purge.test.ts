/** @jest-environment node */

import { AppendOnlyAuditLogStore } from "./audit-log";
import type { AuditEntryInput } from "@/app/types/audit";

function entry(id: string, timestamp: string): AuditEntryInput {
  return {
    action: "stream.settle",
    actor: { id: `actor-${id}`, role: "admin" },
    after: { status: "ended" },
    before: { status: "active" },
    requestId: `req-${id}`,
    target: { id: `stream-${id}`, type: "stream" },
    timestamp,
  };
}

describe("AppendOnlyAuditLogStore.purgeArchivedRows", () => {
  it("dry-runs without mutating the store", () => {
    const store = new AppendOnlyAuditLogStore();
    store.reset([
      entry("old", "2022-01-01T00:00:00.000Z"),
      entry("fresh", "2026-06-01T00:00:00.000Z"),
    ]);

    const result = store.purgeArchivedRows("2025-01-01T00:00:00.000Z");

    expect(result).toMatchObject({
      chainIntactAfter: true,
      chainIntactBefore: true,
      executed: false,
      purgedEntries: 1,
      retainedEntries: 1,
    });
    expect(store.count()).toBe(2);
    expect(store.assertIntegrity()).toBe(true);
  });

  it("purges rows before the cutoff and preserves retained-chain integrity", () => {
    const store = new AppendOnlyAuditLogStore();
    store.reset([
      entry("old-1", "2021-01-01T00:00:00.000Z"),
      entry("old-2", "2022-01-01T00:00:00.000Z"),
      entry("fresh", "2026-06-01T00:00:00.000Z"),
    ]);

    const result = store.purgeArchivedRows("2025-01-01T00:00:00.000Z", true);

    expect(result.executed).toBe(true);
    expect(result.purgedEntries).toBe(2);
    expect(result.retainedEntries).toBe(1);
    expect(result.chainIntactAfter).toBe(true);
    expect(store.count()).toBe(1);
    expect(store.list()[0].target.id).toBe("stream-fresh");
    expect(store.assertIntegrity()).toBe(true);
  });

  it("rejects malformed cutoff timestamps", () => {
    const store = new AppendOnlyAuditLogStore();
    expect(() => store.purgeArchivedRows("not-a-date")).toThrow("INVALID_PURGE_CUTOFF");
  });
});
