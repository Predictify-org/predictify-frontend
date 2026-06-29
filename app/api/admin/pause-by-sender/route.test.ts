/** @jest-environment node */
import { POST } from "./route";
import { db, resetDb } from "@/app/lib/db";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";
import { _resetAdminStateForTesting, getAdminAddress } from "@/app/lib/admin-guard";
import type { Stream } from "@/app/types/openapi";

const ADMIN_ADDR = "GADMIN_DEV_PLACEHOLDER_DO_NOT_USE_IN_PROD";
const SENDER_A = "GSENDER_A12345678901234567890123456789012345678901234";
const SENDER_B = "GSENDER_B12345678901234567890123456789012345678901234";
const STRANGER = "GSTRANGER0000000000000000000000000000000000000000000";

function buildStream(overrides: Partial<Stream> & { id: string }): Stream {
  return {
    recipient: "Test Recipient",
    rate: "100 XLM / month",
    schedule: "Monthly",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    token: "XLM",
    ...overrides,
  } as Stream;
}

const senderAStreams: Record<string, Stream> = {
  "stream-sender-a-1": buildStream({
    id: "stream-sender-a-1",
    senderAddress: SENDER_A,
    status: "active",
  }),
  "stream-sender-a-2": buildStream({
    id: "stream-sender-a-2",
    senderAddress: SENDER_A,
    status: "active",
  }),
  "stream-sender-a-draft": buildStream({
    id: "stream-sender-a-draft",
    senderAddress: SENDER_A,
    status: "draft",
  }),
  "stream-sender-a-paused": buildStream({
    id: "stream-sender-a-paused",
    senderAddress: SENDER_A,
    status: "paused",
    pausedAt: "2026-05-01T00:00:00Z",
  }),
};

const senderBStreams: Record<string, Stream> = {
  "stream-sender-b-1": buildStream({
    id: "stream-sender-b-1",
    senderAddress: SENDER_B,
    status: "active",
  }),
};

const otherStreams: Record<string, Stream> = {
  "stream-no-sender": buildStream({
    id: "stream-no-sender",
    status: "active",
  }),
};

function seedTestData(): void {
  resetDb({
    ...senderAStreams,
    ...senderBStreams,
    ...otherStreams,
  });
}

function postReq(
  body: unknown,
  opts: { actor?: string } = {},
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.actor) {
    headers["Actor-Wallet-Address"] = opts.actor;
  }
  return new Request("http://localhost/api/admin/pause-by-sender", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  _resetAdminStateForTesting();
  resetAuditLogStore();
  resetRateLimitStore();
  seedTestData();
});

