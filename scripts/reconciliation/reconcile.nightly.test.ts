/** @jest-environment node */
import { runNightlyReconciliation } from "../reconcile";
import { AppendOnlyAuditLogStore } from "../../app/lib/audit-log";
import { ReconciliationService } from "./reconcile";

function makeService(overrides: Partial<ReturnType<ReconciliationService["runReconciliation"]>> = {}) {
  const report = {
    timestamp: "2026-06-25T02:00:00.000Z",
    totalStreamsChecked: 5,
    mismatches: [],
    errors: [],
    status: "SUCCESS" as const,
    ...overrides,
  };
  return {
    runReconciliation: jest.fn().mockResolvedValue(report),
  } as unknown as ReconciliationService;
}

describe("runNightlyReconciliation", () => {
  it("returns the report from the reconciliation service", async () => {
    const service = makeService({ totalStreamsChecked: 3 });
    const report = await runNightlyReconciliation({ service, requestId: "req-1" });
    expect(report.status).toBe("SUCCESS");
    expect(report.totalStreamsChecked).toBe(3);
  });

  it("writes a reconciliation.nightly.completed entry to the audit log", async () => {
    const auditLog = new AppendOnlyAuditLogStore();
    const service = makeService();

    await runNightlyReconciliation({ service, auditLog, requestId: "req-audit" });

    const entries = auditLog.list({ action: "reconciliation.nightly.completed" });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: "reconciliation.nightly.completed",
      actor: { id: "system:reconcile-cron", role: "system" },
      target: { type: "account", id: "all-streams" },
      requestId: "req-audit",
    });
  });

  it("audit log metadata reflects report summary", async () => {
    const auditLog = new AppendOnlyAuditLogStore();
    const service = makeService({
      status: "MISMATCH_FOUND",
      totalStreamsChecked: 10,
      mismatches: [
        { streamId: "s1", field: "released_amount", dbValue: 50n, onChainValue: 60n, toleranceApplied: false },
      ],
      errors: [],
    });

    await runNightlyReconciliation({ service, auditLog, requestId: "req-mismatch" });

    const [entry] = auditLog.list({ action: "reconciliation.nightly.completed" });
    expect(entry.metadata).toMatchObject({
      status: "MISMATCH_FOUND",
      totalStreamsChecked: 10,
      mismatchCount: 1,
      errorCount: 0,
    });
  });

  it("passes dryRun flag through to the reconciliation service", async () => {
    const service = makeService();
    await runNightlyReconciliation({ service, requestId: "req-dry", dryRun: true });
    expect(service.runReconciliation).toHaveBeenCalledWith({ dryRun: true });
  });

  it("writes dryRun flag into audit log metadata", async () => {
    const auditLog = new AppendOnlyAuditLogStore();
    const service = makeService();
    await runNightlyReconciliation({ service, auditLog, requestId: "req-dry-flag", dryRun: true });
    const [entry] = auditLog.list({ action: "reconciliation.nightly.completed" });
    expect(entry.metadata?.dryRun).toBe(true);
  });

  it("still writes an audit entry when the report status is FAILED", async () => {
    const auditLog = new AppendOnlyAuditLogStore();
    const service = makeService({ status: "FAILED", errors: [{ streamId: "s1", error: "RPC down" }] });
    const report = await runNightlyReconciliation({ service, auditLog, requestId: "req-fail" });
    expect(report.status).toBe("FAILED");
    const entries = auditLog.list({ action: "reconciliation.nightly.completed" });
    expect(entries).toHaveLength(1);
    expect(entries[0].metadata?.status).toBe("FAILED");
  });

  it("serialises bigint mismatch values to strings in the audit entry", async () => {
    const auditLog = new AppendOnlyAuditLogStore();
    const service = makeService({
      status: "MISMATCH_FOUND",
      mismatches: [{ streamId: "s1", field: "total_amount", dbValue: 999999999999n, onChainValue: 1n, toleranceApplied: false }],
    });

    await runNightlyReconciliation({ service, auditLog, requestId: "req-bigint" });

    const [entry] = auditLog.list({ action: "reconciliation.nightly.completed" });
    const discrepancies = JSON.parse(entry.metadata!.discrepancies as string) as Array<Record<string, string>>;
    expect(discrepancies[0].dbValue).toBe("999999999999");
    expect(discrepancies[0].onChainValue).toBe("1");
  });
});
