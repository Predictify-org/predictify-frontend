import {
  FederationError,
  clearFederationCache,
  isFederationAddress,
  parseFederationAddress,
  resolveFederationAddress,
} from "./federation";

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Polyfill AbortSignal.timeout for Node < 20
if (typeof AbortSignal.timeout !== "function") {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout =
    (ms: number) => {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), ms);
      return ctrl.signal;
    };
}

const TOML_WITH_FEDERATION = `
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
FEDERATION_SERVER="https://federation.example.com/fed.json"
`;

const TOML_WITHOUT_FEDERATION = `
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
`;

const FEDERATION_RECORD = {
  stellar_address: "alice*example.com",
  account_id: "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G",
};

function okToml(body = TOML_WITH_FEDERATION) {
  return { ok: true, status: 200, text: async () => body };
}

function okJson(body: object) {
  return { ok: true, status: 200, json: async () => body };
}

function httpError(status: number) {
  return { ok: false, status };
}

beforeEach(() => {
  clearFederationCache();
  mockFetch.mockReset();
});

// ─── isFederationAddress ──────────────────────────────────────────────────────

describe("isFederationAddress", () => {
  it("accepts simple federation addresses", () => {
    expect(isFederationAddress("alice*stellar.org")).toBe(true);
    expect(isFederationAddress("bob*example.com")).toBe(true);
    expect(isFederationAddress("user.name*domain.co.uk")).toBe(true);
  });

  it("rejects raw Stellar account IDs", () => {
    expect(
      isFederationAddress(
        "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G",
      ),
    ).toBe(false);
  });

  it("rejects addresses missing an asterisk", () => {
    expect(isFederationAddress("alice@stellar.org")).toBe(false);
    expect(isFederationAddress("alicestellar.org")).toBe(false);
  });

  it("rejects addresses with an empty local part or domain", () => {
    expect(isFederationAddress("*stellar.org")).toBe(false);
    expect(isFederationAddress("alice*")).toBe(false);
  });

  it("rejects domains without a dot", () => {
    expect(isFederationAddress("alice*localhost")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isFederationAddress("")).toBe(false);
  });

  it("rejects strings with spaces", () => {
    expect(isFederationAddress("alice *stellar.org")).toBe(false);
  });
});

// ─── parseFederationAddress ───────────────────────────────────────────────────

describe("parseFederationAddress", () => {
  it("splits username and domain correctly", () => {
    expect(parseFederationAddress("alice*stellar.org")).toEqual({
      username: "alice",
      domain: "stellar.org",
    });
  });

  it("handles subdomains", () => {
    expect(parseFederationAddress("bob*pay.example.co.uk")).toEqual({
      username: "bob",
      domain: "pay.example.co.uk",
    });
  });

  it("throws FederationError with INVALID_FORMAT for invalid input", () => {
    expect(() => parseFederationAddress("notvalid")).toThrow(FederationError);
    expect(() => parseFederationAddress("notvalid")).toThrow(
      expect.objectContaining({ code: "INVALID_FORMAT" }),
    );
  });
});

// ─── resolveFederationAddress ─────────────────────────────────────────────────

describe("resolveFederationAddress", () => {
  it("throws INVALID_FORMAT for a non-federation string", async () => {
    await expect(
      resolveFederationAddress("GABC"),
    ).rejects.toMatchObject({ code: "INVALID_FORMAT" });
  });

  it("resolves a valid federation address end-to-end", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD));

    const result = await resolveFederationAddress("alice*example.com");

    expect(result.account_id).toBe(FEDERATION_RECORD.account_id);
    expect(result.stellar_address).toBe(FEDERATION_RECORD.stellar_address);
  });

  it("queries the federation server with the correct URL params", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD));

    await resolveFederationAddress("Alice*Example.COM");

    const federationCall = mockFetch.mock.calls[1][0] as string;
    const url = new URL(federationCall);
    expect(url.searchParams.get("q")).toBe("alice*example.com");
    expect(url.searchParams.get("type")).toBe("name");
  });

  it("returns cached result on a second call without extra fetches", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD));

    await resolveFederationAddress("alice*example.com");
    await resolveFederationAddress("alice*example.com");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("treats address lookup as case-insensitive for the cache key", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD));

    await resolveFederationAddress("ALICE*EXAMPLE.COM");
    await resolveFederationAddress("alice*example.com");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("re-fetches when bypassCache is true", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD))
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD));

    await resolveFederationAddress("alice*example.com");
    await resolveFederationAddress("alice*example.com", { bypassCache: true });

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it("throws NOT_FOUND when stellar.toml returns a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(httpError(404));

    await expect(
      resolveFederationAddress("alice*example.com"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when stellar.toml has no FEDERATION_SERVER entry", async () => {
    mockFetch.mockResolvedValueOnce(okToml(TOML_WITHOUT_FEDERATION));

    await expect(
      resolveFederationAddress("alice*example.com"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when the federation server returns 404", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(httpError(404));

    await expect(
      resolveFederationAddress("alice*example.com"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws SERVER_ERROR when the federation server returns 500", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(httpError(500));

    await expect(
      resolveFederationAddress("alice*example.com"),
    ).rejects.toMatchObject({ code: "SERVER_ERROR" });
  });

  it("throws NETWORK_ERROR when stellar.toml fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      resolveFederationAddress("alice*example.com"),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("throws NETWORK_ERROR when the federation server fetch throws", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      resolveFederationAddress("alice*example.com"),
    ).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});

// ─── clearFederationCache ─────────────────────────────────────────────────────

describe("clearFederationCache", () => {
  it("forces a fresh fetch after the cache is cleared", async () => {
    mockFetch
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD))
      .mockResolvedValueOnce(okToml())
      .mockResolvedValueOnce(okJson(FEDERATION_RECORD));

    await resolveFederationAddress("alice*example.com");
    clearFederationCache();
    await resolveFederationAddress("alice*example.com");

    expect(mockFetch).toHaveBeenCalledTimes(4);
  });
});
