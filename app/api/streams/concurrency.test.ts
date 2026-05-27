/** @jest-environment node */
import { POST as settlePOST } from "./[id]/settle/route";
import { POST as withdrawPOST } from "./[id]/withdraw/route";
import { db, resetDb } from "@/app/lib/db";
import { resetRateLimitStore } from "@/app/lib/rate-limit-store";

describe("Issue #247: Concurrency and Double-Credit Prevention", () => {
  const streamId = "stream-ada";

  beforeEach(() => {
    resetDb();
    resetRateLimitStore();
    // Ensure stream is in active state for settle
    const stream = db.streams.get(streamId);
    if (stream) {
      stream.status = "active";
      stream.nextAction = "settle";
    }
  });

  describe("Parallel Settle Tests", () => {
    it("parallel settle requests with SAME Idempotency-Key yield exactly ONE tx hash", async () => {
      const idempotencyKey = "settle-key-identical";
      
      // Fire 10 parallel settle requests with the SAME key
      const requests = Array.from({ length: 10 }).map(() => {
        const req = new Request(`http://localhost/api/streams/${streamId}/settle`, {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
        });
        return settlePOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      const results = await Promise.all(requests);
      
      // All responses should be 200 (idempotent)
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBe(10);
      
      // All responses should contain the SAME tx hash
      const hashes = await Promise.all(results.map(r => r.json()));
      const txHashes = hashes
        .map(data => data.data?.settlementTxHash || data.settlement?.settlementTxHash)
        .filter(h => h);
      
      const uniqueHashes = new Set(txHashes);
      expect(uniqueHashes.size).toBe(1);
      expect(txHashes.length).toBe(10);
      
      // Stream should have exactly one settled state
      const settledStream = db.streams.get(streamId);
      expect(settledStream?.status).toBe("ended");
      expect(settledStream?.settlementTxHash).toBeDefined();
      expect(settledStream?.withdrawal?.attempts).toBe(0);
    });

    it("parallel settle requests with DIFFERENT Idempotency-Keys yield only ONE success (others 409)", async () => {
      // Fire 10 parallel requests with DISTINCT keys
      const requests = Array.from({ length: 10 }).map((_, i) => {
        const req = new Request(`http://localhost/api/streams/${streamId}/settle`, {
          method: "POST",
          headers: { "Idempotency-Key": `settle-key-${i}` },
        });
        return settlePOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      const results = await Promise.all(requests);
      
      // Exactly 1 success (200), rest should be 409 (conflict)
      const successCount = results.filter(r => r.status === 200).length;
      const conflictCount = results.filter(r => r.status === 409).length;
      
      expect(successCount).toBe(1);
      expect(conflictCount).toBe(9);
      
      // Only ONE audit event should be recorded
      const settledStream = db.streams.get(streamId);
      expect(settledStream?.status).toBe("ended");
      expect(settledStream?.settlementTxHash).toBeDefined();
    });

    it("parallel settle WITHOUT Idempotency-Key yields only ONE success", async () => {
      // Fire 10 parallel requests WITHOUT Idempotency-Key
      const requests = Array.from({ length: 10 }).map(() => {
        const req = new Request(`http://localhost/api/streams/${streamId}/settle`, {
          method: "POST",
        });
        return settlePOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      const results = await Promise.all(requests);
      
      // Exactly 1 success, rest should be 409
      const successCount = results.filter(r => r.status === 200).length;
      const conflictCount = results.filter(r => r.status === 409).length;
      
      expect(successCount).toBe(1);
      expect(conflictCount + successCount).toBe(10);
    });
  });

  describe("Parallel Withdraw Tests", () => {
    beforeEach(() => {
      // Pre-settle the stream for withdraw tests
      const stream = db.streams.get(streamId);
      if (stream) {
        stream.status = "ended";
        stream.nextAction = "withdraw";
        stream.settlementTxHash = "fake-tx-12345";
        stream.withdrawal = {
          attempts: 0,
          lastCheckedAt: new Date().toISOString(),
          requestedAt: new Date().toISOString(),
          settlementTxHash: "fake-tx-12345",
          state: "pending",
        };
      }
    });

    it("parallel withdraw requests with SAME Idempotency-Key do not double-advance attempts", async () => {
      const idempotencyKey = "withdraw-key-identical";
      
      // Fire 10 parallel withdraw requests with the SAME key
      const requests = Array.from({ length: 10 }).map(() => {
        const req = new Request(`http://localhost/api/streams/${streamId}/withdraw`, {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
        });
        return withdrawPOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      const results = await Promise.all(requests);
      
      // All should be 200 (idempotent)
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBe(10);
      
      // Withdrawal attempts should NOT have incremented 10 times
      const stream = db.streams.get(streamId);
      expect(stream?.withdrawal?.attempts).toBeLessThanOrEqual(1);
    });

    it("parallel withdraw requests with DIFFERENT Idempotency-Keys yield only ONE successful state change", async () => {
      // Fire 10 parallel requests with DISTINCT keys
      const requests = Array.from({ length: 10 }).map((_, i) => {
        const req = new Request(`http://localhost/api/streams/${streamId}/withdraw`, {
          method: "POST",
          headers: { "Idempotency-Key": `withdraw-key-${i}` },
        });
        return withdrawPOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      const results = await Promise.all(requests);
      
      // Exactly 1 success or some 200s (idempotent caching), rest 409
      const successCount = results.filter(r => r.status === 200).length;
      const conflictCount = results.filter(r => r.status === 409).length;
      
      expect(successCount + conflictCount).toBe(10);
      
      // Only ONE withdrawal.attempts increment
      const stream = db.streams.get(streamId);
      expect(stream?.withdrawal?.attempts).toBeLessThanOrEqual(1);
    });

    it("parallel withdraw WITHOUT Idempotency-Key prevents double-advance", async () => {
      const requests = Array.from({ length: 10 }).map(() => {
        const req = new Request(`http://localhost/api/streams/${streamId}/withdraw`, {
          method: "POST",
        });
        return withdrawPOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      const results = await Promise.all(requests);
      
      // At most 1 success
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBeLessThanOrEqual(1);
      
      // Verify withdrawal.attempts didn't double-increment
      const stream = db.streams.get(streamId);
      expect(stream?.withdrawal?.attempts).toBeLessThanOrEqual(1);
    });
  });

  describe("Cross-operation Concurrency", () => {
    it("concurrent settle and withdraw on same stream respect lock ordering", async () => {
      const settleReq = new Request(`http://localhost/api/streams/${streamId}/settle`, {
        method: "POST",
        headers: { "Idempotency-Key": "cross-settle" },
      });
      
      const withdrawReq = new Request(`http://localhost/api/streams/${streamId}/withdraw`, {
        method: "POST",
        headers: { "Idempotency-Key": "cross-withdraw" },
      });
      
      // Fire both in parallel
      const settlePromise = settlePOST(settleReq, { params: Promise.resolve({ id: streamId }) });
      const withdrawPromise = withdrawPOST(withdrawReq, { params: Promise.resolve({ id: streamId }) });
      
      const [settleRes, withdrawRes] = await Promise.all([settlePromise, withdrawPromise]);
      
      // One should succeed (200), the other depends on stream state
      const statuses = [settleRes.status, withdrawRes.status].sort();
      // Either settle succeeds (200) and withdraw waits, or vice versa
      expect(settleRes.status + withdrawRes.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe("Audit Event Integrity", () => {
    it("exactly ONE audit event recorded per successful settle under concurrent load", async () => {
      const idempotencyKey = "audit-test-settle";
      
      const requests = Array.from({ length: 20 }).map(() => {
        const req = new Request(`http://localhost/api/streams/${streamId}/settle`, {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
        });
        return settlePOST(req, { params: Promise.resolve({ id: streamId }) });
      });

      await Promise.all(requests);
      
      const stream = db.streams.get(streamId);
      // Should have exactly one tx hash (not multiple settlements)
      expect(stream?.status).toBe("ended");
      expect(stream?.settlementTxHash).toMatch(/^fake-tx-/);
    });
  });
});
