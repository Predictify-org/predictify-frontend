/**
 * Org policy engine — ADR-001
 *
 * Authorization layer for org-controlled streams. This module is the SOLE
 * authority for org-based AuthZ. It has no knowledge of stream business logic
 * (stream-events.ts) and no React / Next.js dependencies.
 *
 * ## Mandatory RBAC (issue #226)
 * All privileged stream lifecycle actions (start, pause, stop, settle,
 * withdraw) MUST call `requireStreamActor` before any business logic.
 *
 * The old pattern of "skip policy when Actor-Wallet-Address is absent" is
 * replaced by a hard 403 for missing actor identity. The actor is sourced
 * from the verified JWT (preferred) with the raw header as fallback for
 * internal/service callers that do not carry a JWT.
 *
 * Call order in API routes:
 *   1. requireStreamActor()  ← resolves & validates actor identity
 *   2. enforceStreamRbac()   ← checks org policy; returns 403/409 on deny
 *   3. business logic        ← only reached when (1) and (2) pass
 *
 * Future hook: replace `OrgRecord` source with on-chain signer registry
 * without changing this file's public interface.
 */

import { NextResponse } from "next/server";
import {
  OrgRecord,
  OrgRole,
  StreamPolicy,
  ApprovalAction,
  PendingApproval,
  ApprovalStatus,
} from "./org-types";
import { orgDb } from "./org-db";
import { tryAuthenticateRequest } from "./auth";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Stream actions that can be governed by an org policy */
export type OrgAction = "start" | "pause" | "resume" | "settle" | "stop" | "withdraw";

export type PolicyDenied = {
  allowed: false;
  code:
    | "NOT_ORG_MEMBER"
    | "ROLE_INSUFFICIENT"
    | "CROSS_ORG_DENIED"
    | "APPROVAL_REQUIRED";
  httpStatus: 403 | 409;
  message: string;
};

export type PolicyAllowed = {
  allowed: true;
  /** True when the action must go through the two-step approval workflow */
  requiresApproval: boolean;
};

export type PolicyResult = PolicyAllowed | PolicyDenied;

// ─── Internal constants ───────────────────────────────────────────────────────

/** Keys into StreamPolicy that correspond to each OrgAction */
const ACTION_POLICY_KEY: Record<OrgAction, keyof StreamPolicy> = {
  start: "canStart",
  pause: "canPause",
  resume: "canResume",
  settle: "canSettle",
  stop: "canStop",
  withdraw: "canWithdraw",
};

/** Actions that are subject to two-step approval when requireApprovals > 1 */
const TWO_STEP_ACTIONS = new Set<OrgAction>(["settle", "stop"]);

/** Approval TTL in milliseconds (24 h) */
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Actor resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the actor wallet address for a privileged stream action.
 *
 * Priority:
 *   1. Verified JWT `sub` claim (most trusted — cryptographically signed).
 *   2. `Actor-Wallet-Address` header (fallback for internal/service callers).
 *
 * Returns `null` when neither source provides an identity. Callers MUST
 * treat `null` as a hard 403 — never skip RBAC for missing actor.
 */
export function resolveActorAddress(request: Request): string | null {
  // 1. JWT (preferred)
  const jwtActor = tryAuthenticateRequest(request);
  if (jwtActor?.walletAddress) return jwtActor.walletAddress;

  // 2. Raw header fallback (internal service callers)
  const header = request.headers?.get?.("Actor-Wallet-Address") ?? null;
  return header?.trim() || null;
}

/**
 * Resolve the actor and return a 403 NextResponse if no identity is found.
 *
 * Use this at the top of every privileged route handler:
 *
 *   const actorResult = requireStreamActor(request);
 *   if (actorResult instanceof NextResponse) return actorResult;
 *   const actorAddress = actorResult;
 */
export function requireStreamActor(
  request: Request,
): string | NextResponse {
  const actor = resolveActorAddress(request);
  if (!actor) {
    return NextResponse.json(
      {
        error: {
          code: "ACTOR_REQUIRED",
          message:
            "A verified actor identity is required for this action. " +
            "Provide a valid Bearer JWT or Actor-Wallet-Address header.",
        },
      },
      { status: 403 },
    );
  }
  return actor;
}

