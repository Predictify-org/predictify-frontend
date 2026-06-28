import { GET, POST } from "./route";
import { orgDb } from "@/app/lib/org-db";
import { NextRequest } from "next/server";

const OWNER_WALLET = "GOWNER7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";
const EXISTING_ORG_ID = "org-acme";
const MISSING_ORG_ID = "org-does-not-exist";

describe("Org Members API", () => {
  describe("GET /api/orgs/:orgId/members", () => {
    it("returns 404 ORG_NOT_FOUND when the org does not exist", async () => {
      const req = new NextRequest(
        `http://localhost/api/orgs/${MISSING_ORG_ID}/members`,
      );
      const res = await GET(req, { params: Promise.resolve({ orgId: MISSING_ORG_ID }) });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("ORG_NOT_FOUND");
      expect(body.error.message).toContain(MISSING_ORG_ID);
      expect(body.error.request_id).toBeDefined();
    });

    it("returns members for an existing org", async () => {
      const req = new NextRequest(
        `http://localhost/api/orgs/${EXISTING_ORG_ID}/members`,
      );
      const res = await GET(req, { params: Promise.resolve({ orgId: EXISTING_ORG_ID }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.meta.total).toBe(body.data.length);
      expect(body.links.self).toBe(`/api/orgs/${EXISTING_ORG_ID}/members`);
    });
  });

  describe("POST /api/orgs/:orgId/members", () => {
    it("returns 404 ORG_NOT_FOUND when the org does not exist", async () => {
      const req = new NextRequest(
        `http://localhost/api/orgs/${MISSING_ORG_ID}/members`,
        {
          method: "POST",
          headers: {
            "Actor-Wallet-Address": OWNER_WALLET,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: "GNEW7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW",
            role: "viewer",
          }),
        },
      );
      const res = await POST(req, { params: Promise.resolve({ orgId: MISSING_ORG_ID }) });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe("ORG_NOT_FOUND");
      expect(body.error.message).toContain(MISSING_ORG_ID);
    });

    it("allows an owner to add a member", async () => {
      const newWallet = "GNEW7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW";
      const req = new NextRequest(
        `http://localhost/api/orgs/${EXISTING_ORG_ID}/members`,
        {
          method: "POST",
          headers: {
            "Actor-Wallet-Address": OWNER_WALLET,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress: newWallet, role: "viewer" }),
        },
      );
      const res = await POST(req, { params: Promise.resolve({ orgId: EXISTING_ORG_ID }) });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.data.walletAddress).toBe(newWallet);
      expect(body.data.role).toBe("viewer");

      const org = orgDb.orgs.get(EXISTING_ORG_ID);
      expect(org?.members.some((m) => m.walletAddress === newWallet)).toBe(true);
    });

    it("rejects non-owner actors", async () => {
      const req = new NextRequest(
        `http://localhost/api/orgs/${EXISTING_ORG_ID}/members`,
        {
          method: "POST",
          headers: {
            "Actor-Wallet-Address": "GVIEWER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: "GATTACK7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNR",
            role: "viewer",
          }),
        },
      );
      const res = await POST(req, { params: Promise.resolve({ orgId: EXISTING_ORG_ID }) });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });
  });
});
