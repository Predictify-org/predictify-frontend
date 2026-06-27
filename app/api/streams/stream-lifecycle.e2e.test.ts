/** @jest-environment node */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { db, resetDb } from "@/app/lib/db";
import { resetRateLimitStore, getRateLimitStore, InMemoryRateLimitStore } from "@/app/lib/rate-limit-store";
import type { StellarSettlementClient } from "@/app/lib/stellar";
import { POST as createStream } from "@/app/api/streams/route";
import { POST as startStream } from "@/app/api/streams/[id]/start/route";
import { POST as pauseStream } from "@/app/api/streams/[id]/pause/route";
import { POST as settleStream } from "@/app/api/streams/[id]/settle/route";
import { POST as withdrawStream } from "@/app/api/streams/[id]/withdraw/route";

const VALID_STELLAR_KEY =
  "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

type StartedServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readRequestBody(request: IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks);
}

async function toWebRequest(request: IncomingMessage, baseUrl: string): Promise<Request> {
  const method = request.method ?? "GET";
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const headerValue of value) {
        headers.append(key, headerValue);
      }
    }
  }

  const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);
  const url = new URL(request.url ?? "/", baseUrl);

  return new Request(url, {
    body: body as any,
    headers,
    method,
  });
}

async function writeWebResponse(response: Response, serverResponse: ServerResponse): Promise<void> {
  serverResponse.statusCode = response.status;
  response.headers.forEach((value, key) => {
    serverResponse.setHeader(key, value);
  });

  const bodyBuffer = Buffer.from(await response.arrayBuffer());
  serverResponse.end(bodyBuffer);
}

async function routeRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (request.method === "POST" && pathname === "/api/streams") {
    return createStream(request);
  }

  const streamActionMatch = pathname.match(/^\/api\/streams\/([^/]+)\/(start|pause|settle|withdraw)$/);
  if (request.method === "POST" && streamActionMatch) {
    const [, id, action] = streamActionMatch;
    const context: RouteContext = { params: Promise.resolve({ id }) };

    if (action === "start") return startStream(request, context);
    if (action === "pause") return pauseStream(request as any, context);
    if (action === "settle") return settleStream(request, context);
    return withdrawStream(request, context);
  }

  return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Route not found" } }), {
    headers: { "Content-Type": "application/json" },
    status: 404,
  });
}

