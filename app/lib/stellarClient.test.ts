import {
  buildCacheKey,
  createResilientStellarClient,
  HttpError,
  TimeoutError,
} from "./stellarClient";

type JsonValue = Record<string, unknown>;

type StubResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<JsonValue>;
  text: () => Promise<string>;
};

const createResponse = (status: number, payload: JsonValue): StubResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

const baseOptions = {
  tenant: "stream-pay",
  timeoutMs: 25,
  maxConcurrent: 2,
  circuitBreaker: {
    failureThreshold: 1,
    successThreshold: 1,
    openDurationMs: 50,
    halfOpenMaxInFlight: 1,
  },
  cache: {
    accountTtlMs: 20,
    balanceTtlMs: 20,
    staleTtlMs: 100,
  },
};

describe("Resilient Stellar client", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("serves stale cache on 503 when circuit opens", async () => {
    const fetcher = jest.fn().mockResolvedValue(createResponse(200, { ok: true }));
    const client = createResilientStellarClient(baseOptions, fetcher);

    const url = "https://example.org/horizon/accounts/GABC";
    const address = "GABC";

    await client.readAccount<JsonValue>({ url, address });
    jest.advanceTimersByTime(baseOptions.cache.accountTtlMs + 1);

    fetcher.mockResolvedValueOnce(createResponse(503, { error: "down" }));
    const cached = await client.readAccount<JsonValue>({ url, address });

    expect(cached).toEqual({ ok: true });
    expect(client.getCircuitState()).toBe("open");
  });

  it("times out slow responses", async () => {
    const fetcher = jest.fn().mockImplementation(
      () =>
        new Promise<StubResponse>((resolve) =>
          setTimeout(() => resolve(createResponse(200, { ok: true })), 50),
        ),
    );
    const client = createResilientStellarClient({ ...baseOptions, timeoutMs: 10 }, fetcher);

    const promise = client.readBalances<JsonValue>({
      url: "https://example.org/soroban/balances/GABC",
      address: "GABC",
    });

    await jest.advanceTimersByTimeAsync(60);
    await expect(promise).rejects.toThrow(TimeoutError);
  });

  it("recovers after half-open success", async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(createResponse(503, { error: "down" }))
      .mockResolvedValueOnce(createResponse(200, { ok: true }));
    const client = createResilientStellarClient(baseOptions, fetcher);

    await expect(
      client.readBalances<JsonValue>({
        url: "https://example.org/soroban/balances/GDEF",
        address: "GDEF",
      }),
    ).rejects.toThrow(HttpError);

    expect(client.getCircuitState()).toBe("open");

    await jest.advanceTimersByTimeAsync(baseOptions.circuitBreaker.openDurationMs + 1);
    const response = await client.readBalances<JsonValue>({
      url: "https://example.org/soroban/balances/GDEF",
      address: "GDEF",
    });

    expect(response).toEqual({ ok: true });
    expect(client.getCircuitState()).toBe("closed");

    const metrics = client.getCircuitMetrics();
    expect(metrics.stateTransitions.some((entry) => entry.to === "half-open")).toBe(true);
    expect(metrics.halfOpenRatio).toBeGreaterThan(0);
  });

  it("requires tenant and address in cache keys", () => {
    expect(() => buildCacheKey({ tenant: "", address: "GABC", scope: "account" })).toThrow(
      /tenant/i,
    );
    expect(() => buildCacheKey({ tenant: "stream", address: "", scope: "balance" })).toThrow(
      /address/i,
    );
  });
});
