import {
  fetchClaimEligibility,
  ClaimEligibilityClientError,
} from "@/lib/claim-eligibility-client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const EVIDENCE = {
  marketId: "m1",
  outcome: "Lakers to win",
  userPrediction: "Lakers to win",
  resolvedAt: 1700000000000,
  source: "oracle",
  claimed: false,
  claimStatus: "available",
  winnings: 18,
  winningsToken: "XLM",
  marketTitle: "NBA Finals",
};

describe("fetchClaimEligibility", () => {
  it("rejects an empty marketId without a network call", async () => {
    const fetchImpl = jest.fn();
    await expect(
      fetchClaimEligibility("", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns normalized evidence on success", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(EVIDENCE));
    const result = await fetchClaimEligibility("m1", {
      fetchImpl: fetchImpl as never,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/claim-eligibility?marketId=m1"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(result.marketId).toBe("m1");
    expect(result.source).toBe("oracle");
    expect(result.claimStatus).toBe("available");
  });

  it("forwards the account query param when authorized", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(EVIDENCE));
    await fetchClaimEligibility("m1", {
      account: "GABC",
      fetchImpl: fetchImpl as never,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("account=GABC"),
      expect.anything(),
    );
  });

  it("normalizes epoch-seconds timestamps to milliseconds", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        jsonResponse({ ...EVIDENCE, resolvedAt: 1700000000 }),
      );
    const result = await fetchClaimEligibility("m1", {
      fetchImpl: fetchImpl as never,
    });
    expect(result.resolvedAt).toBe(1700000000000);
  });

  it("maps 403 to a non-retryable permission error", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ error: "no" }, 403));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "permission", retryable: false });
  });

  it("maps 401 to a non-retryable permission error", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 401));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "permission", retryable: false });
  });

  it("maps 404 to a non-retryable not_found error", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 404));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "not_found", retryable: false });
  });

  it("maps 400 to a non-retryable invalid error", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 400));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
  });

  it("maps 429 and 5xx to retryable network errors", async () => {
    const rateLimited = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 429));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: rateLimited as never }),
    ).rejects.toMatchObject({ kind: "network", retryable: true });

    const serverError = jest
      .fn()
      .mockResolvedValue(jsonResponse({}, 503));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: serverError as never }),
    ).rejects.toMatchObject({ kind: "network", retryable: true });
  });

  it("rejects malformed evidence without a misleading result", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ marketId: "", source: "oracle" }));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
  });

  it("rejects an unsupported source", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ ...EVIDENCE, source: "bogus" }));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "invalid", retryable: false });
  });

  it("maps a network failure to a retryable error", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValue(new Error("network down"));
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "network", retryable: true });
  });

  it("maps an abort to a non-retryable aborted error", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );
    await expect(
      fetchClaimEligibility("m1", { fetchImpl: fetchImpl as never }),
    ).rejects.toMatchObject({ kind: "aborted", retryable: false });
  });

  it("exposes a stable error name", () => {
    const err = new ClaimEligibilityClientError("x", "invalid", false);
    expect(err.name).toBe("ClaimEligibilityClientError");
    expect(err.kind).toBe("invalid");
    expect(err.retryable).toBe(false);
  });
});