async function startServer(): Promise<StartedServer> {
  const tempServer = createServer();
  await new Promise<void>((resolve) => {
    tempServer.listen(0, "127.0.0.1", () => resolve());
  });

  const port = (tempServer.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => {
    tempServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  const server = createServer(async (request, response) => {
    try {
      const webRequest = await toWebRequest(request, baseUrl);
      const webResponse = await routeRequest(webRequest);
      await writeWebResponse(webResponse, response);
    } catch {
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Unhandled test harness error" } }));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    baseUrl,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

describe("stream lifecycle E2E (HTTP black-box)", () => {
  let server: StartedServer;
  let settleSpy: jest.MockedFunction<StellarSettlementClient["settleStream"]>;
  // Capture the real fetch before any test can replace global.fetch with a Horizon mock.
  const serverFetch = fetch;
  const realFetch = fetch;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
    const store = getRateLimitStore();
    if (store instanceof InMemoryRateLimitStore) store.destroy();
  });

  beforeEach(() => {
    resetDb();
    resetRateLimitStore();
    settleSpy = jest.fn(async ({ streamId }) => ({
      settledAt: "2026-04-28T12:00:00.000Z",
      txHash: `mocked-tx-${streamId}`,
    }));

    globalThis.__STREAMPAY_STELLAR_SETTLEMENT_CLIENT__ = {
      settleStream: settleSpy,
    };
  });

  afterEach(() => {
    delete globalThis.__STREAMPAY_STELLAR_SETTLEMENT_CLIENT__;
    global.fetch = realFetch;
  });

  it("creates, starts, pauses, and settles a stream with idempotent retries", async () => {
    const createResponse = await fetch(`${server.baseUrl}/api/streams`, {
      body: JSON.stringify({
        rate: "50",
        recipient: VALID_STELLAR_KEY,
        schedule: "month",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-e2e-key",
      },
      method: "POST",
    });

    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.data.recipient).toBe(VALID_STELLAR_KEY);
    expect(createBody.data.status).toBe("draft");

    const createdStreamId = createBody.data.id as string;
    expect(db.streams.get(createdStreamId)?.status).toBe("draft");
    expect([...db.streams.values()].filter((stream) => stream.id === createdStreamId)).toHaveLength(1);

    const startResponse = await fetch(`${server.baseUrl}/api/streams/${createdStreamId}/start`, { method: "POST" });
    expect(startResponse.status).toBe(200);
    const startBody = await startResponse.json();
    expect(startBody.data.status).toBe("active");
    expect(db.streams.get(createdStreamId)?.status).toBe("active");

    const pauseResponse = await fetch(`${server.baseUrl}/api/streams/${createdStreamId}/pause`, {
      headers: { "Idempotency-Key": "pause-e2e-key" },
      method: "POST",
    });

    expect(pauseResponse.status).toBe(200);
    const pauseBody = await pauseResponse.json();
    expect(pauseBody.data.status).toBe("paused");
    expect(db.streams.get(createdStreamId)?.status).toBe("paused");

    const pauseRetryResponse = await fetch(`${server.baseUrl}/api/streams/${createdStreamId}/pause`, {
      headers: { "Idempotency-Key": "pause-e2e-key" },
      method: "POST",
    });

    expect(pauseRetryResponse.status).toBe(200);
    const pauseRetryBody = await pauseRetryResponse.json();
    expect(pauseRetryBody).toEqual(pauseBody);
    expect(db.streams.get(createdStreamId)?.status).toBe("paused");

    const settleResponse = await fetch(`${server.baseUrl}/api/streams/${createdStreamId}/settle`, {
      headers: { "Idempotency-Key": "settle-e2e-key" },
      method: "POST",
    });

    expect(settleResponse.status).toBe(200);
    const settleBody = await settleResponse.json();
    expect(settleBody.data.status).toBe("ended");
    expect(settleBody.data.nextAction).toBe("withdraw");
    expect(settleBody.data.settlement.txHash).toBe(`mocked-tx-${createdStreamId}`);
    expect(settleSpy).toHaveBeenCalledTimes(1);
    expect(settleSpy).toHaveBeenCalledWith({ streamId: createdStreamId });
    expect(db.streams.get(createdStreamId)?.status).toBe("ended");

    const settleRetryResponse = await fetch(`${server.baseUrl}/api/streams/${createdStreamId}/settle`, {
      headers: { "Idempotency-Key": "settle-e2e-key" },
      method: "POST",
    });

    expect(settleRetryResponse.status).toBe(200);
    const settleRetryBody = await settleRetryResponse.json();
    expect(settleRetryBody).toEqual(settleBody);
    expect(settleSpy).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when settle is called for a stream that does not exist", async () => {
    const response = await fetch(`${server.baseUrl}/api/streams/stream-missing/settle`, {
      headers: { "Idempotency-Key": "missing-settle-key" },
      method: "POST",
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("STREAM_NOT_FOUND");
    expect(settleSpy).not.toHaveBeenCalled();
  });

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Creates a stream and drives it to "ended" status, returns its id. */
  async function createEndedStream(idSuffix: string): Promise<string> {
    const createRes = await serverFetch(`${server.baseUrl}/api/streams`, {
      body: JSON.stringify({ rate: "10", recipient: VALID_STELLAR_KEY, schedule: "month" }),
      headers: { "Content-Type": "application/json", "Idempotency-Key": `create-${idSuffix}` },
      method: "POST",
    });
    const { data } = await createRes.json();
    const id: string = data.id;

    await serverFetch(`${server.baseUrl}/api/streams/${id}/start`, { method: "POST" });
    await serverFetch(`${server.baseUrl}/api/streams/${id}/settle`, {
      headers: { "Idempotency-Key": `settle-${idSuffix}` },
      method: "POST",
    });
    return id;
  }

  /**
   * Mocks global.fetch so the Horizon finality check returns a matching tx.
   * withdraw-finality.ts calls the global fetch directly.
   */
  function mockHorizonFound(txHash: string) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: { records: [{ hash: txHash, successful: true }] },
        _links: { next: { href: "https://horizon-testnet.stellar.org?cursor=c1" } },
      }),
    }) as unknown as typeof fetch;
  }

  function mockHorizonPending() {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: { records: [{ hash: "other-hash", successful: true }] },
        _links: { next: { href: "https://horizon-testnet.stellar.org?cursor=c2" } },
      }),
    }) as unknown as typeof fetch;
  }

  // ── Section: settle → withdraw happy path ────────────────────────────────
  // Covers the full create→start→settle→withdraw chain end-to-end.

  describe("settle → withdraw happy path", () => {
    it("full lifecycle: draft → active → ended → withdrawn", async () => {
      const id = await createEndedStream("happy");
      const txHash = db.streams.get(id)!.settlementTxHash!;

      mockHorizonFound(txHash);

      const res = await serverFetch(`${server.baseUrl}/api/streams/${id}/withdraw`, { method: "POST" });
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data.status).toBe("withdrawn");
      // why: nextAction must be cleared once the stream is fully withdrawn —
      // leaving it set would cause clients to retry an already-complete action.
      expect(body.data.nextAction).toBeUndefined();
      expect(body.withdrawal.state).toBe("succeeded");
      expect(body.withdrawal.confirmedTxHash).toBe(txHash);
      expect(db.streams.get(id)?.status).toBe("withdrawn");
    });

    it("withdraw returns pending when tx not yet on-chain", async () => {
      const id = await createEndedStream("pending");

      mockHorizonPending();

      const res = await serverFetch(`${server.baseUrl}/api/streams/${id}/withdraw`, { method: "POST" });
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data.status).toBe("ended");
      // why: nextAction must remain "withdraw" so the client knows to poll again.
      expect(body.data.nextAction).toBe("withdraw");
      expect(body.withdrawal.state).toBe("pending");
      expect(db.streams.get(id)?.status).toBe("ended");
    });
  });

  // ── Section: idempotent replays ───────────────────────────────────────────
  // Soroban transactions cannot be reversed once submitted. Idempotency keys
  // prevent duplicate on-chain submissions when clients retry on network errors.

  describe("idempotent replays", () => {
    it("settle replay returns cached response without calling settleStream again", async () => {
      const createRes = await serverFetch(`${server.baseUrl}/api/streams`, {
        body: JSON.stringify({ rate: "10", recipient: VALID_STELLAR_KEY, schedule: "month" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const { data } = await createRes.json();
      const id: string = data.id;
      await serverFetch(`${server.baseUrl}/api/streams/${id}/start`, { method: "POST" });

      const first = await serverFetch(`${server.baseUrl}/api/streams/${id}/settle`, {
        headers: { "Idempotency-Key": "idem-settle-replay" },
        method: "POST",
      });
      const firstBody = await first.json();
      expect(first.status).toBe(200);
      expect(settleSpy).toHaveBeenCalledTimes(1);

      const retry = await serverFetch(`${server.baseUrl}/api/streams/${id}/settle`, {
        headers: { "Idempotency-Key": "idem-settle-replay" },
        method: "POST",
      });
      const retryBody = await retry.json();
      expect(retry.status).toBe(200);
      expect(retryBody).toEqual(firstBody);
      // why: settleStream must not be called a second time — each call submits a
      // Soroban transaction that cannot be rolled back, so a duplicate would
      // double-spend the stream's escrowed funds.
      expect(settleSpy).toHaveBeenCalledTimes(1);
    });

    it("withdraw replay returns cached response without re-querying Horizon", async () => {
      const id = await createEndedStream("idem-withdraw");
      const txHash = db.streams.get(id)!.settlementTxHash!;
      mockHorizonFound(txHash);

      const first = await serverFetch(`${server.baseUrl}/api/streams/${id}/withdraw`, {
        headers: { "Idempotency-Key": "idem-withdraw-replay" },
        method: "POST",
      });
      const firstBody = await first.json();
      expect(first.status).toBe(200);
      const fetchCallCount = (global.fetch as jest.Mock).mock.calls.length;

      const retry = await serverFetch(`${server.baseUrl}/api/streams/${id}/withdraw`, {
        headers: { "Idempotency-Key": "idem-withdraw-replay" },
        method: "POST",
      });
      const retryBody = await retry.json();
      expect(retry.status).toBe(200);
      expect(retryBody).toEqual(firstBody);
      // why: Horizon must not be re-queried on replay — the cached response is
      // returned before the finality check runs, keeping the response deterministic.
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallCount);
    });

    it("withdraw on already-withdrawn stream returns 200 without re-processing", async () => {
      const id = await createEndedStream("already-withdrawn");
      const txHash = db.streams.get(id)!.settlementTxHash!;
      mockHorizonFound(txHash);

      await serverFetch(`${server.baseUrl}/api/streams/${id}/withdraw`, { method: "POST" });
      expect(db.streams.get(id)?.status).toBe("withdrawn");

      // Replace Horizon mock with a pending response — if the route re-runs finality
      // logic it would incorrectly revert the status back to "ended".
      mockHorizonPending();
      const res = await serverFetch(`${server.baseUrl}/api/streams/${id}/withdraw`, { method: "POST" });
      expect(res.status).toBe(200);
      const body = await res.json();
      // why: status must stay "withdrawn" — the route short-circuits on withdrawn
      // state without re-running finality logic.
      expect(body.data.status).toBe("withdrawn");
    });
  });

  // ── Section: rate-limit and approval branches ─────────────────────────────

  describe("rate-limit and approval branches", () => {
    // Only routes that call checkRateLimit enforce it; withdraw does, settle does not.
    it("returns 429 when write rate limit is exhausted", async () => {
      for (let i = 0; i < 10; i++) {
        await serverFetch(`${server.baseUrl}/api/streams/no-such-${i}/withdraw`, { method: "POST" });
      }
      const res = await serverFetch(`${server.baseUrl}/api/streams/no-such-overflow/withdraw`, { method: "POST" });
      // why: 429 must be returned (not 404) — rate limiting runs before stream lookup.
      expect(res.status).toBe(429);
    });

    // stream-ada is seeded as org-acme-owned (requireApprovals=2).
    // Actor-Wallet-Address header triggers checkStreamOrgPolicy in route handlers.

    it("non-org-member actor on org-owned stream → 403 NOT_ORG_MEMBER", async () => {
      const res = await serverFetch(`${server.baseUrl}/api/streams/stream-ada/pause`, {
        headers: { "Actor-Wallet-Address": "GSTRANGER000000000000000000000000000000000000000" },
        method: "POST",
      });
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("NOT_ORG_MEMBER");
    });

    it("viewer role on org-owned stream → 403 ROLE_INSUFFICIENT", async () => {
      const res = await serverFetch(`${server.baseUrl}/api/streams/stream-ada/pause`, {
        headers: { "Actor-Wallet-Address": "GVIEWER75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GS" },
        method: "POST",
      });
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("ROLE_INSUFFICIENT");
    });

    it("settle on org-owned stream with requireApprovals=2 → 409 APPROVAL_REQUIRED", async () => {
      // Owner has the settle permission but the org requires 2 approvals for settle.
      const res = await serverFetch(`${server.baseUrl}/api/streams/stream-ada/settle`, {
        headers: { "Actor-Wallet-Address": "GOWNER7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW" },
        method: "POST",
      });
      expect(res.status).toBe(409);
      // why: settleSpy must not be called — the approval gate must fire before
      // any Soroban transaction is submitted.
      expect((await res.json()).error.code).toBe("APPROVAL_REQUIRED");
    });
  });

  // ── Section: invalid-state error branches ─────────────────────────────────

  describe("invalid-state error branches", () => {
    it("pause on draft stream → 409 INVALID_STREAM_STATE", async () => {
      const createRes = await serverFetch(`${server.baseUrl}/api/streams`, {
        body: JSON.stringify({ rate: "10", recipient: VALID_STELLAR_KEY, schedule: "month" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const { data } = await createRes.json();

      const res = await serverFetch(`${server.baseUrl}/api/streams/${data.id}/pause`, { method: "POST" });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
    });

    it("settle on draft stream → 409 INVALID_STREAM_STATE", async () => {
      const createRes = await serverFetch(`${server.baseUrl}/api/streams`, {
        body: JSON.stringify({ rate: "10", recipient: VALID_STELLAR_KEY, schedule: "month" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const { data } = await createRes.json();

      const res = await serverFetch(`${server.baseUrl}/api/streams/${data.id}/settle`, { method: "POST" });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
      // why: settleStream must not be called for invalid-state transitions —
      // calling it would submit a Soroban transaction that cannot be rolled back.
      expect(settleSpy).not.toHaveBeenCalled();
    });

    it("withdraw on active stream → 409 INVALID_STREAM_STATE", async () => {
      const createRes = await serverFetch(`${server.baseUrl}/api/streams`, {
        body: JSON.stringify({ rate: "10", recipient: VALID_STELLAR_KEY, schedule: "month" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const { data } = await createRes.json();
      await serverFetch(`${server.baseUrl}/api/streams/${data.id}/start`, { method: "POST" });

      const res = await serverFetch(`${server.baseUrl}/api/streams/${data.id}/withdraw`, { method: "POST" });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("INVALID_STREAM_STATE");
    });

    it("settle on non-existent stream → 404 STREAM_NOT_FOUND", async () => {
      const res = await serverFetch(`${server.baseUrl}/api/streams/no-such-id/settle`, { method: "POST" });
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("STREAM_NOT_FOUND");
    });

    it("withdraw on non-existent stream → 404 STREAM_NOT_FOUND", async () => {
      const res = await serverFetch(`${server.baseUrl}/api/streams/no-such-id/withdraw`, { method: "POST" });
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("STREAM_NOT_FOUND");
    });

    it("settle failure from Stellar client → 502 SETTLEMENT_FAILED", async () => {
      const createRes = await serverFetch(`${server.baseUrl}/api/streams`, {
        body: JSON.stringify({ rate: "10", recipient: VALID_STELLAR_KEY, schedule: "month" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const { data } = await createRes.json();
      await serverFetch(`${server.baseUrl}/api/streams/${data.id}/start`, { method: "POST" });

      settleSpy.mockRejectedValueOnce(new Error("Soroban RPC timeout"));

      const res = await serverFetch(`${server.baseUrl}/api/streams/${data.id}/settle`, { method: "POST" });
      expect(res.status).toBe(502);
      expect((await res.json()).error.code).toBe("SETTLEMENT_FAILED");
    });
  });
});
