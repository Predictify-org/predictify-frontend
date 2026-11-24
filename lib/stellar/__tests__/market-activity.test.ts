import {
  parseContractEvent,
  parseContractEvents,
  fetchMarketActivity,
  MarketActivityEvent,
} from "../market-activity";

describe("lib/stellar/market-activity", () => {
  describe("parseContractEvent", () => {
    it("parses a valid bet event with explicit type", () => {
      const raw = {
        id: "evt-1",
        type: "bet",
        address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        amount: "150.5",
        outcome: "Yes",
        ledgerClosedAt: "2026-11-20T10:00:00Z",
        txHash: "0xabc123",
      };

      const result = parseContractEvent(raw);
      expect(result).toEqual({
        id: "evt-1",
        type: "bet",
        address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        amount: "150.5",
        outcome: "Yes",
        ledgerClosedAt: "2026-11-20T10:00:00Z",
        txHash: "0xabc123",
      });
    });

    it("detects claim type from topics", () => {
      const raw = {
        id: "evt-2",
        topics: ["event", "claim_payout"],
        address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        amount: "200",
        outcome: "No",
        ledgerClosedAt: "2026-11-21T12:00:00Z",
        txHash: "0xdef456",
      };

      const result = parseContractEvent(raw);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("claim");
      expect(result?.amount).toBe("200");
    });

    it("detects dispute type from topic", () => {
      const raw = {
        id: "evt-3",
        topic: ["market_dispute"],
        address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        ledgerClosedAt: "2026-11-22T08:00:00Z",
        txHash: "0x789ghi",
      };

      const result = parseContractEvent(raw);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("dispute");
      expect(result?.amount).toBeUndefined();
    });

    it("parses numeric amount as string", () => {
      const raw = {
        id: "evt-4",
        type: "bet",
        address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        amount: 500,
        ledgerClosedAt: "2026-11-22T09:00:00Z",
        txHash: "0x999",
      };

      const result = parseContractEvent(raw);
      expect(result?.amount).toBe("500");
    });

    it("extracts address from topics when explicit address is absent", () => {
      const raw = {
        id: "evt-5",
        type: "bet",
        topics: [
          "bet",
          "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
        ],
        amount: "100",
        ledgerClosedAt: "2026-11-22T10:00:00Z",
        txHash: "0x111",
      };

      const result = parseContractEvent(raw);
      expect(result?.address).toBe(
        "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"
      );
    });

    it("ignores unknown event type without throwing", () => {
      const raw = {
        id: "evt-unknown",
        type: "liquidity_added",
        address: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      };

      expect(() => parseContractEvent(raw)).not.toThrow();
      expect(parseContractEvent(raw)).toBeNull();
    });

    it("drops events missing an address without throwing", () => {
      const raw = {
        id: "evt-no-addr",
        type: "bet",
        amount: "100",
      };

      expect(parseContractEvent(raw)).toBeNull();
    });

    it("handles null, undefined, and non-object inputs gracefully", () => {
      expect(parseContractEvent(null)).toBeNull();
      expect(parseContractEvent(undefined)).toBeNull();
      expect(parseContractEvent("invalid string")).toBeNull();
      expect(parseContractEvent(12345)).toBeNull();
      expect(parseContractEvent({})).toBeNull();
    });
  });

  describe("parseContractEvents", () => {
    it("filters and parses valid events dropping invalid ones", () => {
      const rawList = [
        {
          id: "evt-1",
          type: "bet",
          address: "GABC1234567890",
          amount: "10",
          ledgerClosedAt: "2026-11-20T00:00:00Z",
          txHash: "tx-1",
        },
        {
          id: "evt-bad",
          type: "unknown_action",
        },
        null,
        {
          id: "evt-2",
          type: "claim",
          address: "GDEF1234567890",
          amount: "25",
          ledgerClosedAt: "2026-11-20T01:00:00Z",
          txHash: "tx-2",
        },
      ];

      const results = parseContractEvents(rawList);
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("evt-1");
      expect(results[1].id).toBe("evt-2");
    });

    it("returns empty array when given non-array", () => {
      // @ts-expect-error test invalid input
      expect(parseContractEvents(null)).toEqual([]);
      // @ts-expect-error test invalid input
      expect(parseContractEvents({})).toEqual([]);
    });
  });

  describe("fetchMarketActivity", () => {
    it("uses custom fetcher when provided", async () => {
      const mockCustomFetcher = jest.fn().mockResolvedValue({
        events: [
          {
            id: "custom-1",
            type: "bet" as const,
            address: "GABC",
            amount: "100",
            ledgerClosedAt: "2026-11-22T00:00:00Z",
            txHash: "tx-custom",
          },
        ],
        nextCursor: "cursor-2",
      });

      const res = await fetchMarketActivity({
        marketId: "market-100",
        cursor: "cursor-1",
        limit: 10,
        fetcher: mockCustomFetcher,
      });

      expect(mockCustomFetcher).toHaveBeenCalledWith({
        marketId: "market-100",
        cursor: "cursor-1",
        limit: 10,
        fetcher: mockCustomFetcher,
      });
      expect(res.events).toHaveLength(1);
      expect(res.events[0].id).toBe("custom-1");
      expect(res.nextCursor).toBe("cursor-2");
    });

    it("fetches from API and parses response", async () => {
      const mockResponse = {
        events: [
          {
            id: "net-1",
            type: "bet",
            address: "GNET123",
            amount: "50",
            ledgerClosedAt: "2026-11-22T00:00:00Z",
            txHash: "tx-net",
          },
        ],
        nextCursor: "next-cursor-xyz",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const res = await fetchMarketActivity({
        marketId: "market-200",
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(res.events).toHaveLength(1);
      expect(res.events[0].id).toBe("net-1");
      expect(res.nextCursor).toBe("next-cursor-xyz");
    });

    it("throws error when fetch response is not ok", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(
        fetchMarketActivity({ marketId: "market-err" })
      ).rejects.toThrow("Failed to fetch market activity: 500 Internal Server Error");
    });
  });
});
