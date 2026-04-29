import { scrubStreamPII, processDeletionRequest } from "./app/lib/privacy";
import { db } from "./app/lib/db";
import { Stream } from "./app/types/openapi";

describe("Privacy Services", () => {
  const sampleStream: Stream = {
    id: "test-stream",
    recipient: "GD7H...3J4K",
    rate: "10 XLM/day",
    schedule: "daily",
    status: "active",
    email: "test@example.com",
    label: "Private Label",
    memo: "Secret Memo",
    partnerId: "PID-999",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe("scrubStreamPII", () => {
    it("redacts PII for 'user' role", () => {
      const scrubbed = scrubStreamPII(sampleStream, 'user');
      expect(scrubbed.email).toBe("t***t@example.com");
      expect(scrubbed.label).toBe("[REDACTED]");
      expect(scrubbed.memo).toBe("[REDACTED]");
      expect(scrubbed.partnerId).toBe("[MASKED]");
    });

    it("allows full access for 'admin' role", () => {
      const scrubbed = scrubStreamPII(sampleStream, 'admin');
      expect(scrubbed.email).toBe(sampleStream.email);
      expect(scrubbed.label).toBe(sampleStream.label);
    });
  });

  describe("processDeletionRequest", () => {
    it("permanently scrubs PII from the database", async () => {
      const walletAddress = "GD7H...3J4K";
      
      // Ensure user exists first
      db.users.set(walletAddress, {
        wallet_address: walletAddress,
        email: "ada@creativestudio.io",
        display_name: "Ada",
        avatar_url: null,
        created_at: new Date().toISOString(),
      });

      const result = await processDeletionRequest(walletAddress);
      
      expect(result.requestId).toMatch(/^dsr-/);
      expect(db.users.has(walletAddress)).toBe(false);

      // Verify stream scrubbing
      const stream = db.streams.get("stream-ada");
      if (stream) {
        expect(stream.email).toBeUndefined();
        expect(stream.label).toBeUndefined();
      }
    });

    it("is idempotent", async () => {
      const walletAddress = "non-existent-wallet";
      const result1 = await processDeletionRequest(walletAddress);
      const result2 = await processDeletionRequest(walletAddress);
      
      expect(result1.status).toBe("processing");
      expect(result2.status).toBe("processing");
    });
  });
});
