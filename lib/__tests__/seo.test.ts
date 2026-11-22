import {
  absoluteUrl,
  buildMarketJsonLd,
  getBaseUrl,
  marketCanonical,
  serializeJsonLd,
} from "../seo";

describe("lib/seo", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  describe("getBaseUrl & absoluteUrl", () => {
    it("uses NEXT_PUBLIC_APP_URL and strips trailing slashes", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://predictify.example.com///";
      expect(getBaseUrl()).toBe("https://predictify.example.com");
      expect(absoluteUrl("/markets")).toBe(
        "https://predictify.example.com/markets"
      );
      expect(absoluteUrl("markets")).toBe(
        "https://predictify.example.com/markets"
      );
      expect(absoluteUrl("/")).toBe("https://predictify.example.com/");
      expect(absoluteUrl("")).toBe("https://predictify.example.com");
    });

    it("supports an explicit baseUrl override with trailing slash", () => {
      expect(absoluteUrl("/sitemap.xml", "https://custom.app/")).toBe(
        "https://custom.app/sitemap.xml"
      );
    });
  });

  describe("marketCanonical", () => {
    it("builds a canonical market URL and encodes special characters", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://predictify.example.com/";
      expect(marketCanonical("btc-price")).toBe(
        "https://predictify.example.com/markets/btc-price"
      );
      expect(marketCanonical("world cup 2026")).toBe(
        "https://predictify.example.com/markets/world%20cup%202026"
      );
    });
  });

  describe("buildMarketJsonLd & serializeJsonLd", () => {
    it("builds a valid schema.org Event object", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://predictify.example.com";
      const jsonLd = buildMarketJsonLd({
        id: "btc-price",
        title: "Bitcoin Price > $100k?",
        description: "Will BTC exceed $100k?",
        category: "Crypto",
        endDate: "2026-12-31T23:59:59Z",
      });

      expect(jsonLd).toEqual({
        "@context": "https://schema.org",
        "@type": "Event",
        name: "Bitcoin Price > $100k?",
        description: "Will BTC exceed $100k?",
        url: "https://predictify.example.com/markets/btc-price",
        about: {
          "@type": "Thing",
          name: "Crypto",
        },
        endDate: "2026-12-31T23:59:59Z",
      });
    });

    it("escapes < so </script> in titles cannot break out of script tags", () => {
      const jsonLd = buildMarketJsonLd({
        id: "xss-test",
        title: 'Will </script><script>alert("xss")</script> happen?',
        description: "Special chars: <>&\"'",
      });

      const serialized = serializeJsonLd(jsonLd);
      expect(serialized).not.toContain("</script>");
      expect(serialized).not.toContain("<");
      expect(serialized).toContain("\\u003c/script>");

      // Must still parse back to the exact original object
      expect(JSON.parse(serialized)).toEqual(jsonLd);
    });
  });
});
