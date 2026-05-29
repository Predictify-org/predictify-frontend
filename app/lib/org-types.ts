/**
 * Org-stream ownership types — ADR-001
 *
 * Canonical type definitions for org records, member roles, stream policies,
 * and the two-step approval workflow.
 *
 * Keep this file dependency-free (no React, no Next.js) so it can be used
 * in tests, API routes, and pure-logic modules without any framework coupling.
 */

// ─── Roles ───────────────────────────────────────────────────────────────────

/**
 * Roles a member can hold within an org.
 * Evaluated against StreamPolicy.can* arrays to gate stream actions.
 */
export type OrgRole = "owner" | "pauser" | "settler" | "viewer";

// ─── Policy ──────────────────────────────────────────────────────────────────

/**
 * Monotonically increasing version number.
 * Bump when the StreamPolicy shape changes and write a migration.
 */
export type PolicyVersion = 1;

/**
 * Per-org stream action policy.
 *
 * Each can* array lists the roles that may perform that action.
 * requireApprovals controls the two-step gate:
 *   1 → immediate execution (no approval record created)
 *   2 → settle and stop require a second eligible member to approve
 *
 * MVP constraint: max requireApprovals is 2.
 */
export type StreamPolicy = {
  policyVersion: PolicyVersion;
  canStart: OrgRole[];
  canPause: OrgRole[];
  canResume: OrgRole[];
  canSettle: OrgRole[];
  canStop: OrgRole[];
  canWithdraw: OrgRole[];
  /**
   * Minimum number of distinct approvals required before a two-step action
   * (settle, stop) is executed. Must be 1 or 2 in this version.
   */
  requireApprovals: 1 | 2;
};

// ─── Default policy ──────────────────────────────────────────────────────────

/**
 * Default policy applied to new orgs when none is specified.
 *
 * Role matrix:
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
 */
export const DEFAULT_STREAM_POLICY: StreamPolicy = {
  policyVersion: 1,
  canStart: ["owner", "pauser"],
  canPause: ["owner", "pauser"],
  canResume: ["owner", "pauser"],
  canSettle: ["owner", "settler"],
  canStop: ["owner"],
  canWithdraw: ["owner", "settler"],
  requireApprovals: 1,
};

// ─── Org member ───────────────────────────────────────────────────────────────

export type OrgMember = {
  /** Stellar G... public key */
  walletAddress: string;
  role: OrgRole;
  /** ISO-8601 UTC */
  addedAt: string;
};

// ─── Org record ───────────────────────────────────────────────────────────────

export type OrgRecord = {
  /** e.g. "org-acme" */
  id: string;
  name: string;
  members: OrgMember[];
  policy: StreamPolicy;
  /** ISO-8601 UTC */
  createdAt: string;
  /** ISO-8601 UTC */
  updatedAt: string;
};

// ─── Approval workflow ────────────────────────────────────────────────────────

/** Actions that may be gated behind a two-step approval when requireApprovals > 1 */
export type ApprovalAction = "settle" | "stop";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

/**
 * A pending multi-step approval for a stream action.
 *
 * Created when an eligible member initiates a two-step action.
 * Auto-transitions to "approved" (and executes the action) once
 * approvals.length >= requiredCount.
 */
export type PendingApproval = {
  id: string;
  streamId: string;
  orgId: string;
  action: ApprovalAction;
  /** Wallet address of the member who initiated the approval */
  initiatedBy: string;
  /** Ordered list of wallet addresses that have cast an approval */
  approvals: string[];
  requiredCount: number;
  status: ApprovalStatus;
  /** ISO-8601 UTC */
  createdAt: string;
  /** ISO-8601 UTC — lazy-checked; no background job enforces expiry */
  expiresAt: string;
};

// ─── Org-stream link ──────────────────────────────────────────────────────────

/**
 * Thin join record: maps a streamId to its owning org.
 * Stored separately from OrgRecord to avoid loading full org on every stream read.
 */
export type OrgStreamOwnership = {
  streamId: string;
  orgId: string;
};
