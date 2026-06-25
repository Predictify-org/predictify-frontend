# ADR-001 — Org-Owned and Multi-Signature Stream Ownership

**Status:** Accepted  
**Date:** 2026-04-28  
**Issue:** [#107](../../issues/107)  
**Deciders:** StreamPay Engineering  

---

## Context and Problem Statement

StreamPay's initial model assumes a single Stellar wallet owns and controls each stream. As teams (DAOs, payroll departments, multi-founder companies) adopt StreamPay, we need to support:

1. **Org-level stream ownership** – a team entity, not an individual wallet, controls a stream.
2. **Role-based permissions** – not every team member should be able to settle or stop a stream; finer-grained control is required.
3. **Two-step approval gate** – high-impact actions (settle, stop) may require multiple signatures before execution.
4. **Extensibility** – future support for on-chain Soroban multi-sig (SEP-0023 or equivalent) without rewriting the authorization model.

This ADR describes the **MVP policy model** implemented as mocked, in-memory authorization for internal dogfooding. It does **not** implement on-chain multi-sig.

---

## Decision

### 1. Org Data Model

Introduce an `OrgRecord` entity:

```typescript
type OrgRole = "owner" | "pauser" | "settler" | "viewer";

type OrgMember = {
  walletAddress: string; // Stellar G... address
  role: OrgRole;
  addedAt: string;       // ISO-8601 UTC
};

type StreamPolicy = {
  policyVersion: 1;                // Bumped on schema changes — see Migration below
  canStart:    OrgRole[];
  canPause:    OrgRole[];
  canResume:   OrgRole[];
  canSettle:   OrgRole[];
  canStop:     OrgRole[];
  canWithdraw: OrgRole[];
  requireApprovals: number;        // Minimum approvals before two-step actions execute
};

type OrgRecord = {
  id: string;            // e.g. "org-acme"
  name: string;
  members: OrgMember[];
  policy: StreamPolicy;
  createdAt: string;
  updatedAt: string;
};
```

A stream's optional `orgId` field (stored in `orgDb.streamOwnership`) links it to an `OrgRecord`.

### 2. Role Matrix (Default Policy)

| Action   | owner | pauser | settler | viewer |
|----------|:-----:|:------:|:-------:|:------:|
| start    |  ✅   |   ✅   |         |        |
| pause    |  ✅   |   ✅   |         |        |
| resume   |  ✅   |   ✅   |         |        |
| settle   |  ✅   |        |   ✅    |        |
| stop     |  ✅   |        |         |        |
| withdraw |  ✅   |        |   ✅    |        |

### 3. Two-Step Approval Gate

When `policy.requireApprovals > 1`, actions in `{"settle", "stop"}` are **gated** behind an approval workflow:

1. Eligible member **initiates** → creates a `PendingApproval` record (`status: "pending"`).
2. A second eligible member **approves** → if `approvals.length >= requiredCount`, the action is auto-executed and `status` transitions to `"approved"`.
3. Approvals expire after **24 hours** if not completed.

For `requireApprovals = 1` (default), all actions are immediate — no approval record is created.

### 4. Authorization Layer Separation

`app/lib/org-policy.ts` is the **sole authority** for org-based AuthZ. It is:
- Pure TypeScript; **no React, no Next.js imports**.
- Called by API route handlers **before** any business logic (`app/lib/stream-events.ts`).
- Returns a typed `PolicyResult` (`{ allowed: true, requiresApproval }` or `{ allowed: false, code, httpStatus }`).

Business logic (`stream-events.ts`, `db.ts`) remains unaware of org concepts — this preserves testability of both layers independently.

### 5. API Surface (MVP)

New endpoints:

```
POST   /api/orgs                              → Create org
GET    /api/orgs/:orgId                       → Get org (members, policy)
POST   /api/orgs/:orgId/members               → Add member
GET    /api/streams/:id/approvals             → List pending approvals for a stream
POST   /api/streams/:id/approvals             → Initiate an approval (settle/stop)
POST   /api/streams/:id/approvals/:approvalId/approve  → Cast an approval vote
```

Existing stream action routes (`/pause`, `/settle`, `/stop`) gain an org-awareness check:  
- If the stream has an `orgId`, the request `actorWalletAddress` header is checked against the org policy before forwarding to business logic.
- Streams **without** an `orgId` continue to work exactly as before (no regression).

### 6. Policy Version & Migration Path

`policyVersion` is stored alongside every `StreamPolicy`. When the schema evolves (new roles, action keys), a migration function reads `policyVersion` and back-fills defaults. Version bumps require a DB migration script and changelog entry. Current version: **1**.

---

## Consequences

### Positive

- Unblocks team/DAO use-cases with minimal surface area.
- AuthZ is fully unit-testable in isolation.
- `policyVersion` gives us a safe upgrade path as we add on-chain signers.
- Existing individual-wallet streams require **zero changes**.

### Negative / Trade-offs

- In-memory store — data is lost on server restart. Acceptable for dogfood; production needs a persistent DB.
- Approval expiry is enforced at read-time (lazy) not by a background job. Expired approvals are never auto-rejected in-process; callers must check `expiresAt`.
- No webhook/push notification when an approval threshold is met.

---

## Non-Goals (Explicitly Out of Scope for this ADR)

| Item | Reason |
|------|--------|
| On-chain Soroban multi-sig | Future hook; no contract support yet in StreamPay-Contracts. |
| N-of-M threshold > 2 | Over-engineering for MVP dogfood. Max `requireApprovals` validated at 2. |
| DAO governance / token-weighted voting | Separate concern; not in product roadmap. |
| Org deletion / member removal cascades | Deferred — destructive ops need audit log first. |
| JWT claims encoding org membership | Deferred to auth service refactor; MVP uses request header. |
| Rate-limiting the approval endpoint | Deferred to API gateway layer. |
| Email / push notifications for pending approvals | Out of scope for backend slice. |

---

## Alternatives Considered

### A: Encode roles in JWT
Rejected for MVP — would require auth service changes and token rotation every time membership changes.

### B: Per-stream ACL list instead of Org entity
Rejected — does not scale for teams with many streams. Org model allows "set role once, apply to all org streams."

### C: Use on-chain Soroban storage for signer registry
Rejected for now — no StreamPay-Contracts multi-sig support yet. This ADR explicitly documents the future hook point.

---

## Future Hook: On-Chain Signers

When `StreamPay-Contracts` adds multi-sig support, the `OrgMember.walletAddress` field maps 1-to-1 to a Stellar signer key. The `checkOrgPolicy` function's signature is stable — callers will not change. Only the backing store (`orgDb`) needs to be swapped to read from an on-chain contract state or SEP-0007/SEP-0023 endpoint.

The `policyVersion` field provides the migration lever: version 2 will add `signerPublicKeys` to `StreamPolicy` while version 1 orgs remain on the current model.
