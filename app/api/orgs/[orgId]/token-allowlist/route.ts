/**
 * Per-org token allowlist endpoints
 *
 * GET    /api/orgs/:orgId/token-allowlist
 *   Returns the org's current token allowlist (empty array = inherits global).
 *
 * PUT    /api/orgs/:orgId/token-allowlist
 *   Replaces the entire list. Body: { "tokens": ["XLM", "USDC:G..."] }
 *   An empty array disables the per-org list (falls back to global behaviour).
 *
 * POST   /api/orgs/:orgId/token-allowlist
 *   Adds a single token. Body: { "token": "USDC:G..." }
 *   Idempotent — adding an already-present token is a no-op (returns 200).
 *
 * DELETE /api/orgs/:orgId/token-allowlist
 *   Removes a single token. Body: { "token": "USDC:G..." }
 *   Idempotent — removing an absent token is a no-op (returns 200).
 *
 * Auth: all mutations require the caller to be an org owner
 * (Actor-Wallet-Address header, matching the pattern in members/route.ts).
 *
 * Token format:
 *   "XLM" or "native" → normalised to "XLM"
 *   "CODE:ISSUER"      → normalised to "CODE:ISSUER" (ISSUER must be a valid
 *                        56-char Stellar G-key)
 */

import { NextResponse } from "next/server";
import { orgDb } from "@/app/lib/org-db";
import { normaliseToken } from "@/app/lib/token-allowlist";

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message, request_id: "mock-request-id" } },
    { status },
  );
}

/** Resolve the caller's wallet from the Actor-Wallet-Address header. */
function getActorAddress(request: Request): string | null {
  return request.headers.get("Actor-Wallet-Address")?.trim() || null;
}

/** Guard: org must exist and caller must be an owner. */
function resolveOrgAndOwner(
  orgId: string,
  actorAddress: string | null,
): { org: ReturnType<typeof orgDb.orgs.get> & object; error?: undefined } | { error: NextResponse } {
  const org = orgDb.orgs.get(orgId);
  if (!org) {
    return { error: errorResponse("ORG_NOT_FOUND", `Org '${orgId}' not found.`, 404) };
  }
  if (!actorAddress) {
    return {
      error: errorResponse(
        "ACTOR_REQUIRED",
        "Actor-Wallet-Address header is required for this action.",
        403,
      ),
    };
  }
  const member = org.members.find((m) => m.walletAddress === actorAddress);
  if (!member || member.role !== "owner") {
    return {
      error: errorResponse("FORBIDDEN", "Only org owners may manage the token allowlist.", 403),
    };
  }
  return { org };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const org = orgDb.orgs.get(orgId);

  if (!org) {
    return errorResponse("ORG_NOT_FOUND", `Org '${orgId}' not found.`, 404);
  }

  const list = org.tokenAllowlist ?? [];

  return NextResponse.json({
    data: {
      orgId,
      tokens: list,
      enabled: list.length > 0,
    },
    links: { self: `/api/orgs/${orgId}/token-allowlist` },
  });
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const actorAddress = getActorAddress(request);
  const guard = resolveOrgAndOwner(orgId, actorAddress);
  if ("error" in guard) return guard.error;
  const org = guard.org;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const raw = (body as { tokens?: unknown }).tokens;
  if (!Array.isArray(raw)) {
    return errorResponse("VALIDATION_ERROR", "Field 'tokens' must be an array of token strings.", 422);
  }

  const normalised: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") {
      return errorResponse(
        "VALIDATION_ERROR",
        `Each entry in 'tokens' must be a string; got ${typeof entry}.`,
        422,
      );
    }
    try {
      normalised.push(normaliseToken(entry));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return errorResponse("INVALID_TOKEN", `Invalid token format: ${msg}`, 422);
    }
  }

  // Deduplicate while preserving insertion order
  const deduped = [...new Set(normalised)];

  org.tokenAllowlist = deduped;
  org.updatedAt = new Date().toISOString();
  orgDb.orgs.set(orgId, org);

  return NextResponse.json({
    data: { orgId, tokens: deduped, enabled: deduped.length > 0 },
    links: { self: `/api/orgs/${orgId}/token-allowlist` },
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const actorAddress = getActorAddress(request);
  const guard = resolveOrgAndOwner(orgId, actorAddress);
  if ("error" in guard) return guard.error;
  const org = guard.org;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const raw = (body as { token?: unknown }).token;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return errorResponse("VALIDATION_ERROR", "Field 'token' is required and must be a non-empty string.", 422);
  }

  let normalised: string;
  try {
    normalised = normaliseToken(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse("INVALID_TOKEN", `Invalid token format: ${msg}`, 422);
  }

  const list = org.tokenAllowlist ?? [];

  // Idempotent — already present is a no-op
  if (list.includes(normalised)) {
    return NextResponse.json({
      data: { orgId, tokens: list, enabled: list.length > 0, added: false },
      links: { self: `/api/orgs/${orgId}/token-allowlist` },
    });
  }

  const updated = [...list, normalised];
  org.tokenAllowlist = updated;
  org.updatedAt = new Date().toISOString();
  orgDb.orgs.set(orgId, org);

  return NextResponse.json(
    {
      data: { orgId, tokens: updated, enabled: true, added: true },
      links: { self: `/api/orgs/${orgId}/token-allowlist` },
    },
    { status: 201 },
  );
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const actorAddress = getActorAddress(request);
  const guard = resolveOrgAndOwner(orgId, actorAddress);
  if ("error" in guard) return guard.error;
  const org = guard.org;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }

  const raw = (body as { token?: unknown }).token;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return errorResponse("VALIDATION_ERROR", "Field 'token' is required and must be a non-empty string.", 422);
  }

  let normalised: string;
  try {
    normalised = normaliseToken(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse("INVALID_TOKEN", `Invalid token format: ${msg}`, 422);
  }

  const list = org.tokenAllowlist ?? [];
  const filtered = list.filter((t) => t !== normalised);

  // Idempotent — absent token is a no-op
  const removed = filtered.length < list.length;

  org.tokenAllowlist = filtered;
  org.updatedAt = new Date().toISOString();
  orgDb.orgs.set(orgId, org);

  return NextResponse.json({
    data: {
      orgId,
      tokens: filtered,
      enabled: filtered.length > 0,
      removed,
    },
    links: { self: `/api/orgs/${orgId}/token-allowlist` },
  });
}
