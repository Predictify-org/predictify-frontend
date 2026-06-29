/**
 * POST /api/admin/circuit-breaker
 *
 * Toggle a named circuit breaker for the indexer or webhook subsystem.
 * Gated by admin auth — only the admin address may call this.
 *
 * Body: { "target": "indexer" | "webhook", "open": true | false }
 *
 * When open=true:  the named subsystem is considered tripped — consumers
 *                  should halt event dispatch for that target.
 * When open=false: breaker reset, normal processing resumes.
 *
 * GET /api/admin/circuit-breaker
 *
 * Returns the current state of all circuit breakers (read-only, admin-gated).
 *
 * ## Error codes
 * | Code             | HTTP | Meaning                                    |
 * |------------------|------|--------------------------------------------|
 * | INVALID_REQUEST  | 400  | Request body is malformed JSON             |
 * | VALIDATION_ERROR | 422  | Missing or invalid fields in body          |
 * | Unauthorized     | 403  | Caller is not the admin                    |
 */

import { NextResponse } from "next/server";
import {
  setCircuitBreaker,
  getCircuitBreakers,
  requireAdmin,
} from "@/app/lib/admin-guard";
import { recordPrivilegedStreamAuditEvent } from "@/app/lib/audit-log";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("INVALID_REQUEST", "Request body must be valid JSON", 400);
  }

  const { target, open } = body as Record<string, unknown>;

  if (typeof target !== "string" || target.trim().length === 0) {
    return err(
      "VALIDATION_ERROR",
      'Body must contain { target: "indexer" | "webhook", open: boolean }',
      422,
    );
  }

  if (typeof open !== "boolean") {
    return err(
      "VALIDATION_ERROR",
      'Body must contain { target: "indexer" | "webhook", open: boolean }',
      422,
    );
  }

  const before = getCircuitBreakers();
  const result = setCircuitBreaker(request, target.trim(), open);
  if (result instanceof NextResponse) return result;

  recordPrivilegedStreamAuditEvent({
    action: open
      ? `admin.circuit-breaker.${target}.trip`
      : `admin.circuit-breaker.${target}.reset`,
    before: { circuitBreaker: { target, open: before[target as keyof typeof before]?.open } },
    after:  { circuitBreaker: { target, open } },
    metadata: { updatedAt: result.circuitBreakers[target as "indexer" | "webhook"]?.updatedAt },
    request,
    streamId: "global",
    targetAccount: result.adminAddress,
  });

  return NextResponse.json({ data: result.circuitBreakers });
}

export async function GET(request: Request) {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json({ data: getCircuitBreakers() });
}
