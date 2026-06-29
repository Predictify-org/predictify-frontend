import { NextRequest, NextResponse } from "next/server";
import {
  checkIdempotency,
  computeFingerprint,
  getStore,
  idempotencyToken,
  setIdempotency,
} from "@/app/lib/db";
import { errorResponse, ErrorCode } from "@/app/lib/errors/server";
import { getCorrelationContext, logger } from "@/app/lib/logger";
import { checkRateLimit, getClientIdentity, rateLimitResponse } from "@/app/lib/rate-limit";
import { getLimitForRoute } from "@/app/lib/rate-limit-config";
import { recordRequest, recordThrottle } from "@/app/lib/rate-limit-metrics";
import { checkTokenAllowed, checkTokenAllowedForOrg, normaliseToken } from "@/app/lib/token-allowlist";
import { validateCreateStreamBody } from "@/app/lib/stream-validation";
import { orgDb } from "@/app/lib/org-db";

const MAX_BATCH_SIZE = 20;

interface BatchItemError {
  index: number;
  field: string;
  code: string;
  message: string;
}

interface BatchStreamInput {
  rate: string;
  recipient: string;
  schedule: string;
  token: string;
  orgId?: string;
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

function getRequestUrl(request: Request, fallbackPath: string): URL {
  try {
    return request.url ? new URL(request.url) : new URL(`http://localhost${fallbackPath}`);
  } catch {
    return new URL(`http://localhost${fallbackPath}`);
  }
}

/**
 * POST /api/streams/batch
 *
 * Creates up to 20 streams in a single request with all-or-nothing transactional
 * semantics.  Every entry is validated (schema, token allowlist, per-org policy)
 * before any stream is persisted; if *any* entry fails validation the entire
 * batch is rejected and no state change occurs.
 *
 * ## Request body
 *
 * A JSON array of stream objects:
 *
 * ```json
 * [
 *   {
 *     "recipient": "G…",
 *     "rate":      "100",
 *     "schedule":  "month",
 *     "token":     "XLM"
 *   }
 * ]
 * ```
 *
 * `token` defaults to `"XLM"` when absent.
 *
 * ## Response (201)
 *
 * ```json
 * {
 *   "data":   [ { "id": "stream-…", "status": "draft", … }, … ],
 *   "links":  { "self": "/api/v1/streams/batch" }
 * }
 * ```
 *
 * ## Errors
 *
 * | Status | Code                    | Reason                                      |
 * |--------|-------------------------|---------------------------------------------|
 * | 400    | `INVALID_REQUEST`       | Body is not valid JSON or not an array       |
 * | 400    | `BATCH_LIMIT_EXCEEDED`  | More than 20 entries                         |
 * | 401    | `UNAUTHORIZED`          | Missing or malformed `Authorization` header  |
 * | 409    | `IDEMPOTENCY_CONFLICT`  | Same `Idempotency-Key`, different body       |
 * | 422    | `VALIDATION_ERROR`      | One or more entries failed validation        |
 * | 429    | `rate_limit_exceeded`   | Rate limit hit                               |
 *
 * ## Auth
 *
 * Requires a valid `Authorization: Bearer <token>` header.
 *
 * ## Idempotency
 *
 * When an `Idempotency-Key` header is supplied the entire batch call is
 * idempotent — a replay with the same key, same body returns the cached 201
 * response.  A replay with the same key but a *different* body returns a 409.
 */
export async function POST(request: NextRequest) {
  const { idempotencyStore, streamRepository } = getStore();
  const url = getRequestUrl(request, "/api/streams/batch");
  const limitType = getLimitForRoute("POST", url.pathname);
  const identity = getClientIdentity(request);
  const rateLimitResult = await checkRateLimit(identity, limitType);

  if (!rateLimitResult.allowed) {
    recordThrottle(url.pathname, limitType, identity.type, identity.displayValue);
    return rateLimitResponse(rateLimitResult.retryAfter!);
  }
  recordRequest(url.pathname);

  if (!getHeader(request, "authorization")?.startsWith("Bearer ")) {
    return errorResponse(ErrorCode.UNAUTHORIZED, "Bearer token required.", 401);
  }

  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const idempotencyTokenValue = idempotencyKey
    ? idempotencyToken("streams.batch.create", idempotencyKey)
    : null;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  if (!Array.isArray(body)) {
    return errorResponse("INVALID_REQUEST", "Request body must be a JSON array of stream objects.", 400);
  }

  if (body.length > MAX_BATCH_SIZE) {
    return errorResponse(
      "BATCH_LIMIT_EXCEEDED",
      `Batch limit exceeded. Maximum ${MAX_BATCH_SIZE} streams per request.`,
      400,
    );
  }

  const fingerprint = computeFingerprint("POST", "/api/streams/batch", body);

  if (idempotencyTokenValue) {
    const cached = checkIdempotency(idempotencyStore, idempotencyTokenValue, fingerprint);
    if (cached) {
      if (!cached.ok) {
        return NextResponse.json(
          {
            error: {
              code: "IDEMPOTENCY_CONFLICT",
              message: "Idempotency key has been used with a different request.",
            },
          },
          { status: 409 },
        );
      }
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  const items = body as Record<string, unknown>[];
  const validationErrors: BatchItemError[] = [];
  const validItems: BatchStreamInput[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      validationErrors.push({
        index: i,
        field: "body",
        code: "INVALID_ITEM",
        message: `Item at index ${i} must be a JSON object.`,
      });
      continue;
    }

    const fieldErrors = validateCreateStreamBody(item);
    for (const err of fieldErrors) {
      validationErrors.push({
        index: i,
        field: err.field,
        code: err.code,
        message: err.message,
      });
    }

    if (fieldErrors.length > 0) {
      continue;
    }

    const { rate, recipient, schedule, token: rawToken, orgId } = item as Record<string, string>;

    const tokenStr = rawToken?.trim() || "XLM";
    let normalisedToken: string;
    try {
      normalisedToken = normaliseToken(tokenStr);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      validationErrors.push({
        index: i,
        field: "token",
        code: "INVALID_TOKEN",
        message: `Invalid token format at index ${i}: ${msg}`,
      });
      continue;
    }

    const org = typeof orgId === "string" ? orgDb.orgs.get(orgId) : undefined;

    const allowlistResult = org
      ? await checkTokenAllowedForOrg(normalisedToken, org)
      : await checkTokenAllowed(normalisedToken);

    if (!allowlistResult.accepted) {
      validationErrors.push({
        index: i,
        field: "token",
        code: "TOKEN_NOT_ALLOWED",
        message: allowlistResult.reason,
      });
      continue;
    }

    validItems.push({ rate, recipient, schedule, token: normalisedToken, orgId });
  }

  if (validationErrors.length > 0) {
    logger.warn("Batch stream creation validation failed", {
      batchSize: items.length,
      errorCount: validationErrors.length,
    });
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more stream entries failed validation. No streams were created.",
          details: validationErrors,
          request_id: getCorrelationContext()?.request_id,
        },
      },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();
  const createdStreams = [];

  for (const input of validItems) {
    const id = `stream-${crypto.randomUUID().slice(0, 8)}`;
    const newStream = {
      createdAt: now,
      id,
      nextAction: "start" as const,
      rate: input.rate,
      recipient: input.recipient,
      schedule: input.schedule,
      status: "draft" as const,
      updatedAt: now,
      token: input.token,
    };

    streamRepository.streams.set(id, newStream);
    createdStreams.push(newStream);
  }

  const payload = { data: createdStreams, links: { self: "/api/v1/streams/batch" } };

  if (idempotencyTokenValue) {
    setIdempotency(idempotencyStore, idempotencyTokenValue, fingerprint, 201, payload);
  }

  logger.info("Batch streams created", { count: createdStreams.length });

  return NextResponse.json(payload, { status: 201 });
}
