import type { Stream } from "../types/openapi";
import { maskAddress, toAnonymousReceipt } from "./anon-receipt";

const baseStream: Stream = {
  id: "stream-123",
  recipient: "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  rate: "100",
  schedule: "monthly",
  status: "active",
  email: "alice@example.com",
  label: "Salary",
  memo: "March payout",
  partnerId: "partner-9",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  token: "XLM",
  senderAddress: "GZYXWVUTSRQPONMLKJIHGFEDCBA765432",
};

describe("anon-receipt", () => {
  describe("maskAddress", () => {
    it("masks a full address to prefix/suffix", () => {
      expect(maskAddress("GABCDEFGHIJKLMNOP")).toBe("GABC…MNOP");
    });

    it("collapses short or missing values", () => {
      expect(maskAddress("GABC1234")).toBe("•••");
      expect(maskAddress("")).toBe("•••");
      expect(maskAddress(undefined)).toBe("•••");
    });
  });

  describe("toAnonymousReceipt", () => {
    it("strips all PII fields", () => {
      const receipt = toAnonymousReceipt(baseStream) as Record<string, unknown>;
      expect(receipt).not.toHaveProperty("email");
      expect(receipt).not.toHaveProperty("label");
      expect(receipt).not.toHaveProperty("memo");
      expect(receipt).not.toHaveProperty("partnerId");
      expect(receipt).not.toHaveProperty("recipient");
      expect(receipt).not.toHaveProperty("senderAddress");
    });

    it("masks recipient and sender addresses", () => {
      const receipt = toAnonymousReceipt(baseStream);
      expect(receipt.recipientMasked).toBe("GABC…4567");
      expect(receipt.senderMasked).toBe("GZYX…5432");
    });

    it("marks the receipt as read-only and omits sender when absent", () => {
      const { senderAddress, ...noSender } = baseStream;
      void senderAddress;
      const receipt = toAnonymousReceipt(noSender as Stream);
      expect(receipt.readonly).toBe(true);
      expect(receipt.senderMasked).toBeUndefined();
    });
  });
});
