import jwt from "jsonwebtoken";
import { db, resetDb } from "@/app/lib/db";
import { resetConcurrency, MAX_CONCURRENT_EXPORTS } from "@/app/lib/export-concurrency";
import { POST as createExport } from "./route";
import { GET as getExport } from "./[id]/route";

const JWT_SECRET = "streampay-dev-secret-do-not-use-in-prod";

function makeToken(walletAddress: string, role = "user"): string {
  return jwt.sign({ sub: walletAddress, role, iss: "streampay", aud: "streampay-api" }, JWT_SECRET, { expiresIn: "1h" });
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
    resetConcurrency();
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

  // ── Download (NDJSON stream) ───────────────────────────────────────────────

  describe("GET /api/exports/[id]?download=true", () => {
    it("returns 409 when export is not yet ready", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();

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

      const job = db.exportJobs.get(data.id)!;
      const pastExpiry = new Date(Date.now() - 1000).toISOString();

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

    it("returns NDJSON stream with valid signed URL for the owning actor", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const statusJson = await statusRes.json();
      expect(statusJson.data.status).toBe("ready");

      const signedUrl = statusJson.data.signedUrl as string;
      const fullUrl = `http://localhost${signedUrl}`;

      const downloadRes = await getExport(
        authRequest(fullUrl, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers.get("content-type")).toBe("application/x-ndjson");
      expect(downloadRes.headers.get("content-disposition")).toMatch(/\.ndjson"/);

      const body = await downloadRes.text();
      const lines = body.trim().split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);

      const meta = JSON.parse(lines[0]);
      expect(meta.type).toBe("export.meta");
      expect(meta.exportId).toBe(data.id);
      expect(meta.ownerId).toBe("GOWNER1");

      const summary = JSON.parse(lines[lines.length - 1]);
      expect(summary.type).toBe("export.summary");
      expect(typeof summary.streams).toBe("number");
      expect(typeof summary.events).toBe("number");

      for (let i = 1; i < lines.length - 1; i++) {
        const row = JSON.parse(lines[i]);
        expect(["stream", "activity"]).toContain(row.recordType);
      }

      expect(db.exportAudit.some((r: any) => r.type === "export.downloaded" && r.exportId === data.id)).toBe(true);
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

      const otherToken = makeToken("GOTHER2");
      const downloadRes = await getExport(
        authRequest(fullUrl, otherToken),
        { params: Promise.resolve({ id: data.id }) }
      );
      expect(downloadRes.status).toBe(404);
    });
  });

  // ── Concurrency cap ────────────────────────────────────────────────────────

  describe("Export concurrency cap", () => {
    it("rejects downloads beyond MAX_CONCURRENT_EXPORTS per tenant", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const { data: readyJob } = await statusRes.json();
      const signedUrl = readyJob.signedUrl as string;
      const fullUrl = `http://localhost${signedUrl}`;

      const requests = Array.from({ length: MAX_CONCURRENT_EXPORTS + 1 }, () =>
        getExport(authRequest(fullUrl, token), { params: Promise.resolve({ id: data.id }) })
      );

      const responses = await Promise.all(requests);
      const ok = responses.filter((r) => r.status === 200);
      const tooMany = responses.filter((r) => r.status === 429);

      expect(ok.length).toBe(MAX_CONCURRENT_EXPORTS);
      expect(tooMany.length).toBe(1);

      if (tooMany.length > 0) {
        const json = await tooMany[0].json();
        expect(json.error.code).toBe("TOO_MANY_EXPORTS");
      }

      await Promise.all(ok.map((r) => r.text()));
    });

    it("allows a new download after a previous one completes", async () => {
      const token = makeToken("GOWNER1");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const { data: readyJob } = await statusRes.json();
      const signedUrl = readyJob.signedUrl as string;
      const fullUrl = `http://localhost${signedUrl}`;

      const res1 = await getExport(authRequest(fullUrl, token), { params: Promise.resolve({ id: data.id }) });
      await res1.text();
      expect(res1.status).toBe(200);

      const res2 = await getExport(authRequest(fullUrl, token), { params: Promise.resolve({ id: data.id }) });
      expect(res2.status).toBe(200);
      await res2.text();
    });

    it("does not affect different tenants", async () => {
      const token1 = makeToken("GOWNER1");
      const token2 = makeToken("GOTHER2");

      const create1 = await createExport(authRequest("http://localhost/api/exports", token1));
      const { data: job1 } = await create1.json();

      const create2 = await createExport(authRequest("http://localhost/api/exports", token2));
      const { data: job2 } = await create2.json();

      await wait(200);

      const status1 = await getExport(authRequest(`http://localhost/api/exports/${job1.id}`, token1), {
        params: Promise.resolve({ id: job1.id }),
      });
      const s1 = await status1.json();
      const url1 = `http://localhost${s1.data.signedUrl as string}`;

      const status2 = await getExport(authRequest(`http://localhost/api/exports/${job2.id}`, token2), {
        params: Promise.resolve({ id: job2.id }),
      });
      const s2 = await status2.json();
      const url2 = `http://localhost${s2.data.signedUrl as string}`;

      const [r1, r2] = await Promise.all([
        getExport(authRequest(url1, token1), { params: Promise.resolve({ id: job1.id }) }),
        getExport(authRequest(url2, token2), { params: Promise.resolve({ id: job2.id }) }),
      ]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);

      await Promise.all([r1.text(), r2.text()]);
    });
  });

  // ── Scoping: export only contains owner's data ────────────────────────────

  describe("Export scoping", () => {
    it("export job only includes streams owned by the requesting actor", async () => {
      db.streams.set("s-owner", {
        id: "s-owner",
        recipient: "Owner Stream",
        rate: "10 XLM / month",
        schedule: "Monthly",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T00:00:00Z",
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
      expect(statusJson.data.rows).toBe(1);
    });

    it("export NDJSON only contains streams owned by the requesting actor", async () => {
      db.streams.set("s-owner-2", {
        id: "s-owner-2",
        recipient: "Owner 2 Stream",
        rate: "10 XLM / month",
        schedule: "Monthly",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T00:00:00Z",
        ownerId: "GOWNER2",
      });
      db.streams.set("s-other-2", {
        id: "s-other-2",
        recipient: "Other Tenant Stream 2",
        rate: "20 XLM / month",
        schedule: "Monthly",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-04-01T00:00:00Z",
        updatedAt: "2026-04-01T00:00:00Z",
        ownerId: "GOTHER2",
      });

      const token = makeToken("GOWNER2");
      const createRes = await createExport(authRequest("http://localhost/api/exports", token));
      const { data } = await createRes.json();
      await wait(200);

      const statusRes = await getExport(
        authRequest(`http://localhost/api/exports/${data.id}`, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const statusJson = await statusRes.json();
      const signedUrl = statusJson.data.signedUrl as string;
      const fullUrl = `http://localhost${signedUrl}`;

      const downloadRes = await getExport(
        authRequest(fullUrl, token),
        { params: Promise.resolve({ id: data.id }) }
      );
      const body = await downloadRes.text();
      const lines = body.trim().split("\n");

      const streamRows = lines.filter((l) => {
        try {
          return JSON.parse(l).recordType === "stream";
        } catch {
          return false;
        }
      });

      expect(streamRows.length).toBe(1);
      const streamData = JSON.parse(streamRows[0]);
      expect(streamData.id).toBe("s-owner-2");
      expect(streamData.recipient).toBe("Owner 2 Stream");
    });
  });
});
