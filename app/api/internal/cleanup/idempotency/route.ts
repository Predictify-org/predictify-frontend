import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { logger } from "@/app/lib/logger";

/**
 * POST /api/internal/cleanup/idempotency
 *
 * Periodic maintenance job that evicts **expired** idempotency keys from the
 * persistence layer. The application uses lazy eviction (expired keys are only
 * removed when read), so long-lived keys that are never replayed accumulate
 * indefinitely. This job sweeps them proactively and is intended to be invoked
 * by an internal scheduler (cron / ops automation).
 *
 * ## Authentication
 * Requires a signed internal-service request (see
 * {@link requireInternalServiceAuth}). Only the `ops-automation` and
 * `cleanup-worker` services are permitted. Auth failures are concealed as
 * 404 so the route is not discoverable by unauthenticated callers.
 *
 * ## Request body (optional JSON)
 * - `dryRun` (boolean) — when `true`, report how many keys *would* be removed
 *   without deleting anything. Defaults to `false`.
 *
 * ## Response
 * ```json
 * { "scanned": 120, "expired": 7, "removed": 7, "remaining": 113, "dryRun": false }
 * ```
 */

interface IdempotencyEnvelope {
  readonly expiresAt?: unknown;
}

/** Returns the numeric `expiresAt` of a stored entry, or `null` if malformed. */
function readExpiry(value: unknown): number | null {
  if (value && typeof value === "object" && "expiresAt" in value) {
    const expiresAt = (value as IdempotencyEnvelope).expiresAt;
    if (typeof expiresAt === "number" && Number.isFinite(expiresAt)) {
      return expiresAt;
    }
  }
  return null;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const identity = await requireInternalServiceAuth(request, {
    allowedServices: ["ops-automation", "cleanup-worker"],
    concealFailure: true,
  });

  if (identity instanceof NextResponse) {
    return identity;
  }

  let dryRun = false;
  try {
    const raw = await request.clone().text();
    if (raw.length > 0) {
      const parsed = JSON.parse(raw) as { dryRun?: unknown };
      if (parsed.dryRun !== undefined) {
        if (typeof parsed.dryRun !== "boolean") {
          return errorResponse("INVALID_REQUEST", "`dryRun` must be a boolean.", 400);
        }
        dryRun = parsed.dryRun;
      }
    }
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const store = getStore().idempotencyStore;
  const now = Date.now();

  // Snapshot keys first so we never delete while iterating the live map.
  const expiredKeys: string[] = [];
  let scanned = 0;
  for (const [key, value] of store.entries()) {
    scanned += 1;
    const expiresAt = readExpiry(value);
    // Malformed entries (no usable expiry) are treated as stale and removed.
    if (expiresAt === null || expiresAt < now) {
      expiredKeys.push(key);
    }
  }

  let removed = 0;
  if (!dryRun) {
    for (const key of expiredKeys) {
      if (store.delete(key)) removed += 1;
    }
  }

  const remaining = store.size;
  logger.info("Idempotency cleanup completed", {
    scanned,
    expired: expiredKeys.length,
    removed,
    remaining,
    dryRun,
  });

  return NextResponse.json({
    scanned,
    expired: expiredKeys.length,
    removed: dryRun ? 0 : removed,
    remaining,
    dryRun,
  });
}
