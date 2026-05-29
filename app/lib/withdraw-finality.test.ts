import { evaluateWithdrawalState } from "./withdraw-finality";
import type { Stream } from "@/app/types/openapi";
import type { FetchLike } from "./withdraw-finality";

function createStream(overrides: Partial<Stream> = {}): Stream {
  return {
    id: "stream-yusuf",
    recipient: "Yusuf QA Partnership",
    rate: "18 XLM / day",
    schedule: "Ended yesterday with funds available",
    status: "ended",
    nextAction: "withdraw",
    createdAt: "2026-04-15T08:00:00Z",
    updatedAt: "2026-04-27T20:00:00Z",
    settlementTxHash: "tx-123",
    ...overrides,
  };
}

describe("evaluateWithdrawalState", () => {
  it("keeps withdrawal pending when settlement tx is not yet found", async () => {
    const stream = createStream({
      withdrawal: {
        state: "pending",
        requestedAt: "2026-04-28T08:00:00.000Z",
        lastCheckedAt: "2026-04-28T08:00:00.000Z",
        attempts: 0,
        settlementTxHash: "tx-123",
      },
    });

    const fetcher = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        _embedded: { records: [{ hash: "other-tx", successful: true }] },
        _links: { next: { href: "https://horizon-testnet.stellar.org?page=1&cursor=abc123" } },
      }),
    }));
    const result = await evaluateWithdrawalState(
      stream,
      new Date("2026-04-28T08:00:30.000Z"),
      fetcher as unknown as FetchLike,
    );

    expect(result.alert).toBe(false);
    expect(result.stream.status).toBe("ended");
    expect(result.stream.withdrawal?.state).toBe("pending");
    expect(result.stream.withdrawal?.attempts).toBe(1);
  });

  it("marks withdrawal succeeded when settlement tx appears later", async () => {
    const stream = createStream({
      withdrawal: {
        state: "pending",
        requestedAt: "2026-04-28T08:00:00.000Z",
        lastCheckedAt: "2026-04-28T08:00:30.000Z",
        attempts: 1,
        settlementTxHash: "tx-123",
      },
    });

    const fetcher = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        _embedded: { records: [{ hash: "tx-123", successful: true }] },
        _links: { next: { href: "https://horizon-testnet.stellar.org?page=1&cursor=abc123" } },
      }),
    }));
    const result = await evaluateWithdrawalState(
      stream,
      new Date("2026-04-28T08:00:45.000Z"),
      fetcher as unknown as FetchLike,
    );

    expect(result.alert).toBe(false);
    expect(result.stream.status).toBe("withdrawn");
    expect(result.stream.nextAction).toBeUndefined();
    expect(result.stream.withdrawal?.state).toBe("succeeded");
    expect(result.stream.withdrawal?.confirmedTxHash).toBe("tx-123");
  });
});
