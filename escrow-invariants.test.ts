import { EscrowInvariants } from "./escrow-invariants";
import { ContractStreamStatus, OnChainStream } from "./types";

const mockStream: OnChainStream = {
  id: "test-stream",
  recipient_address: "GB...123",
  total_amount: 1000n,
  released_amount: 500n,
  velocity: 10n,
  last_update_timestamp: Date.now(),
  status: ContractStreamStatus.ACTIVE,
};

describe("Escrow Invariants", () => {
  describe("canSettle", () => {
    it("allows settlement for active streams with balance", () => {
      const result = EscrowInvariants.canSettle(mockStream);
      expect(result.isValid).toBe(true);
    });

    it("rejects settlement if stream is already settled", () => {
      const result = EscrowInvariants.canSettle({
        ...mockStream,
        status: ContractStreamStatus.SETTLED,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("not in a settlable state");
    });
  });

  describe("canWithdraw", () => {
    it("allows withdrawal when settled and funds remain", () => {
      const result = EscrowInvariants.canWithdraw({
        ...mockStream,
        status: ContractStreamStatus.SETTLED,
      });
      expect(result.isValid).toBe(true);
    });

    it("rejects withdrawal if status is not settled", () => {
      const result = EscrowInvariants.canWithdraw(mockStream);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("must be SETTLED");
    });

    it("rejects withdrawal if no funds remain", () => {
      const result = EscrowInvariants.canWithdraw({ ...mockStream, status: ContractStreamStatus.SETTLED, released_amount: 1000n });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("No remaining funds");
    });
  });
});