// ─── Core policy check ────────────────────────────────────────────────────────

/**
 * Checks whether `actorWalletAddress` is allowed to perform `action` on a
 * stream owned by `org`.
 *
 * Does NOT mutate any state. Call this before any business logic.
 *
 * Role → action matrix (from DEFAULT_STREAM_POLICY in org-types.ts):
 * ┌──────────┬───────┬────────┬─────────┬────────┐
 * │ Action   │ owner │ pauser │ settler │ viewer │
 * ├──────────┼───────┼────────┼─────────┼────────┤
 * │ start    │  ✅   │  ✅    │         │        │
 * │ pause    │  ✅   │  ✅    │         │        │
 * │ resume   │  ✅   │  ✅    │         │        │
 * │ settle   │  ✅   │        │  ✅     │        │
 * │ stop     │  ✅   │        │         │        │
 * │ withdraw │  ✅   │        │  ✅     │        │
 * └──────────┴───────┴────────┴─────────┴────────┘
 * viewer cannot perform any action.
 * settler cannot start/pause/stop.
 * pauser cannot settle/withdraw.
 */
export function checkOrgPolicy(
  org: OrgRecord,
  actorWalletAddress: string,
  action: OrgAction,
): PolicyResult {
  const member = org.members.find((m) => m.walletAddress === actorWalletAddress);

  if (!member) {
    return {
      allowed: false,
      code: "NOT_ORG_MEMBER",
      httpStatus: 403,
      message: "Actor is not a member of this organization.",
    };
  }

  const policyKey = ACTION_POLICY_KEY[action];
  const allowedRoles = org.policy[policyKey] as OrgRole[];

  if (!allowedRoles.includes(member.role)) {
    return {
      allowed: false,
      code: "ROLE_INSUFFICIENT",
      httpStatus: 403,
      message: `Role '${member.role}' is not permitted to perform '${action}'.`,
    };
  }

  const requiresApproval =
    TWO_STEP_ACTIONS.has(action) && org.policy.requireApprovals > 1;

  return { allowed: true, requiresApproval };
}

/**
 * Convenience wrapper: resolves the org for `streamId` from orgDb and calls
 * checkOrgPolicy. Returns `null` if the stream is not org-owned (caller
 * should treat the stream as individually owned — no org check needed).
 */
export function checkStreamOrgPolicy(
  streamId: string,
  actorWalletAddress: string,
  action: OrgAction,
): PolicyResult | null {
  const orgId = orgDb.streamOwnership.get(streamId);
  if (!orgId) return null; // not org-owned

  const org = orgDb.orgs.get(orgId);
  if (!org) return null; // stale reference — treat as individually owned

  return checkOrgPolicy(org, actorWalletAddress, action);
}

/**
 * Mandatory RBAC enforcement for stream lifecycle routes.
 *
 * Combines actor resolution + org policy check into a single call.
 * Returns a NextResponse error on any denial, or `null` on success.
 *
 * Usage in route handlers:
 *
 *   const rbacError = enforceStreamRbac(request, streamId, "settle");
 *   if (rbacError) return rbacError;
 *
 * Behaviour:
 * - Missing actor identity → 403 ACTOR_REQUIRED
 * - Stream not org-owned   → null (pass-through; individually owned streams
 *                            are governed by the sender/recipient check in
 *                            the route itself)
 * - Org policy denied      → 403 with policy code
 * - Approval required      → 409 APPROVAL_REQUIRED
 */
export function enforceStreamRbac(
  request: Request,
  streamId: string,
  action: OrgAction,
): NextResponse | null {
  // 1. Resolve actor — hard 403 if missing
  const actorResult = requireStreamActor(request);
  if (actorResult instanceof NextResponse) return actorResult;
  const actorAddress = actorResult;

  // 2. Org policy check
  const policyResult = checkStreamOrgPolicy(streamId, actorAddress, action);

  // Stream is not org-owned — no org-level restriction applies.
  if (policyResult === null) return null;

  if (!policyResult.allowed) {
    return NextResponse.json(
      { error: { code: policyResult.code, message: policyResult.message } },
      { status: policyResult.httpStatus },
    );
  }

  if (policyResult.requiresApproval) {
    return NextResponse.json(
      {
        error: {
          code: "APPROVAL_REQUIRED",
          message:
            "This action requires multi-sig approval. Please initiate an approval request.",
        },
      },
      { status: 409 },
    );
  }

  return null; // ✅ allowed
}

