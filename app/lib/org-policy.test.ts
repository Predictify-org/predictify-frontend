/**
 * org-policy.test.ts — ADR-001 authorization layer tests
 *
 * Coverage targets:
 *  - checkOrgPolicy: role matrix, cross-org denial, two-step flag
 *  - checkStreamOrgPolicy: org-owned vs individually-owned dispatch
 *  - initiateApproval: happy path, duplicate guard
 *  - castApproval: happy path, threshold detection, expiry, duplicate vote, role denial
 */

import {
  checkOrgPolicy,
  checkStreamOrgPolicy,
  initiateApproval,
  castApproval,
  OrgAction,
} from "./org-policy";
import { OrgRecord, OrgRole, DEFAULT_STREAM_POLICY } from "./org-types";
import { orgDb } from "./org-db";

// ─── Test fixtures ────────────────────────────────────────────────────────────

const OWNER_ADDR = "GOWNER7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";
const PAUSER_ADDR = "GPAUSER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7G";
const SETTLER_ADDR = "GSETTLER5IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS";
const VIEWER_ADDR = "GVIEWER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS";
const OUTSIDER_ADDR = "GOUTSIDER6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";

/** Builds a minimal OrgRecord for isolated unit tests (does not write to orgDb). */
function buildOrg(overrides: Partial<OrgRecord> = {}): OrgRecord {
  return {
    id: "org-test",
    name: "Test Org",
    members: [
      { walletAddress: OWNER_ADDR, role: "owner", addedAt: "2026-01-01T00:00:00Z" },
      { walletAddress: PAUSER_ADDR, role: "pauser", addedAt: "2026-01-01T00:00:00Z" },
      { walletAddress: SETTLER_ADDR, role: "settler", addedAt: "2026-01-01T00:00:00Z" },
      { walletAddress: VIEWER_ADDR, role: "viewer", addedAt: "2026-01-01T00:00:00Z" },
    ],
    policy: { ...DEFAULT_STREAM_POLICY, requireApprovals: 1 },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ─── checkOrgPolicy — membership ─────────────────────────────────────────────

describe("checkOrgPolicy — membership checks", () => {
  it("denies an actor who is not a member of the org", () => {
    const org = buildOrg();
    const result = checkOrgPolicy(org, OUTSIDER_ADDR, "pause");

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("NOT_ORG_MEMBER");
      expect(result.httpStatus).toBe(403);
    }
  });

  it("denies an actor from a completely different org (cross-org isolation)", () => {
    const orgA = buildOrg({ id: "org-a" });
    // OUTSIDER_ADDR is in no org; simulates member of a different org arriving
    const result = checkOrgPolicy(orgA, OUTSIDER_ADDR, "settle");

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("NOT_ORG_MEMBER");
      expect(result.httpStatus).toBe(403);
    }
  });
});

// ─── checkOrgPolicy — role matrix ────────────────────────────────────────────

