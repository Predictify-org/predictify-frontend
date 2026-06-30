/**
 * POST /api/streams/preview
 *
 * Dry-run endpoint for stream creation. Accepts the same body as
 * POST /api/streams but does NOT persist anything. Returns a cost estimate,
 * the expected lifecycle events, and a preview stream object.
 *
 * - Rate-limited via the existing "write" tier (same as POST /api/streams).
 * - No idempotency check needed — dry-runs are always safe to repeat.
 * - No token allowlist check — preview is informational only.
 * - Returns 200 for valid previews (even with warnings).
 * - Returns 400 for invalid bodies with a standardised error envelope.
 */

import { NextResponse } from "next/server";
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { validateCreateStreamBody } from "@/app/lib/stream-validation";
import { estimateStreamCost } from "@/app/lib/preflight-estimate";
import { normaliseToken } from "@/app/lib/token-allowlist";
import type { SupportedAsset } from "@/app/lib/amount";
import type { PreflightEstimate } from "@/app/lib/preflight-estimate";
import type { ValidationError } from "@/app/lib/stream-validation";

// ── Types ──────────────────────────────────────────────────────────────────

interface EstimatedEvent {
  type: string;
  description: string;
}

interface PreviewStream {
  id: string;
  status: string;
  amount: string;
  asset: string;
  recipient: string;
  sender: string;
  schedule: object;
}

interface PreviewResponseData {
  valid: boolean;
  validation_errors?: ValidationError[];
  estimated_events: EstimatedEvent[];
  cost_estimate: PreflightEstimate;
  preview_stream: PreviewStream;
}

interface PreviewResponse {
  data: PreviewResponseData;
  meta: {
    dry_run: true;
    request_id: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getRequestUrl(request: Request): URL {
  try {
    return request.url ? new URL(request.url) : new URL("http://localhost/api/streams/preview");
  } catch {
    return new URL("http://localhost/api/streams/preview");
  }
}

function createErrorResponse(code: string, message: string, status: number, details?: unknown) {
  const context = getCorrelationContext();
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        request_id: context?.request_id,
      },
    },
    { status },
  );
}

/**
 * Derive the ordered list of lifecycle events that would be emitted when a
 * stream is created. The exact set depends on the schedule value:
 * - All streams emit "stream.created".
 * - Streams with an immediate schedule also emit "stream.started".
 * - Future: "stream.settled", "stream.ended" are always included as eventual
 *   events so the caller can reason about the full lifecycle.
 */
function deriveEstimatedEvents(schedule: string): EstimatedEvent[] {
  const events: EstimatedEvent[] = [
    {
      type: "stream.created",
      description: "The stream record is created on-chain and assigned a unique ID.",
    },
    {
      type: "stream.started",
      description: "The stream transitions to active and begins accumulating payouts.",
    },
    {
      type: "stream.settled",
      description: "Periodic settlement tick moves earned funds into the available balance.",
    },
    {
      type: "stream.ended",
      description: "The stream reaches its end condition or is stopped by the sender.",
    },
  ];

  // For schedules with very short intervals we note the settlement frequency.
  const shortIntervals = new Set(["second", "minute"]);
  if (shortIntervals.has(schedule.toLowerCase())) {
    events.splice(2, 1, {
      type: "stream.settled",
      description: `Periodic settlement tick (${schedule} interval) moves earned funds into the available balance.`,
    });
  }

  return events;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  const url = getRequestUrl(request);
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
  const rateLimitResult = await checkRateLimit(identity, limitType);

  if (!rateLimitResult.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(rateLimitResult.retryAfter!);
  }
  recordRequest(url.pathname);

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validationErrors = validateCreateStreamBody(body);
  if (validationErrors.length > 0) {
    logger.warn("Stream preview validation failed", { errors: validationErrors });
    return createErrorResponse(
      "VALIDATION_ERROR",
      "One or more fields are invalid.",
      400,
      validationErrors,
    );
  }

  // ── Resolve asset ─────────────────────────────────────────────────────────
  const rawToken = (body.token as string | undefined)?.trim() || "XLM";
  let asset: SupportedAsset = "XLM";
  try {
    const normalised = normaliseToken(rawToken);
    // normalised is either "XLM" or "CODE:ISSUER" (e.g. "USDC:GA...").
    // Map any non-XLM asset to USDC for cost estimation purposes.
    asset = normalised === "XLM" ? "XLM" : "USDC";
  } catch {
    // Fall back to XLM — the preview is best-effort for unknown tokens.
    asset = "XLM";
  }

  // ── Cost estimate ─────────────────────────────────────────────────────────
  const costResult = estimateStreamCost(asset);
  if (!costResult.ok) {
    logger.error("Cost estimation failed during stream preview", {
      error: costResult.error,
    });
    return createErrorResponse(
      "ESTIMATION_ERROR",
      "Failed to compute cost estimate.",
      500,
    );
  }

  // ── Build preview stream (not persisted) ─────────────────────────────────
  const previewId = `preview-${crypto.randomUUID().slice(0, 8)}`;
  const schedule = (body.schedule as string).trim().toLowerCase();
  const rate = (body.rate as string).trim();
  const recipient = (body.recipient as string).trim();

  const previewStream: PreviewStream = {
    id: previewId,
    status: "draft",
    amount: rate,
    asset,
    recipient,
    sender: "pending",   // not known at preview time — no wallet context
    schedule: { interval: schedule },
  };

  // ── Estimated events ──────────────────────────────────────────────────────
  const estimatedEvents = deriveEstimatedEvents(schedule);

  // ── Response ──────────────────────────────────────────────────────────────
  const context = getCorrelationContext();
  const requestId = context?.request_id ?? crypto.randomUUID();

  logger.info("Stream preview computed", {
    preview_id: previewId,
    asset,
    schedule,
  });

  const responseBody: PreviewResponse = {
    data: {
      valid: true,
      estimated_events: estimatedEvents,
      cost_estimate: costResult.value,
      preview_stream: previewStream,
    },
    meta: {
      dry_run: true,
      request_id: requestId,
    },
  };

  return NextResponse.json(responseBody, { status: 200 });
}
