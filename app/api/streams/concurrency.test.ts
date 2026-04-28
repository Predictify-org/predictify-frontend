/** @jest-environment node */
import { POST as settlePOST } from "./[id]/settle/route";
import { POST as withdrawPOST } from "./[id]/withdraw/route";
import { db, resetDb } from "@/app/lib/db";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";

describe("Concurrency Hardening", () => {
  const streamId = "stream-ada";

  beforeEach(() => {
    resetDb();
    resetRateLimitStore();
  });

  it("prevents double-settlement under high concurrency (100 parallel requests)", async () => {
    const requests = Array.from({ length: 100 }).map((_, i) => {
      const req = new Request(`http://localhost/api/streams/${streamId}/settle`, {
        method: "POST",
      });
      return settlePOST(req, { params: Promise.resolve({ id: streamId }) });
    });

    const results = await Promise.all(requests);

    const successCount = results.filter(r => r.status === 200).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    // Only 1 should succeed, the rest should be 409
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(99);
    
    expect(db.streams.get(streamId)?.status).toBe("ended");
  });

  it("handles idempotent re-posts correctly", async () => {
    const idempotencyKey = "test-key-123";
    
    const req1 = new Request(`http://localhost/api/streams/${streamId}/settle`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey }
    });
    const res1 = await settlePOST(req1, { params: Promise.resolve({ id: streamId }) });
    const data1 = await res1.json();

    const req2 = new Request(`http://localhost/api/streams/${streamId}/settle`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey }
    });
    const res2 = await settlePOST(req2, { params: Promise.resolve({ id: streamId }) });
    const data2 = await res2.json();

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(data1).toEqual(data2);
  });

  it("returns the same payload for concurrent idempotent withdraw retries", async () => {
    const stream = db.streams.get(streamId)!;
    stream.status = "ended";
    stream.nextAction = "withdraw";
    stream.settlementTxHash = "fake-tx-shared";
    db.streams.set(streamId, stream);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: { records: [{ hash: "fake-tx-shared", successful: true }] },
        _links: { next: { href: "https://horizon-testnet.stellar.org?cursor=withdraw-1" } },
      }),
    }) as unknown as typeof fetch;

    const requests = Array.from({ length: 10 }).map(() => {
      const req = new Request(`http://localhost/api/streams/${streamId}/withdraw`, {
        method: "POST",
        headers: { "Idempotency-Key": "withdraw-key-1" },
      });
      return withdrawPOST(req, { params: Promise.resolve({ id: streamId }) });
    });

    const results = await Promise.all(requests);
    const payloads = await Promise.all(results.map((response) => response.json()));

    expect(results.every((response) => response.status === 200)).toBe(true);
    expect(payloads.every((payload) => payload.data.status === "withdrawn")).toBe(true);
    expect(payloads.every((payload) => payload.withdrawal.state === "succeeded")).toBe(true);
    expect(payloads.every((payload) => JSON.stringify(payload) === JSON.stringify(payloads[0]))).toBe(true);
    expect(db.streams.get(streamId)?.status).toBe("withdrawn");
  });
});