describe("checkOrgPolicy — role matrix", () => {
  const immediateOrg = buildOrg(); // requireApprovals: 1

  // Owner: can do everything
  const ownerActions: OrgAction[] = ["start", "pause", "resume", "settle", "stop", "withdraw"];
  it.each(ownerActions)("owner can perform '%s'", (action) => {
    const result = checkOrgPolicy(immediateOrg, OWNER_ADDR, action);
    expect(result.allowed).toBe(true);
  });

  // Pauser: can start, pause, resume; cannot settle, stop, withdraw
  it("pauser can pause", () => {
    expect(checkOrgPolicy(immediateOrg, PAUSER_ADDR, "pause").allowed).toBe(true);
  });
  it("pauser can resume", () => {
    expect(checkOrgPolicy(immediateOrg, PAUSER_ADDR, "resume").allowed).toBe(true);
  });
  it("pauser can start", () => {
    expect(checkOrgPolicy(immediateOrg, PAUSER_ADDR, "start").allowed).toBe(true);
  });
  it("pauser cannot settle", () => {
    const result = checkOrgPolicy(immediateOrg, PAUSER_ADDR, "settle");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.code).toBe("ROLE_INSUFFICIENT");
      expect(result.httpStatus).toBe(403);
    }
  });
  it("pauser cannot stop", () => {
    expect(checkOrgPolicy(immediateOrg, PAUSER_ADDR, "stop").allowed).toBe(false);
  });
  it("pauser cannot withdraw", () => {
    expect(checkOrgPolicy(immediateOrg, PAUSER_ADDR, "withdraw").allowed).toBe(false);
  });

  // Settler: can settle and withdraw; cannot pause, stop
  it("settler can settle", () => {
    expect(checkOrgPolicy(immediateOrg, SETTLER_ADDR, "settle").allowed).toBe(true);
  });
  it("settler can withdraw", () => {
    expect(checkOrgPolicy(immediateOrg, SETTLER_ADDR, "withdraw").allowed).toBe(true);
  });
  it("settler cannot pause", () => {
    const result = checkOrgPolicy(immediateOrg, SETTLER_ADDR, "pause");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.code).toBe("ROLE_INSUFFICIENT");
  });
  it("settler cannot stop", () => {
    expect(checkOrgPolicy(immediateOrg, SETTLER_ADDR, "stop").allowed).toBe(false);
  });
  it("settler cannot start", () => {
    expect(checkOrgPolicy(immediateOrg, SETTLER_ADDR, "start").allowed).toBe(false);
  });

  // Viewer: cannot do anything
  const allActions: OrgAction[] = ["start", "pause", "resume", "settle", "stop", "withdraw"];
  it.each(allActions)("viewer cannot perform '%s'", (action) => {
    const result = checkOrgPolicy(immediateOrg, VIEWER_ADDR, action);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.code).toBe("ROLE_INSUFFICIENT");
  });
});

// ─── checkOrgPolicy — two-step approval flag ─────────────────────────────────

describe("checkOrgPolicy — two-step approval flag", () => {
  const twoStepOrg = buildOrg({
    policy: { ...DEFAULT_STREAM_POLICY, requireApprovals: 2 },
  });
  const immediateOrg = buildOrg({ policy: { ...DEFAULT_STREAM_POLICY, requireApprovals: 1 } });

  it("flags settle as requiresApproval when requireApprovals=2", () => {
    const result = checkOrgPolicy(twoStepOrg, OWNER_ADDR, "settle");
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.requiresApproval).toBe(true);
  });

  it("flags stop as requiresApproval when requireApprovals=2", () => {
    const result = checkOrgPolicy(twoStepOrg, OWNER_ADDR, "stop");
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.requiresApproval).toBe(true);
  });

  it("does NOT flag pause as requiresApproval (pause is never two-step)", () => {
    const result = checkOrgPolicy(twoStepOrg, OWNER_ADDR, "pause");
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.requiresApproval).toBe(false);
  });

  it("does NOT flag settle as requiresApproval when requireApprovals=1", () => {
    const result = checkOrgPolicy(immediateOrg, OWNER_ADDR, "settle");
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.requiresApproval).toBe(false);
  });

  it("does NOT flag withdraw as requiresApproval regardless of requireApprovals", () => {
    // withdraw is NOT in TWO_STEP_ACTIONS
    const result = checkOrgPolicy(twoStepOrg, OWNER_ADDR, "withdraw");
    expect(result.allowed).toBe(true);
    if (result.allowed) expect(result.requiresApproval).toBe(false);
  });
});

// ─── checkStreamOrgPolicy — dispatch ─────────────────────────────────────────

describe("checkStreamOrgPolicy — stream ownership dispatch", () => {
  it("returns null for a stream that is not org-owned", () => {
    // "stream-kemi" is not in orgDb.streamOwnership
    const result = checkStreamOrgPolicy("stream-kemi", OWNER_ADDR, "pause");
    expect(result).toBeNull();
  });

  it("returns a PolicyResult for an org-owned stream", () => {
    // "stream-ada" → "org-acme" in orgDb seed data
    const result = checkStreamOrgPolicy("stream-ada", OWNER_ADDR, "pause");
    expect(result).not.toBeNull();
    expect(result!.allowed).toBe(true);
  });

  it("denies OUTSIDER_ADDR on an org-owned stream (cross-org isolation)", () => {
    const result = checkStreamOrgPolicy("stream-ada", OUTSIDER_ADDR, "settle");
    expect(result).not.toBeNull();
    expect(result!.allowed).toBe(false);
    if (result && !result.allowed) {
      expect(result.code).toBe("NOT_ORG_MEMBER");
      expect(result.httpStatus).toBe(403);
    }
  });

  it("denies VIEWER_ADDR attempting a mutating action on org-owned stream", () => {
    const result = checkStreamOrgPolicy("stream-ada", VIEWER_ADDR, "stop");
    expect(result!.allowed).toBe(false);
  });
});

