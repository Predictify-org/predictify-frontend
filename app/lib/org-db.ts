/**
 * In-memory org store — ADR-001 MVP
 *
 * Production replacement: swap this module for one backed by a persistent DB.
 * The exported `orgDb` shape must remain stable; callers access named maps only.
 */

import {
  OrgRecord,
  PendingApproval,
  ApprovalStatus,
  DEFAULT_STREAM_POLICY,
} from "./org-types";

// ─── Seeded orgs ─────────────────────────────────────────────────────────────

/**
 * Demo org "Acme DAO" — owns "stream-ada".
 *
 * Members:
 *   GOWNER... → owner (can do everything)
 *   GPAUSER.. → pauser (can pause/resume/start only)
 *   GSETTLER. → settler (can settle and withdraw)
 *   GVIEWER.. → viewer (read-only; cannot mutate streams)
 *
 * policy.requireApprovals = 2 → settle and stop require two distinct approvals.
 */
const seedOrgs: OrgRecord[] = [
  {
    id: "org-acme",
    name: "Acme DAO",
    members: [
      {
        walletAddress: "GOWNER7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW",
        role: "owner",
        addedAt: "2026-04-01T00:00:00Z",
      },
      {
        walletAddress: "GPAUSER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7G",
        role: "pauser",
        addedAt: "2026-04-01T00:00:00Z",
      },
      {
        walletAddress: "GSETTLER5IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS",
        role: "settler",
        addedAt: "2026-04-02T00:00:00Z",
      },
      {
        walletAddress: "GVIEWER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS",
        role: "viewer",
        addedAt: "2026-04-03T00:00:00Z",
      },
    ],
    policy: {
      ...DEFAULT_STREAM_POLICY,
      requireApprovals: 2,
    },
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  },
  {
    id: "org-beta",
    name: "Beta Corp",
    members: [
      {
        walletAddress: "GBETA7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRWA",
        role: "owner",
        addedAt: "2026-04-05T00:00:00Z",
      },
    ],
    policy: {
      ...DEFAULT_STREAM_POLICY,
      requireApprovals: 1,
    },
    createdAt: "2026-04-05T00:00:00Z",
    updatedAt: "2026-04-05T00:00:00Z",
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const orgDb = {
  /** Keyed by org id */
  orgs: new Map<string, OrgRecord>(seedOrgs.map((o) => [o.id, o])),

  /**
   * Maps streamId → orgId.
   * A stream absent from this map is individually owned (no org check required).
   */
  streamOwnership: new Map<string, string>([
    ["stream-ada", "org-acme"],
  ]),

  /** Keyed by approval id */
  approvals: new Map<string, PendingApproval>(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the org that owns `streamId`, or undefined if individually owned. */
export function getStreamOrg(streamId: string): OrgRecord | undefined {
  const orgId = orgDb.streamOwnership.get(streamId);
  if (!orgId) return undefined;
  return orgDb.orgs.get(orgId);
}

/**
 * Returns all active (non-expired, non-terminal) approvals for a stream.
 * Expired approvals are lazily marked here.
 */
export function getActiveApprovalsForStream(streamId: string): PendingApproval[] {
  const now = new Date();
  const active: PendingApproval[] = [];

  for (const approval of orgDb.approvals.values()) {
    if (approval.streamId !== streamId) continue;
    if (approval.status === "approved" || approval.status === "rejected") continue;

    if (new Date(approval.expiresAt) <= now) {
      // Lazy expiry — mark and skip
      orgDb.approvals.set(approval.id, { ...approval, status: "expired" as ApprovalStatus });
      continue;
    }

    active.push(approval);
  }

  return active;
}