// ─── Approval workflow ────────────────────────────────────────────────────────

export type InitiateApprovalResult =
  | { ok: true; approval: PendingApproval; autoExecuted: false }
  | { ok: false; error: string; httpStatus: 400 | 403 | 409 };

/**
 * Initiates a two-step approval for `action` on `streamId`.
 *
 * Prerequisites (caller must verify):
 *  - The stream IS org-owned.
 *  - checkOrgPolicy returned { allowed: true, requiresApproval: true }.
 *
 * Returns the created PendingApproval record (status: "pending").
 * Does NOT execute the underlying stream action — that happens via castApproval.
 */
export function initiateApproval(
  streamId: string,
  orgId: string,
  action: ApprovalAction,
  initiatedBy: string,
  requiredCount: number,
): InitiateApprovalResult {
  // Guard: no duplicate pending approval for same stream+action
  for (const existing of orgDb.approvals.values()) {
    if (
      existing.streamId === streamId &&
      existing.action === action &&
      existing.status === "pending"
    ) {
      return {
        ok: false,
        error: `A pending approval for '${action}' on stream '${streamId}' already exists (id: ${existing.id}).`,
        httpStatus: 409,
      };
    }
  }

  const now = new Date();
  const id = `appr-${crypto.randomUUID().slice(0, 8)}`;

  const approval: PendingApproval = {
    id,
    streamId,
    orgId,
    action,
    initiatedBy,
    approvals: [initiatedBy], // initiator auto-approves
    requiredCount,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + APPROVAL_TTL_MS).toISOString(),
  };

  orgDb.approvals.set(id, approval);
  return { ok: true, approval, autoExecuted: false };
}

export type CastApprovalResult =
  | { ok: true; approval: PendingApproval; thresholdMet: boolean }
  | { ok: false; error: string; httpStatus: 400 | 403 | 404 | 409 };

/**
 * Adds `voterWalletAddress`'s approval to an existing PendingApproval.
 *
 * - Returns thresholdMet=true when `approvals.length >= requiredCount`.
 * - The caller is responsible for executing the stream action when thresholdMet.
 * - Guards: approval must be pending, not expired, voter must not have already voted.
 */
export function castApproval(
  approvalId: string,
  voterWalletAddress: string,
  org: OrgRecord,
  action: OrgAction,
): CastApprovalResult {
  const approval = orgDb.approvals.get(approvalId);

  if (!approval) {
    return { ok: false, error: `Approval '${approvalId}' not found.`, httpStatus: 404 };
  }

  if (approval.status !== "pending") {
    return {
      ok: false,
      error: `Approval '${approvalId}' is no longer pending (status: ${approval.status}).`,
      httpStatus: 409,
    };
  }

  // Lazy expiry check
  if (new Date(approval.expiresAt) <= new Date()) {
    const expired: PendingApproval = { ...approval, status: "expired" };
    orgDb.approvals.set(approvalId, expired);
    return {
      ok: false,
      error: `Approval '${approvalId}' has expired.`,
      httpStatus: 409,
    };
  }

  // Duplicate vote guard
  if (approval.approvals.includes(voterWalletAddress)) {
    return {
      ok: false,
      error: "Actor has already cast an approval for this record.",
      httpStatus: 409,
    };
  }

  // Role check: voter must have permission for the action being approved
  const policyCheck = checkOrgPolicy(org, voterWalletAddress, action);
  if (!policyCheck.allowed) {
    return {
      ok: false,
      error: policyCheck.message,
      httpStatus: policyCheck.httpStatus,
    };
  }

  const updatedApprovals = [...approval.approvals, voterWalletAddress];
  const thresholdMet = updatedApprovals.length >= approval.requiredCount;
  const newStatus: ApprovalStatus = thresholdMet ? "approved" : "pending";

  const updated: PendingApproval = {
    ...approval,
    approvals: updatedApprovals,
    status: newStatus,
  };

  orgDb.approvals.set(approvalId, updated);
  return { ok: true, approval: updated, thresholdMet };
}

