/** @jest-environment node */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { db, resetDb } from "@/app/lib/db";
import type { StellarSettlementClient } from "@/app/lib/stellar";
import { POST as createStream } from "@/app/api/streams/route";
import { POST as startStream } from "@/app/api/streams/[id]/start/route";
import { POST as pauseStream } from "@/app/api/streams/[id]/pause/route";
import { POST as settleStream } from "@/app/api/streams/[id]/settle/route";

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
    body,
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

  const streamActionMatch = pathname.match(/^\/api\/streams\/([^/]+)\/(start|pause|settle)$/);
  if (request.method === "POST" && streamActionMatch) {
    const [, id, action] = streamActionMatch;
    const context: RouteContext = { params: Promise.resolve({ id }) };

    if (action === "start") {
      return startStream(request, context);
    }

    if (action === "pause") {
      return pauseStream(request, context);
    }

    return settleStream(request, context);
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

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    resetDb();
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
  });

  it("creates, starts, pauses, and settles a stream with idempotent retries", async () => {
    const createResponse = await fetch(`${server.baseUrl}/api/streams`, {
      body: JSON.stringify({
        rate: "50 XLM / month",
        recipient: "E2E Recipient",
        schedule: "Pays every 30 days",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-e2e-key",
      },
      method: "POST",
    });

    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.data.recipient).toBe("E2E Recipient");
    expect(createBody.data.status).toBe("draft");

    const createdStreamId = createBody.data.id as string;
    expect(db.streams.get(createdStreamId)?.status).toBe("draft");

    const createRetryResponse = await fetch(`${server.baseUrl}/api/streams`, {
      body: JSON.stringify({
        rate: "50 XLM / month",
        recipient: "Different Recipient Should Be Ignored On Retry",
        schedule: "Pays every 30 days",
      }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "create-e2e-key",
      },
      method: "POST",
    });

    expect(createRetryResponse.status).toBe(201);
    const createRetryBody = await createRetryResponse.json();
    expect(createRetryBody).toEqual(createBody);
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
});
