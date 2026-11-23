import {
  computeFeesEarned,
  getAllowedCreatorActions,
  sumTokenAmounts,
  type CreatedMarket,
} from "@/lib/creator";
import {
  mockCreatorMarketsProvider,
  setMockCreatorMarkets,
} from "@/hooks/useCreatorMarkets";
import { createCancelMarketIntent } from "@/lib/creator-intents";

function createMarket(overrides: Partial<CreatedMarket> = {}): CreatedMarket {
  return {
    id: "market-1",
    title: "Will it happen?",
    status: "open",
    volume: "0",
    feeBps: 250,
    feesEarned: "0",
    createdAt: "2025-01-01T00:00:00.000Z",
    deadline: "2030-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("creator market calculations", () => {
  it("calculates fees using integer token units for 7-decimal amounts", () => {
    expect(computeFeesEarned("12.3456789", 250)).toBe("0.3086419");
    expect(computeFeesEarned(0.0000001, 10_000)).toBe("0.0000001");
    expect(computeFeesEarned("0", 250)).toBe("0");
    expect(sumTokenAmounts(["0.1", "0.2", "0.0000001"])).toBe("0.3000001");
  });

  it("rejects amounts with more precision than supported", () => {
    expect(() => computeFeesEarned("0.00000001", 100)).toThrow(RangeError);
  });

  it("allows cancellation only before the deadline and before any bet", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const noBets = getAllowedCreatorActions(
      createMarket({ deadline: "2026-01-01T00:00:00.001Z" }),
      now
    );
    expect(noBets.cancelMarket.allowed).toBe(true);

    const hasBet = getAllowedCreatorActions(
      createMarket({
        volume: "0.0000001",
        deadline: "2026-01-01T00:00:00.001Z",
      }),
      now
    );
    expect(hasBet.cancelMarket).toEqual({
      allowed: false,
      reason: "Markets cannot be cancelled after the first bet.",
    });
  });

  it("allows resolution only after the deadline and while unresolved", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const atDeadline = getAllowedCreatorActions(
      createMarket({ deadline: "2026-01-01T00:00:00.000Z" }),
      now
    );
    expect(atDeadline.requestResolution.allowed).toBe(false);

    const afterDeadline = getAllowedCreatorActions(
      createMarket({ deadline: "2025-12-31T23:59:59.999Z" }),
      now
    );
    expect(afterDeadline.requestResolution.allowed).toBe(true);

    const resolved = getAllowedCreatorActions(
      createMarket({
        status: "resolved",
        deadline: "2025-12-31T23:59:59.999Z",
      }),
      now
    );
    expect(resolved.requestResolution).toEqual({
      allowed: false,
      reason: "This market is already resolved.",
    });

    it("returns mock markets only for the requested creator wallet", async () => {
      const owner = "creator-wallet-one";
      const otherWallet = "creator-wallet-two";
      setMockCreatorMarkets(owner, [createMarket()]);

      await expect(mockCreatorMarketsProvider.listByCreator(owner)).resolves.toHaveLength(1);
      await expect(mockCreatorMarketsProvider.listByCreator(otherWallet)).resolves.toEqual([]);
    });

    it("builds a wallet-scoped creator intent with the shared hash/status shape", async () => {
      const intent = await createCancelMarketIntent("market-1", "wallet-1");
      expect(intent).toMatchObject({
        key: `wallet-1:${intent.intentHash}`,
        walletAddress: "wallet-1",
        status: "built",
        action: "cancel_market",
        marketId: "market-1",
      });
      expect(intent.intentHash).toBeTruthy();
    });
  });
});