// ─── initiateApproval ────────────────────────────────────────────────────────

describe("initiateApproval", () => {
  /** Unique stream id per test to avoid cross-test state pollution */
  function uniqueStream() {
    return `stream-test-${crypto.randomUUID().slice(0, 6)}`;
  }

  afterEach(() => {
    // Clean up any approvals created during tests
    for (const [id, approval] of orgDb.approvals.entries()) {
      if (approval.streamId.startsWith("stream-test-")) {
        orgDb.approvals.delete(id);
      }
    }
  });

  it("creates a pending approval with the initiator auto-added to approvals", () => {
    const streamId = uniqueStream();
    const result = initiateApproval(streamId, "org-acme", "settle", OWNER_ADDR, 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.approval.status).toBe("pending");
      expect(result.approval.approvals).toContain(OWNER_ADDR);
      expect(result.approval.approvals).toHaveLength(1);
      expect(result.approval.requiredCount).toBe(2);
      expect(result.approval.action).toBe("settle");
      expect(result.approval.streamId).toBe(streamId);
      expect(result.autoExecuted).toBe(false);
    }
  });

  it("sets expiresAt 24 hours after createdAt", () => {
    const streamId = uniqueStream();
    const result = initiateApproval(streamId, "org-acme", "stop", OWNER_ADDR, 2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const created = new Date(result.approval.createdAt).getTime();
      const expires = new Date(result.approval.expiresAt).getTime();
      const diffHours = (expires - created) / 1000 / 3600;
      expect(diffHours).toBeCloseTo(24, 1);
    }
  });

  it("rejects a second initiation when a pending approval already exists for same stream+action", () => {
    const streamId = uniqueStream();
    initiateApproval(streamId, "org-acme", "settle", OWNER_ADDR, 2);
    const duplicate = initiateApproval(streamId, "org-acme", "settle", SETTLER_ADDR, 2);

    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.httpStatus).toBe(409);
  });

  it("allows a new initiation for a different action on the same stream", () => {
    const streamId = uniqueStream();
    initiateApproval(streamId, "org-acme", "settle", OWNER_ADDR, 2);
    const stopResult = initiateApproval(streamId, "org-acme", "stop", OWNER_ADDR, 2);

    expect(stopResult.ok).toBe(true);
  });
});

// ─── castApproval ────────────────────────────────────────────────────────────

