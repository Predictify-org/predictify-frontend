/**
 * GET /api/admin/jobs
 *
 * Surface background job statuses for ops. Returns a snapshot of all queued
 * jobs across the settlement, webhook, and retry queues, including per-job
 * metadata such as attempt count and correlation context.
 *
 * ## Authorization
 * Requires internal-service HMAC auth OR a valid admin JWT. This route MUST
 * sit behind an internal network boundary or API gateway rule in production.
 *
 * ## Response shape
 * ```json
 * {
 *   "data": {
 *     "queues": {
 *       "settlement-queue": { "count": 2, "jobs": [ ... ] },
 *       "webhook-queue":    { "count": 0, "jobs": [] },
 *       "retry-queue":      { "count": 1, "jobs": [ ... ] }
 *     },
 *     "totals": { "total": 3, "pending": 2, "failed": 1 }
 *   }
 * }
 * ```
 *
 * ## Error codes
 * | Code                   | HTTP | Meaning                                     |
 * |---|---|---|
 * | INTERNAL_AUTH_REQUIRED | 401  | Missing / invalid internal-service signature |
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireInternalServiceAuth } from "@/app/lib/internal-service-auth";
import { tryAuthenticateRequest } from "@/app/lib/auth";
import { settlementQueue, webhookQueue, retryQueue } from "@/app/lib/queue";
import { logger, withCorrelationContext, getCorrelationContext } from "@/app/lib/logger";

function errorResponse(code: string, message: string, status: number) {
  const ctx = getCorrelationContext();
  return NextResponse.json(
    { error: { code, message, request_id: ctx?.request_id ?? "unknown" } },
    { status },
  );
}

async function authenticate(request: Request): Promise<NextResponse | null> {
  const internalResult = await requireInternalServiceAuth(request, {
    concealFailure: false,
  });

  if (!(internalResult instanceof NextResponse)) {
    return null;
  }

  const jwtIdentity = tryAuthenticateRequest(request);
  if (jwtIdentity && jwtIdentity.role === "admin") {
    return null;
  }

  return internalResult;
}

/** Summarise a single queue's jobs into a serialisable snapshot. */
function queueSnapshot(queue: { getAllJobs: () => ReturnType<typeof settlementQueue.getAllJobs> }) {
  const jobs = queue.getAllJobs();
  return {
    count: jobs.length,
    jobs: jobs.map((j) => ({
      id:            j.id,
      queueName:     j.queueName,
      attempts:      j.attempts,
      maxAttempts:   j.maxAttempts,
      createdAt:     j.createdAt,
      failed:        j.attempts >= j.maxAttempts,
      correlationId: j.correlationContext?.correlation_id ?? null,
    })),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const correlation_id =
    request.headers.get("X-Correlation-ID") ?? `admin-jobs-${crypto.randomUUID()}`;
  const request_id = `req-${crypto.randomUUID()}`;

  return withCorrelationContext({ correlation_id, request_id }, async () => {
    const ctx = getCorrelationContext();

    logger.info("Admin jobs status request received", {
      correlation_id: ctx?.correlation_id,
    });

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authError = await authenticate(request);
    if (authError) {
      logger.warn("Admin jobs status rejected: unauthorized", {
        correlation_id: ctx?.correlation_id,
      });
      return authError;
    }

    logger.info("Admin jobs status authenticated", {
      correlation_id: ctx?.correlation_id,
    });

    // ── Build snapshot ────────────────────────────────────────────────────────
    const queues = {
      "settlement-queue": queueSnapshot(settlementQueue),
      "webhook-queue":    queueSnapshot(webhookQueue),
      "retry-queue":      queueSnapshot(retryQueue),
    };

    const allJobs = Object.values(queues).flatMap((q) => q.jobs);
    const totals = {
      total:   allJobs.length,
      pending: allJobs.filter((j) => !j.failed).length,
      failed:  allJobs.filter((j) => j.failed).length,
    };

    logger.info("Admin jobs status fetched", {
      total_jobs:     totals.total,
      pending_jobs:   totals.pending,
      failed_jobs:    totals.failed,
      correlation_id: ctx?.correlation_id,
    });

    return NextResponse.json({ data: { queues, totals } });
  });
}
