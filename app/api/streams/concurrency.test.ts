/** @jest-environment node */
import { POST as settlePOST } from "./[id]/settle/route";
import { POST as withdrawPOST } from "./[id]/withdraw/route";
import { db } from "@/app/lib/db";

describe("Concurrency Hardening", () => {
  const streamId = "stream-ada";

  beforeEach(() => {
    // Reset stream state
    const stream = db.streams.get(streamId);
    if (stream) {
      // @ts-ignore
      stream.status = "active";
      db.streams.set(streamId, stream);
    }
    db.idempotency.clear();
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

  it("prevents double-withdrawal", async () => {
    // First settle it manually in the DB
    const stream = db.streams.get(streamId)!;
    // @ts-ignore
    stream.status = "ended";
    db.streams.set(streamId, stream);

    const requests = Array.from({ length: 50 }).map(() => {
      const req = new Request(`http://localhost/api/streams/${streamId}/withdraw`, {
        method: "POST"
      });
      return withdrawPOST(req, { params: Promise.resolve({ id: streamId }) });
    });

    const results = await Promise.all(requests);

    const successCount = results.filter(r => r.status === 200).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(49);
    expect(db.streams.get(streamId)?.status).toBe("withdrawn");
  });
});
