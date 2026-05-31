import { GET, POST } from "./route";
import { db } from "@/app/lib/db";
import { NextRequest } from "next/server";

// Mocking JWT verification in app/lib/auth
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn((token) => {
    if (token === "valid-owner-token") return { sub: "GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW" };
    if (token === "valid-member-token") return { sub: "other-wallet" };
    throw new Error("Invalid token");
  }),
}));

describe("Org Members API", () => {
  const orgId = "org-1";

  beforeEach(() => {
    // Ensure DB is in a known state
    db.members.set(`${orgId}:GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW`, { orgId, walletAddress: "GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW", role: "owner" });
    db.members.set(`${orgId}:other-wallet`, { orgId, walletAddress: "other-wallet", role: "member" });
  });

  it("GET /:orgId/members - returns members for an authenticated member", async () => {
    const req = new NextRequest(`http://localhost/api/orgs/${orgId}/members`, {
      headers: { Authorization: "Bearer valid-member-token" },
    });
    const res = await GET(req, { params: Promise.resolve({ orgId }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(2);
  });

  it("POST /:orgId/members - allows owner to add a member", async () => {
    const req = new NextRequest(`http://localhost/api/orgs/${orgId}/members`, {
      method: "POST",
      headers: { Authorization: "Bearer valid-owner-token", "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: "new-wallet" }),
    });
    const res = await POST(req, { params: Promise.resolve({ orgId }) });
    expect(res.status).toBe(201);
    expect(db.members.has(`${orgId}:new-wallet`)).toBe(true);
  });

  it("POST /:orgId/members - rejects non-owner", async () => {
    const req = new NextRequest(`http://localhost/api/orgs/${orgId}/members`, {
      method: "POST",
      headers: { Authorization: "Bearer valid-member-token", "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: "attacker-wallet" }),
    });
    const res = await POST(req, { params: Promise.resolve({ orgId }) });
    expect(res.status).toBe(403);
  });
});
