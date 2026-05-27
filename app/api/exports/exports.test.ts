import jwt from "jsonwebtoken";
import { db, resetDb } from "@/app/lib/db";
import { POST as createExport } from "./route";
import { GET as getExport } from "./[id]/route";

const JWT_SECRET = "streampay-dev-secret-do-not-use-in-prod";

function makeToken(walletAddress: string, role = "user"): string {
  return jwt.sign({ sub: walletAddress, role }, JWT_SECRET, { expiresIn: "1h" });
}

function authRequest(url: string, token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request(url, { headers });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Exports API — authentication and scoping", () => {
  beforeEach(() => {
    resetDb();
  });

  // ── POST /api/exports ──────────────────────────────────────────────────────

  describe("POST /api/exports", () => {
    it("returns 401 for anonymous requests", async () => {
      const res = await createExport(authRequest("http://localhost/api/exports"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 for invalid JWT", async () => {
      const res = await createExport(authRequest("http://localhost/api/exports", "bad.token.here"));
      expect(res.status).toBe(401);
    });

    it("creates a pending export job for authenticated actor", async () => {
      const token = makeToken("GOWNER1");
      const res = await createExport(authRequest("http://localhost/api/exports", token));
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.status).toBe("pending");
      expect(json.data.ownerId).toBe("GOWNER1");
    });

    it("stores ownerId on the job", async () => {
      const token = makeToken("GOWNER1");
      const res = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await res.json();
      const job = db.exportJobs.get(data.id);
      expect(job?.ownerId).toBe("GOWNER1");
    });
  });

  // ── GET /api/exports/[id] ─────────────────────────────────────────────────

  describe("GET /api/exports/[id]", () => {
    it("returns 401 for anonymous requests", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();

      const res = await getExport(authRequest(`http://localhost/api/exports/${data.id}`), {
        params: Promise.resolve({ id: data.id }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 when a different tenant requests another tenant's job (cross-tenant exclusion)", async () => {
      const ownerToken = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", ownerToken));
      const { data } = await createRes.json();

      const otherToken = makeToken("GOTHER2");
      const res = await getExport(authRequest(`http://localhost/api/exports/${data.id}`, otherToken), {
        params: Promise.resolve({ id: data.id }),
      });
      // Returns 404 (not 403) to avoid leaking job existence
      expect(res.status).toBe(404);
    });

    it("returns 200 for the owning actor", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();

      const res = await getExport(authRequest(`http://localhost/api/exports/${data.id}`, token), {
        params: Promise.resolve({ id: data.id }),
      });
      expect(res.status).toBe(200);
    });

    it("returns 404 for non-existent job", async () => {
      const token = makeToken("GOWNER1");
      const res = await getExport(authRequest("http://localhost/api/exports/no-such-id", token), {
        params: Promise.resolve({ id: "no-such-id" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 410 when the job retention period has expired", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();

      // Backdate the job's expiresAt
      const job = db.exportJobs.get(data.id)!;
      db.exportJobs.set(data.id, { ...job, expiresAt: new Date(Date.now() - 1000).toISOString() });

      const res = await getExport(authRequest(`http://localhost/api/exports/${data.id}`, token), {
        params: Promise.resolve({ id: data.id }),
      });
      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error.code).toBe("EXPORT_EXPIRED");
    });
  });

  // ── Download (signed URL) ─────────────────────────────────────────────────

  describe("GET /api/exports/[id]?download=true", () => {
    it("returns 409 when export is not yet ready", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();

      // Don't wait — job is still pending
      const res = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}?download=true`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(res.status).toBe(409);
    });

    it("returns 403 when sig param is missing", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const res = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}?download=true&expires=2099-01-01T00:00:00.000Z`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when sig is tampered", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const expires = encodeURIComponent(new Date(Date.now() + 3600_000).toISOString());
      const res = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}?download=true&expires=${expires}&sig=deadbeef`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(res.status).toBe(403);
    });

    it("returns 410 when signed URL has expired", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      // Backdate the signedUrlExpiresAt on the stored job
      const job = db.exportJobs.get(data.id)!;
      const pastExpiry = new Date(Date.now() - 1000).toISOString();

      // Re-sign with the past expiry so the sig is valid but expired
      const { createHmac } = await import("crypto");
      const sig = createHmac("sha256", JWT_SECRET).update(`${data.id}:${pastExpiry}`).digest("hex");
      db.exportJobs.set(data.id, { ...job, signedUrlExpiresAt: pastExpiry });

      const res = await getExport(
        authRequest(
          `http://localhost/api/exports/${data.id}?download=true&expires=${encodeURIComponent(pastExpiry)}&sig=${sig}`,
          token
        ),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(res.status).toBe(410);
      const json = await res.json();
      expect(json.error.code).toBe("EXPORT_URL_EXPIRED");
    });

    it("returns 200 with valid signed URL for the owning actor", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      // Get the signed URL from the status endpoint
      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const statusJson = await statusRes.json();
      expect(statusJson.data.status).toBe("ready");

      // Use the signed URL directly (it's a relative URL)
      const signedUrl = statusJson.data.signedUrl as string;
      const fullUrl = `http://localhost${signedUrl}`;

      const downloadRes = await getExport(
        authRequest(fullUrl, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(downloadRes.status).toBe(200);
      expect(db.exportAudit.some((r) => r.type === "export.downloaded" && r.exportId === data.id)).toBe(true);
    });

    it("cross-tenant actor cannot use a valid signed URL for another tenant's job", async () => {
      const ownerToken = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", ownerToken));
      const { data } = await createRes.json();
      await wait(200);

      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, ownerToken),
        { params: Promise.resolve({ id: data.id }) }
      );
      const { data: readyJob } = await statusRes.json();
      const signedUrl = readyJob.signedUrl as string;
      const fullUrl = `http://localhost${signedUrl}`;

      // Different actor tries to use the signed URL
      const otherToken = makeToken("GOTHER2");
      const downloadRes = await getExport(
        authRequest(fullUrl, otherToken),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(downloadRes.status).toBe(404);
    });
  });

  // ── Scoping: export only contains owner's data ────────────────────────────

  describe("Export scoping", () => {
    it("export job only includes streams owned by the requesting actor", async () => {
      // Seed streams with ownerId
      db.streams.set("s-owner", {
        id: "s-owner",
        recipient: "Owner Stream",
        rate: "10 XLM / month",
        schedule: "Monthly",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T00:00:00Z",
        // @ts-expect-error ownerId not on Stream type but used for scoping
        ownerId: "GOWNER1",
      });
      db.streams.set("s-other", {
        id: "s-other",
        recipient: "Other Tenant Stream",
        rate: "20 XLM / month",
        schedule: "Monthly",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T00:00:00Z",
        // @ts-expect-error ownerId not on Stream type but used for scoping
        ownerId: "GOTHER2",
      });

      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const statusJson = await statusRes.json();
      // Only 1 stream row (not 2)
      expect(statusJson.data.rows).toBe(1);
    });
  });
});
