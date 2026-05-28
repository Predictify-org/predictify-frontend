import { NextResponse } from "next/server";
import { getStore, idempotencyToken } from "@/app/lib/db";
import { getCorrelationContext } from "@/app/lib/logger";
import { enforceStreamRbac } from "@/app/lib/org-policy";

type Context = { params: Promise<{ id: string }> };

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function errorResponse(code: string, message: string, status: number) {
  return createErrorResponse(code, message, status);
}

function createErrorResponse(code: string, message: string, status: number) {
  const context = getCorrelationContext();
  return NextResponse.json({ error: { code, message, request_id: context?.request_id } }, { status });
}

function getHeader(request: Request, name: string): string | null {
  return request.headers?.get?.(name) ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { idempotencyStore, streamRepository } = getStore();
  const { id } = await params;
  const idempotencyKey = getHeader(request, "Idempotency-Key");
  const token = idempotencyKey ? idempotencyToken(`streams.pause.${id}`, idempotencyKey) : null;

  if (token && idempotencyStore.has(token)) {
    return NextResponse.json(idempotencyStore.get(token));
  }

  const stream = streamRepository.streams.get(id);
  if (!stream) {
    return errorResponse("STREAM_NOT_FOUND", `Stream '${id}' not found`, 404);
  }

  // Mandatory RBAC — missing actor → 403; role insufficient → 403.
  // Actor is sourced from verified JWT first, then Actor-Wallet-Address header.
  const rbacError = enforceStreamRbac(request, id, "pause");
  if (rbacError) return rbacError;

  if (stream.status !== "active") {
    return createErrorResponse("INVALID_STREAM_STATE", "Only active streams can be paused", 409);
  }

  const updatedStream = {
    ...stream,
    nextAction: "start" as const,
    status: "paused" as const,
    updatedAt: new Date().toISOString(),
  };
  streamRepository.streams.set(id, updatedStream);

  const payload = { data: updatedStream };
  if (token) {
    idempotencyStore.set(token, payload);
  }

  return NextResponse.json(payload);
}
