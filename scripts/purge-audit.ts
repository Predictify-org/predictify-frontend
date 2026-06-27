#!/usr/bin/env ts-node

import { AUDIT_LOG_RETENTION_DAYS, auditLogStore } from "../app/lib/audit-log";

interface PurgeCliOptions {
  execute: boolean;
  now: Date;
  olderThanDays: number;
  requestId: string;
}

interface PurgeCliDeps {
  error: (line: string) => void;
  log: (line: string) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function usage(): string {
  return [
    "Usage: ts-node scripts/purge-audit.ts --older-than-days <days> [--execute] [--now <iso>]",
    "",
    "Dry-run is the default. Pass --execute to remove matching rows.",
    `Recommended production threshold: ${AUDIT_LOG_RETENTION_DAYS} days or greater.`,
  ].join("\n");
}

function parsePositiveInteger(value: string | undefined, flag: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

export function parsePurgeArgs(argv: string[]): PurgeCliOptions {
  let execute = false;
  let now = new Date();
  let olderThanDays: number | null = null;
  let requestId = `audit-purge-${Date.now().toString(36)}`;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") {
      execute = true;
    } else if (arg === "--older-than-days") {
      olderThanDays = parsePositiveInteger(argv[index + 1], "--older-than-days");
      index += 1;
    } else if (arg === "--now") {
      const parsed = new Date(argv[index + 1] ?? "");
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("--now must be a valid ISO timestamp");
      }
      now = parsed;
      index += 1;
    } else if (arg === "--request-id") {
      const value = argv[index + 1];
      if (!value?.trim()) {
        throw new Error("--request-id must be non-empty");
      }
      requestId = value;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      throw new Error(usage());
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (olderThanDays === null) {
    throw new Error("--older-than-days is required");
  }

  return { execute, now, olderThanDays, requestId };
}

export function cutoffFor(options: Pick<PurgeCliOptions, "now" | "olderThanDays">): string {
  return new Date(options.now.getTime() - options.olderThanDays * MS_PER_DAY).toISOString();
}

export function runPurgeCli(argv: string[], deps: PurgeCliDeps = console): number {
  let options: PurgeCliOptions;
  try {
    options = parsePurgeArgs(argv);
  } catch (error) {
    deps.error(
      JSON.stringify({
        error: {
          code: "INVALID_ARGUMENTS",
          message: error instanceof Error ? error.message : String(error),
          request_id: "audit-purge-argument-error",
        },
      }),
    );
    return 1;
  }

  try {
    const cutoffTimestamp = cutoffFor(options);
    const result = auditLogStore.purgeArchivedRows(cutoffTimestamp, options.execute);
    deps.log(
      JSON.stringify({
        data: {
          ...result,
          mode: options.execute ? "execute" : "dry-run",
          olderThanDays: options.olderThanDays,
        },
        request_id: options.requestId,
      }),
    );

    if (options.execute && !result.chainIntactAfter) {
      deps.error(
        JSON.stringify({
          error: {
            code: "AUDIT_CHAIN_INTEGRITY_FAILED",
            message: "Audit chain integrity failed after purge.",
            request_id: options.requestId,
          },
        }),
      );
      return 1;
    }

    return 0;
  } catch (error) {
    deps.error(
      JSON.stringify({
        error: {
          code: "AUDIT_PURGE_FAILED",
          message: error instanceof Error ? error.message : String(error),
          request_id: options.requestId,
        },
      }),
    );
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = runPurgeCli(process.argv.slice(2));
}
