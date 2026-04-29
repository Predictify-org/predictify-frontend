/** @jest-environment node */

import jwt from "jsonwebtoken";
import { GET } from "./route";
import { JWT_SECRET } from "@/app/lib/auth";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";

function signAccessToken(role: string, actorId: string) {
  return jwt.sign({ sub: `${actorId}-wallet`, role, actorId, iss: "streampay" }, JWT_SECRET, {
    expiresIn: "15m",
  });
}

describe("GET /api/audit", () => {
  beforeEach(() => {
    resetAuditLogStore();
    auditLogStore.append({
      action: "stream.settle",
      actor: { id: "ops-admin-42", role: "admin" },
      after: { status: "ended" },
      before: { status: "active" },
      requestId: "req-audit-json",
      target: { account: "acct_demo_admin", id: "stream-ada", type: "stream" },
      timestamp: "2026-04-28T12:00:00.000Z",
    });
  });

  it("rejects standard users from reading audit logs", async () => {
    const request = new Request("http://localhost/api/audit", {
      headers: {
        authorization: `Bearer ${signAccessToken("user", "user-7")}`,
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows support to read audit logs", async () => {
    const request = new Request("http://localhost/api/audit?requestId=req-audit-json", {
      headers: {
        authorization: `Bearer ${signAccessToken("support", "support-2")}`,
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta.chainIntact).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].action).toBe("stream.settle");
    expect(body.access.role).toBe("support");
  });

  it("allows admin export and redacts target account labels", async () => {
    const request = new Request("http://localhost/api/audit?export=ndjson&requestId=req-audit-json", {
      headers: {
        authorization: `Bearer ${signAccessToken("admin", "ops-admin-42")}`,
      },
    });

    const response = await GET(request);
    const body = await response.text();
    const [row] = body.trim().split("\n").map((line) => JSON.parse(line));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(row.redactedTargetAccount).toBe("acct***dmin");
    expect(row.requestId).toBe("req-audit-json");
  });
});
