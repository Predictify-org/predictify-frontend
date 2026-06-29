#!/usr/bin/env ts-node

import { ReconciliationService } from './reconciliation/reconcile';
import { ReconciliationReport } from './reconciliation/types';

interface ReconCliOptions {
  streamId: string;
  tolerance: bigint;
  dryRun: boolean;
  requestId: string;
}

interface ReconCliDeps {
  error: (line: string) => void;
  log: (line: string) => void;
}

function parsePositiveBigInt(value: string | undefined, flag: string): bigint {
  if (value === undefined) throw new Error(`${flag} is required`);
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return BigInt(trimmed);
}

function usage(): string {
  return [
    "Usage: ts-node scripts/recon-cli.ts --stream-id <id> [--tolerance <n>] [--dry-run]",
    "",
    "Run reconciliation for a single stream by its ID.",
    "Exits 0 on SUCCESS, 1 on MISMATCH_FOUND or FAILED.",
    "",
    "Required:",
    "  --stream-id <id>    ID of the stream to reconcile",
    "",
    "Optional:",
    "  --tolerance <n>     Tolerance in base units (default: RECONCILE_TOLERANCE env or 0)",
    "  --dry-run           Report mismatches without persisting status",
    "  --help, -h          Show this help",
  ].join("\n");
}

export function parseReconArgs(argv: string[]): ReconCliOptions {
  let streamId: string | null = null;
  let tolerance: bigint | null = null;
  let dryRun = false;
  let requestId = `recon-cli-${Date.now().toString(36)}`;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--stream-id") {
      const value = argv[index + 1];
      if (!value?.trim()) throw new Error("--stream-id must be non-empty");
      streamId = value.trim();
      index += 1;
    } else if (arg === "--tolerance") {
      tolerance = parsePositiveBigInt(argv[index + 1], "--tolerance");
      index += 1;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--request-id") {
      const value = argv[index + 1];
      if (!value?.trim()) throw new Error("--request-id must be non-empty");
      requestId = value.trim();
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (streamId === null) {
    throw new Error("--stream-id is required");
  }

  if (tolerance === null) {
    const envTol = process.env.RECONCILE_TOLERANCE;
    tolerance = envTol !== undefined ? parsePositiveBigInt(envTol, "RECONCILE_TOLERANCE") : 0n;
  }

  return { streamId, tolerance, dryRun, requestId };
}

function formatReport(report: ReconciliationReport): Record<string, unknown> {
  return {
    timestamp: report.timestamp,
    totalStreamsChecked: report.totalStreamsChecked,
    status: report.status,
    mismatches: report.mismatches.map((m) => ({
      streamId: m.streamId,
      field: m.field,
      dbValue: String(m.dbValue),
      onChainValue: String(m.onChainValue),
      toleranceApplied: m.toleranceApplied,
    })),
    errors: report.errors.map((e) => ({
      streamId: e.streamId,
      error: e.error,
    })),
  };
}

export async function runReconCli(
  argv: string[],
  deps: ReconCliDeps = console,
): Promise<number> {
  let options: ReconCliOptions;
  try {
    options = parseReconArgs(argv);
  } catch (err) {
    deps.error(
      JSON.stringify({
        error: {
          code: "INVALID_ARGUMENTS",
          message: err instanceof Error ? err.message : String(err),
          request_id: "recon-cli-argument-error",
        },
      }),
    );
    return 1;
  }

  const service = new ReconciliationService({
    tolerance: options.tolerance,
  });

  try {
    const report = await service.runReconciliation({
      streamId: options.streamId,
      dryRun: options.dryRun,
    });

    deps.log(
      JSON.stringify({
        data: formatReport(report),
        request_id: options.requestId,
      }),
    );

    if (report.status === "FAILED") {
      return 1;
    }
    if (report.status === "MISMATCH_FOUND") {
      return 1;
    }
    return 0;
  } catch (err) {
    deps.error(
      JSON.stringify({
        error: {
          code: "RECONCILIATION_FAILED",
          message: err instanceof Error ? err.message : String(err),
          request_id: options.requestId,
        },
      }),
    );
    return 1;
  }
}

if (require.main === module) {
  runReconCli(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    () => { process.exitCode = 1; },
  );
}