describe("POST /api/admin/pause-by-sender", () => {
  // ── Auth ────────────────────────────────────────────────────────────────

  describe("auth", () => {
    it("returns 403 when no auth header is provided", async () => {
      const res = await POST(postReq({ senderAddress: SENDER_A }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("Unauthorized");
    });

    it("returns 403 when caller is not the admin", async () => {
      const res = await POST(postReq({ senderAddress: SENDER_A }, { actor: STRANGER }));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("Unauthorized");
    });

    it("succeeds when caller is the admin", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(200);
    });
  });

  // ── Body validation ─────────────────────────────────────────────────────

  describe("validation", () => {
    it("returns 400 for malformed JSON body", async () => {
      const req = new Request("http://localhost/api/admin/pause-by-sender", {
        method: "POST",
        headers: { "Actor-Wallet-Address": ADMIN_ADDR },
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_REQUEST");
    });

    it("returns 422 when senderAddress is missing", async () => {
      const res = await POST(postReq({}, { actor: ADMIN_ADDR }));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 when senderAddress is empty string", async () => {
      const res = await POST(
        postReq({ senderAddress: "" }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 when senderAddress is not a string", async () => {
      const res = await POST(
        postReq({ senderAddress: 123 }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ── No active streams ───────────────────────────────────────────────────

  describe("no active streams found", () => {
    it("returns empty paused array when sender has no streams", async () => {
      const res = await POST(
        postReq({ senderAddress: "GUNKNOWN" }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.count).toBe(0);
      expect(body.data.paused).toEqual([]);
      expect(body.data.senderAddress).toBe("GUNKNOWN");
    });

    it("returns empty paused array when sender has only non-active streams", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      // SENDER_A has 4 streams: 2 active, 1 draft, 1 paused
      // Only the 2 active should be paused
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.count).toBe(2);
    });

    it("does not modify non-active streams", async () => {
      const beforeDraft = db.streams.get("stream-sender-a-draft");
      const beforePaused = db.streams.get("stream-sender-a-paused");

      await POST(postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }));

      const afterDraft = db.streams.get("stream-sender-a-draft");
      const afterPaused = db.streams.get("stream-sender-a-paused");

      expect(afterDraft).toEqual(beforeDraft);
      expect(afterPaused).toEqual(beforePaused);
    });
  });

  // ── Pausing active streams ──────────────────────────────────────────────

  describe("pausing active streams", () => {
    it("pauses all active streams for the sender", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data.count).toBe(2);
      expect(body.data.senderAddress).toBe(SENDER_A);

      const pausedIds = body.data.paused.map((s: Stream) => s.id).sort();
      expect(pausedIds).toEqual(["stream-sender-a-1", "stream-sender-a-2"]);

      const db1 = db.streams.get("stream-sender-a-1");
      expect(db1?.status).toBe("paused");
      expect(db1?.nextAction).toBe("stop");
      expect(db1?.pausedAt).toBeDefined();

      const db2 = db.streams.get("stream-sender-a-2");
      expect(db2?.status).toBe("paused");
      expect(db2?.nextAction).toBe("stop");
      expect(db2?.pausedAt).toBeDefined();
    });

    it("pauses only streams belonging to the specified sender", async () => {
      await POST(postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }));

      // SENDER_B's stream should remain active
      const senderBStream = db.streams.get("stream-sender-b-1");
      expect(senderBStream?.status).toBe("active");
      expect(senderBStream?.pausedAt).toBeUndefined();

      // Stream without senderAddress should remain active
      const noSenderStream = db.streams.get("stream-no-sender");
      expect(noSenderStream?.status).toBe("active");
    });

    it("sets pausedAt and updatedAt to the same ISO-8601 timestamp", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      const body = await res.json();

      for (const stream of body.data.paused as Stream[]) {
        expect(stream.pausedAt).toBe(stream.updatedAt);
        expect(stream.pausedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      }
    });

    it("returns all expected fields in each paused stream", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      const body = await res.json();

      for (const stream of body.data.paused as Stream[]) {
        expect(stream).toHaveProperty("id");
        expect(stream).toHaveProperty("status", "paused");
        expect(stream).toHaveProperty("nextAction", "stop");
        expect(stream).toHaveProperty("pausedAt");
        expect(stream).toHaveProperty("updatedAt");
        expect(stream).toHaveProperty("senderAddress", SENDER_A);
      }
    });
  });

  // ── Sender B (single stream) ────────────────────────────────────────────

  describe("single sender stream", () => {
    it("pauses the only active stream for sender B", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_B }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.count).toBe(1);
      expect(body.data.paused[0].id).toBe("stream-sender-b-1");
      expect(db.streams.get("stream-sender-b-1")?.status).toBe("paused");
    });
  });

  // ── Audit log ───────────────────────────────────────────────────────────

  describe("audit log", () => {
    it("emits one admin.pause-by-sender event per paused stream", async () => {
      await POST(postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }));

      const entries = auditLogStore
        .list({})
        .filter((e) => e.action === "admin.pause-by-sender");

      expect(entries).toHaveLength(2);

      const streamIds = entries.map((e) => e.target?.id).sort();
      expect(streamIds).toEqual(["stream-sender-a-1", "stream-sender-a-2"]);
    });

    it("emits no audit events when no active streams are found", async () => {
      await POST(
        postReq({ senderAddress: "GUNKNOWN" }, { actor: ADMIN_ADDR }),
      );

      const entries = auditLogStore.list({});
      const pauseEntries = entries.filter((e) => e.action === "admin.pause-by-sender");
      expect(pauseEntries).toHaveLength(0);
    });

    it("includes senderAddress in audit metadata", async () => {
      await POST(postReq({ senderAddress: SENDER_B }, { actor: ADMIN_ADDR }));

      const entries = auditLogStore
        .list({})
        .filter((e) => e.action === "admin.pause-by-sender");

      expect(entries).toHaveLength(1);
      expect(entries[0].metadata?.senderAddress).toBe(SENDER_B);
    });
  });

  // ── Response envelope ───────────────────────────────────────────────────

  describe("response envelope", () => {
    it("includes request_id in validation error responses", async () => {
      const res = await POST(postReq({}, { actor: ADMIN_ADDR }));
      const body = await res.json();
      expect(body.error).toHaveProperty("request_id");
      expect(typeof body.error.request_id).toBe("string");
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("includes data.paused, data.count, and data.senderAddress on success", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      const body = await res.json();
      expect(body.data).toHaveProperty("paused");
      expect(body.data).toHaveProperty("count");
      expect(body.data).toHaveProperty("senderAddress");
      expect(Array.isArray(body.data.paused)).toBe(true);
      expect(typeof body.data.count).toBe("number");
      expect(body.data.count).toBe(body.data.paused.length);
    });

    it("count and paused array length match", async () => {
      const res = await POST(
        postReq({ senderAddress: SENDER_B }, { actor: ADMIN_ADDR }),
      );
      const body = await res.json();
      expect(body.data.count).toBe(1);
      expect(body.data.paused).toHaveLength(1);
    });
  });

  // ── Idempotency (not explicitly supported, but second call is safe) ──────

  describe("repeat calls", () => {
    it("second call to pause same sender is safe (all streams already paused)", async () => {
      const first = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      expect(first.status).toBe(200);
      expect((await first.json()).data.count).toBe(2);

      // All active streams are now paused; second call should find zero to pause
      const second = await POST(
        postReq({ senderAddress: SENDER_A }, { actor: ADMIN_ADDR }),
      );
      expect(second.status).toBe(200);
      expect((await second.json()).data.count).toBe(0);
    });
  });

  // ── Edge: senderAddress with whitespace ──────────────────────────────────

  describe("senderAddress trimming", () => {
    it("trims whitespace from senderAddress", async () => {
      const res = await POST(
        postReq({ senderAddress: `  ${SENDER_A}  ` }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.count).toBe(2);
    });

    it("returns 422 for senderAddress with only whitespace", async () => {
      const res = await POST(
        postReq({ senderAddress: "   " }, { actor: ADMIN_ADDR }),
      );
      expect(res.status).toBe(422);
    });
  });
});
