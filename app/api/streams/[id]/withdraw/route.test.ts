/** @jest-environment node */
import { db } from "@/app/lib/db";
import { POST as settle } from "../settle/route";
import { POST as withdraw } from "./route";
import type { Stream } from "@/app/types/openapi";

declare const beforeAll: (fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const afterAll: (fn: () => void) => void;
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => Promise<void> | void) => void;
declare const expect: any;
declare const jest: any;

const ORIGINAL = new Map<string, Stream>();

function cloneStream(stream: Stream): Stream {
  return {
    ...stream,
    withdrawal: stream.withdrawal ? { ...stream.withdrawal } : undefined,
  };
}

beforeAll(() => {
  db.streams.forEach((value, key) => {
    ORIGINAL.set(key, cloneStream(value));
  });
});

beforeEach(() => {
  db.streams.clear();
  ORIGINAL.forEach((value, key) => {
    db.streams.set(key, cloneStream(value));
  });
});

afterAll(() => {
  db.streams.clear();
  ORIGINAL.forEach((value, key) => {
    db.streams.set(key, cloneStream(value));
  });
});

function setFetchResponse(payload: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
  }) as unknown as typeof fetch;
}

describe("POST /api/streams/[id]/withdraw", () => {
  it("returns pending first, then succeeded when tx appears", async () => {
    await settle({} as Request, {
      params: Promise.resolve({ id: "stream-ada" }),
    });

    setFetchResponse({
      _embedded: { records: [{ hash: "other-hash", successful: true }] },
      _links: { next: { href: "https://horizon-testnet.stellar.org?cursor=a1" } },
    });
    const pendingResponse = await withdraw(
      {} as Request,
      { params: Promise.resolve({ id: "stream-ada" }) },
    );
    const pendingBody = await pendingResponse.json();

    expect(pendingResponse.status).toBe(200);
    expect(pendingBody.data.status).toBe("ended");
    expect(pendingBody.withdrawal.state).toBe("pending");

    const settlementTxHash = pendingBody.data.settlementTxHash;
    setFetchResponse({
      _embedded: { records: [{ hash: settlementTxHash, successful: true }] },
      _links: { next: { href: "https://horizon-testnet.stellar.org?cursor=a2" } },
    });
    const successResponse = await withdraw(
      {} as Request,
      { params: Promise.resolve({ id: "stream-ada" }) },
    );
    const successBody = await successResponse.json();

    expect(successResponse.status).toBe(200);
    expect(successBody.data.status).toBe("withdrawn");
    expect(successBody.withdrawal.state).toBe("succeeded");
  });
});
