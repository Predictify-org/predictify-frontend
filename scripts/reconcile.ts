/**
 * scripts/reconcile.ts — Nightly Reconciliation Cron Entry Point
 *
 * Compares DB state to on-chain state via ReconciliationService and writes a
 * summary entry to the append-only audit log.
 *
 * Cron schedule (UTC): 0 2 * * *  (02:00 every night)
 * See operations/cron.md for scheduling and operational notes.
 *
 * Exit codes:
 *   0 — SUCCESS or MISMATCH_FOUND (report written, operator should review mismatches)
 *   1 — FAILED (critical error; page on-call)
 *
 * Environment variables:
 *   RECONCILE_TOLERANCE  — bigint tolerance for amount comparisons (default: 0)
 *   RECONCILE_DRY_RUN    — set to "true" to skip DB status persistence
 */

import { randomUUID } from "crypto";
import { ReconciliationService } from "./reconciliation/reconcile";
import { ReconciliationReport } from "./reconciliation/types";
import { AppendOnlyAuditLogStore } from "../app/lib/audit-log";

// ── Dependency-injectable surface (for unit tests) ──────────────────────────

export type NightlyReconcileOptions = {
  /** Injected ReconciliationService (defaults to real one) */
  service?: ReconciliationService;
  /** Injected audit log store (defaults to a fresh in-memory store) */
  auditLog?: AppendOnlyAuditLogStore;
  /** Injected request ID (defaults to a new UUID) */
  requestId?: string;
  /** Override dryRun flag */
  dryRun?: boolean;
};

// Module-level audit log store so a single process run shares one chain.
const defaultAuditLog = new AppendOnlyAuditLogStore();

/**
 * Run the nightly reconciliation job and write the summary to the audit log.
 * Returns the reconciliation report so callers (and tests) can inspect it.
 */
export async function runNightlyReconciliation(
  options: NightlyReconcileOptions = {},
): Promise<ReconciliationReport> {
  const requestId = options.requestId ?? randomUUID();
  const dryRun = options.dryRun ?? process.env.RECONCILE_DRY_RUN === "true";
  const auditLog = options.auditLog ?? defaultAuditLog;
  const service =
    options.service ??
    new ReconciliationService({
      tolerance: BigInt(process.env.RECONCILE_TOLERANCE ?? "0"),
    });

  const report = await service.runReconciliation({ dryRun });

  // Build a safe JSON summary for the audit log metadata.
  // BigInt values are serialised to strings to stay JSON-compatible.
  const discrepancySummary = report.mismatches.map((m) => ({
    streamId: m.streamId,
    field: m.field,
    dbValue: String(m.dbValue),
    onChainValue: String(m.onChainValue),
  }));

  auditLog.append({
    actor: { id: "system:reconcile-cron", role: "system" },
    target: { type: "account", id: "all-streams" },
    action: "reconciliation.nightly.completed",
    requestId,
    // Pass the summary as `after` so it contributes to the content hash chain.
    after: {
      status: report.status,
      totalStreamsChecked: report.totalStreamsChecked,
      mismatchCount: report.mismatches.length,
      errorCount: report.errors.length,
    },
    metadata: {
      status: report.status,
      totalStreamsChecked: report.totalStreamsChecked,
      mismatchCount: report.mismatches.length,
      errorCount: report.errors.length,
      dryRun,
      // First 20 discrepancies as a JSON string (metadata values must be scalar).
      discrepancies: JSON.stringify(discrepancySummary.slice(0, 20)),
    },
  });

  return report;
}

// ── CLI entry point ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[reconcile] Starting nightly reconciliation job at ${new Date().toISOString()}`);

  let report: ReconciliationReport;
  try {
    report = await runNightlyReconciliation();
  } catch (err) {
    console.error("[reconcile] Critical error:", err);
    process.exit(1);
  }

  // Emit the discrepancy report JSON to stdout for log aggregation.
  console.log("[reconcile] Report:", JSON.stringify({
    timestamp: report.timestamp,
    status: report.status,
    totalStreamsChecked: report.totalStreamsChecked,
    mismatchCount: report.mismatches.length,
    errorCount: report.errors.length,
    mismatches: report.mismatches.map((m) => ({
      streamId: m.streamId,
      field: m.field,
      dbValue: String(m.dbValue),
      onChainValue: String(m.onChainValue),
    })),
    errors: report.errors,
  }));

  if (report.status === "MISMATCH_FOUND") {
    console.warn(`[reconcile] WARNING: ${report.mismatches.length} mismatch(es) detected. Review the report above.`);
  }

  // Exit 1 only on hard failure so cron schedulers page on-call.
  // MISMATCH_FOUND exits 0 — the audit log entry is the notification surface.
  process.exit(report.status === "FAILED" ? 1 : 0);
}

// Only run when executed directly (not when imported in tests).
if (require.main === module) {
  main();
}
