import { getNetworkTint, NETWORK_TINTS, type NetworkType } from "../network-tint";

describe("lib/network-tint", () => {
  describe("exact names, mixed case, and padded names", () => {
    it("returns mainnet tint by identity for exact, mixed-case, and padded strings", () => {
      expect(getNetworkTint("mainnet")).toBe(NETWORK_TINTS.mainnet);
      expect(getNetworkTint("MainNet")).toBe(NETWORK_TINTS.mainnet);
      expect(getNetworkTint("MAINNET")).toBe(NETWORK_TINTS.mainnet);
      expect(getNetworkTint("Public Mainnet Network")).toBe(NETWORK_TINTS.mainnet);
      expect(getNetworkTint("Stellar mainnet live")).toBe(NETWORK_TINTS.mainnet);
    });

    it("returns testnet tint by identity for exact, mixed-case, and padded strings", () => {
      expect(getNetworkTint("testnet")).toBe(NETWORK_TINTS.testnet);
      expect(getNetworkTint("TestNet")).toBe(NETWORK_TINTS.testnet);
      expect(getNetworkTint("TESTNET")).toBe(NETWORK_TINTS.testnet);
      expect(getNetworkTint("Stellar Testnet")).toBe(NETWORK_TINTS.testnet);
      expect(getNetworkTint("testnet-sandbox")).toBe(NETWORK_TINTS.testnet);
    });

    it("returns futurenet tint by identity for exact, mixed-case, and padded strings", () => {
      expect(getNetworkTint("futurenet")).toBe(NETWORK_TINTS.futurenet);
      expect(getNetworkTint("FutureNet")).toBe(NETWORK_TINTS.futurenet);
      expect(getNetworkTint("FUTURENET")).toBe(NETWORK_TINTS.futurenet);
      expect(getNetworkTint("Soroban Futurenet")).toBe(NETWORK_TINTS.futurenet);
      expect(getNetworkTint("futurenet test")).toBe(NETWORK_TINTS.futurenet);
    });
  });

  describe("unknown fallbacks", () => {
    it("returns unknown tint for empty string", () => {
      expect(getNetworkTint("")).toBe(NETWORK_TINTS.unknown);
    });

    it("returns unknown tint for 'private'", () => {
      expect(getNetworkTint("private")).toBe(NETWORK_TINTS.unknown);
    });

    it("returns unknown tint for whitespace", () => {
      expect(getNetworkTint("   ")).toBe(NETWORK_TINTS.unknown);
      expect(getNetworkTint("\t\n ")).toBe(NETWORK_TINTS.unknown);
    });

    it("returns unknown tint for the Stellar public-network passphrase string", () => {
      const stellarPassphrase = "Public Global Stellar Network ; September 2015";
      expect(getNetworkTint(stellarPassphrase)).toBe(NETWORK_TINTS.unknown);
    });

    it("returns unknown tint for unrecognized network names", () => {
      expect(getNetworkTint("localhost")).toBe(NETWORK_TINTS.unknown);
      expect(getNetworkTint("standalone")).toBe(NETWORK_TINTS.unknown);
      expect(getNetworkTint("custom-network")).toBe(NETWORK_TINTS.unknown);
    });
  });

  describe("keyword precedence", () => {
    it("prioritizes mainnet over testnet and futurenet (mainnet > testnet > futurenet)", () => {
      expect(getNetworkTint("mainnet-testnet")).toBe(NETWORK_TINTS.mainnet);
      expect(getNetworkTint("testnet-mainnet")).toBe(NETWORK_TINTS.mainnet);
      expect(getNetworkTint("mainnet-futurenet")).toBe(NETWORK_TINTS.mainnet);
    });

    it("prioritizes testnet over futurenet (testnet > futurenet)", () => {
      expect(getNetworkTint("testnet-futurenet")).toBe(NETWORK_TINTS.testnet);
      expect(getNetworkTint("futurenet-testnet")).toBe(NETWORK_TINTS.testnet);
    });
  });

  describe("NETWORK_TINTS shape and color validation", () => {
    const networkKeys: NetworkType[] = ["mainnet", "testnet", "futurenet", "unknown"];
    const hexColorRegex = /^#[0-9a-f]{6}$/i;

    it("defines entries for all four network types", () => {
      networkKeys.forEach((key) => {
        expect(NETWORK_TINTS[key]).toBeDefined();
      });
    });

    it.each(networkKeys)(
      "entry for %s has non-empty fields with valid hex tint and border",
      (key) => {
        const tintConfig = NETWORK_TINTS[key];
        expect(tintConfig.tint).toBeTruthy();
        expect(tintConfig.bg).toBeTruthy();
        expect(tintConfig.border).toBeTruthy();
        expect(tintConfig.text).toBeTruthy();

        expect(tintConfig.tint).toMatch(hexColorRegex);
        expect(tintConfig.border).toMatch(hexColorRegex);
      }
    );
  });
});
