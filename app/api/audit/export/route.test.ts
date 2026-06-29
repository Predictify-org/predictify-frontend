/** @jest-environment node */

import jwt from "jsonwebtoken";
import { GET, POST } from "./route";
import { JWT_SECRET } from "@/app/lib/auth";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";

function signAccessToken(role: string, actorId: string) {
  return jwt.sign(
    { sub: `${actorId}-wallet`, role, actorId, iss: "streampay", aud: "streampay-api" },
    JWT_SECRET,
    { expiresIn: "15m" },
  );
}

function makeRequest(path: string, role: string, actorId: string) {
  return new Request(`http://localhost${path}`, {
    headers: { authorization: `Bearer ${signAccessToken(role, actorId)}` },
  });
}

describe("GET /api/audit/export", () => {
  beforeEach(() => {
    resetAuditLogStore();
    auditLogStore.append({
      action: "stream.settle",
      actor: { id: "admin-1", role: "admin" },
      after: { status: "ended" },
      before: { status: "active" },
      requestId: "req-export-001",
      target: { account: "acct_demo_admin", id: "stream-abc", type: "stream" },
      timestamp: "2026-04-28T12:00:00.000Z",
    });
    auditLogStore.append({
      action: "stream.create",
      actor: { id: "admin-2", role: "admin" },
      after: { status: "active" },
      before: null,
      requestId: "req-export-002",
      target: { account: "acct_second", id: "stream-def", type: "stream" },
      timestamp: "2026-04-28T13:00:00.000Z",
    });
  });

  it("returns 401 when no token is provided", async () => {
    const request = new Request("http://localhost/api/audit/export");
    const response = await GET(request);
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when a non-export role (support) calls the endpoint", async () => {
    const response = await GET(makeRequest("/api/audit/export", "support", "support-9"));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("streams NDJSON rows for an admin and includes chain-integrity header", async () => {
    // Filter to only the rows we appended in beforeEach so the test is
    // independent of any bootstrap seeds already present in the store.
    const response = await GET(
      makeRequest("/api/audit/export?actorId=admin-1&requestId=req-export-001", "admin", "admin-1"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(response.headers.get("x-audit-chain-intact")).toBe("true");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const text = await response.text();
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(1);

    const rows = lines.map((l) => JSON.parse(l));
    expect(rows[0].action).toBe("stream.settle");
    expect(rows[0].requestId).toBe("req-export-001");
    // Target account must be masked in export rows.
    expect(rows[0].redactedTargetAccount).toBeDefined();
    expect(rows[0].redactedTargetAccount).not.toBe("acct_demo_admin");
  });

  it("honours the limit query parameter", async () => {
    const response = await GET(
      makeRequest("/api/audit/export?limit=1", "admin", "admin-1"),
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    const lines = text.trim().split("\n");
    expect(lines).toHaveLength(1);
  });

  it("returns 405 for POST requests", async () => {
    const response = await POST();
    const body = await response.json();
    expect(response.status).toBe(405);
    expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
  });
});
