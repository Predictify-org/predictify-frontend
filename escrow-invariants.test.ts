import { EscrowInvariants } from "./escrow-invariants";
import { ContractStreamStatus, OnChainStream } from "./types";
import { mapContractToUI, mapDbStream, mapOnChainStream } from "./mapping";

const mockStream: OnChainStream = {
  id: "test-stream",
  recipient_address: "GB...123",
  token: "XLM",
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

    it("rejects settlement if funds are already fully released", () => {
      const result = EscrowInvariants.canSettle({
        ...mockStream,
        released_amount: 1000n,
        total_amount: 1000n,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("already fully released");
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

  describe("validateBalances", () => {
    it("allows valid balances", () => {
      const result = EscrowInvariants.validateBalances(mockStream);
      expect(result.isValid).toBe(true);
    });

    it("rejects negative total amount", () => {
      const result = EscrowInvariants.validateBalances({
        ...mockStream,
        total_amount: -100n,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Total amount cannot be negative");
    });

    it("rejects negative released amount", () => {
      const result = EscrowInvariants.validateBalances({
        ...mockStream,
        released_amount: -50n,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Released amount cannot be negative");
    });

    it("rejects released amount exceeding total amount", () => {
      const result = EscrowInvariants.validateBalances({
        ...mockStream,
        total_amount: 500n,
        released_amount: 600n,
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Released amount cannot exceed total amount");
    });
  });

  describe("Field Mapping", () => {
    it("maps contract stream to UI", () => {
      const mapped = mapContractToUI(mockStream);
      expect(mapped).toEqual({
        id: "test-stream",
        recipient: "GB...123",
        amount: "1000",
        status: ContractStreamStatus.ACTIVE,
      });
    });

    it("maps db stream and contract stream to unified comparison format", () => {
      const dbStream = {
        id: "s1",
        recipient_address: "addr1",
        total_amount: "100",
        released_amount: "50",
        status: "ACTIVE",
      };
      const mappedDb = mapDbStream(dbStream);
      expect(mappedDb).toEqual({
        id: "s1",
        recipientAddress: "addr1",
        totalAmount: 100n,
        releasedAmount: 50n,
        status: "ACTIVE",
      });

      const mappedOnChain = mapOnChainStream(mockStream);
      expect(mappedOnChain).toEqual({
        id: "test-stream",
        recipientAddress: "GB...123",
        totalAmount: 1000n,
        releasedAmount: 500n,
        status: ContractStreamStatus.ACTIVE,
      });
    });
  });
});