describe("castApproval", () => {
  const twoStepOrg = buildOrg({
    id: "org-cast-test",
    policy: { ...DEFAULT_STREAM_POLICY, requireApprovals: 2 },
  });

  function createPendingApproval(streamId: string, initiator: string) {
    const result = initiateApproval(streamId, "org-cast-test", "settle", initiator, 2);
    if (!result.ok) throw new Error("Failed to create approval in test setup");
    return result.approval;
  }

  afterEach(() => {
    for (const [id, approval] of orgDb.approvals.entries()) {
      if (approval.orgId === "org-cast-test") {
        orgDb.approvals.delete(id);
      }
    }
  });

  it("adds the voter's approval and returns thresholdMet=false when still below count", () => {
    // requiredCount=2: initiator already approved (1/2), voter makes it 2/2 — but let's
    // use requiredCount=3 to test the intermediate state. We'll build manually.
    const approvalId = `appr-mid-${crypto.randomUUID().slice(0, 4)}`;
    orgDb.approvals.set(approvalId, {
      id: approvalId,
      streamId: "stream-cast-1",
      orgId: "org-cast-test",
      action: "settle",
      initiatedBy: OWNER_ADDR,
      approvals: [OWNER_ADDR],
      requiredCount: 3, // need 3 total
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });

    const result = castApproval(approvalId, SETTLER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.thresholdMet).toBe(false);
      expect(result.approval.status).toBe("pending");
      expect(result.approval.approvals).toContain(SETTLER_ADDR);
    }
  });

  it("marks approval as 'approved' and sets thresholdMet=true when count is reached", () => {
    const streamId = "stream-cast-2";
    const approval = createPendingApproval(streamId, OWNER_ADDR);
    // requiredCount=2, initiator=1st approval; SETTLER adds 2nd

    const result = castApproval(approval.id, SETTLER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.thresholdMet).toBe(true);
      expect(result.approval.status).toBe("approved");
    }
  });

  it("rejects a duplicate vote from the same actor", () => {
    const streamId = "stream-cast-3";
    const approval = createPendingApproval(streamId, OWNER_ADDR);

    // OWNER_ADDR is already in approval.approvals (initiator auto-approves)
    const result = castApproval(approval.id, OWNER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(409);
  });

  it("rejects a vote on an approval that does not exist", () => {
    const result = castApproval("appr-nonexistent", OWNER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(404);
  });

  it("rejects a vote on an already-approved record", () => {
    const streamId = "stream-cast-4";
    const approval = createPendingApproval(streamId, OWNER_ADDR);

    // Get to approved state
    castApproval(approval.id, SETTLER_ADDR, twoStepOrg, "settle");

    // Third voter tries to cast — already done
    const result = castApproval(approval.id, VIEWER_ADDR, twoStepOrg, "settle");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(409);
  });

  it("rejects a vote on an expired approval (lazy expiry)", () => {
    const expiredId = `appr-exp-${crypto.randomUUID().slice(0, 4)}`;
    orgDb.approvals.set(expiredId, {
      id: expiredId,
      streamId: "stream-cast-5",
      orgId: "org-cast-test",
      action: "settle",
      initiatedBy: OWNER_ADDR,
      approvals: [OWNER_ADDR],
      requiredCount: 2,
      status: "pending",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
      expiresAt: new Date(Date.now() - 86400000).toISOString(),    // expired 1 day ago
    });

    const result = castApproval(expiredId, SETTLER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(409);
    // Also verify the store was updated to "expired"
    expect(orgDb.approvals.get(expiredId)?.status).toBe("expired");
  });

  it("denies a voter who lacks the role to perform the approved action", () => {
    const streamId = "stream-cast-6";
    const approval = createPendingApproval(streamId, OWNER_ADDR);

    // VIEWER cannot settle, so their vote should be denied
    const result = castApproval(approval.id, VIEWER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(403);
  });

  it("denies a voter not in the org (cross-org vote attempt)", () => {
    const streamId = "stream-cast-7";
    const approval = createPendingApproval(streamId, OWNER_ADDR);

    const result = castApproval(approval.id, OUTSIDER_ADDR, twoStepOrg, "settle");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.httpStatus).toBe(403);
  });
});

// ─── Cross-org isolation integration tests ───────────────────────────────────

describe("Cross-org isolation — end-to-end policy checks", () => {
  // These tests use the seeded orgDb directly (org-acme, org-beta) to verify
  // that members of one org cannot touch the other's streams.

  it("org-beta owner CANNOT act on a stream owned by org-acme", () => {
    const betaOwner = "GBETA7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRWA";
    // stream-ada belongs to org-acme; betaOwner is in org-beta only
    const result = checkStreamOrgPolicy("stream-ada", betaOwner, "pause");

    expect(result).not.toBeNull();
    expect(result!.allowed).toBe(false);
    if (result && !result.allowed) {
      expect(result.code).toBe("NOT_ORG_MEMBER");
    }
  });

  it("org-acme owner CAN act on a stream owned by org-acme", () => {
    const result = checkStreamOrgPolicy("stream-ada", OWNER_ADDR, "pause");

    expect(result).not.toBeNull();
    expect(result!.allowed).toBe(true);
  });

  it("stream-kemi (individually owned) returns null — no org check applied", () => {
    // Any wallet address should get null (caller decides to allow or use its own authz)
    expect(checkStreamOrgPolicy("stream-kemi", OUTSIDER_ADDR, "stop")).toBeNull();
    expect(checkStreamOrgPolicy("stream-kemi", OWNER_ADDR, "stop")).toBeNull();
  });
});
