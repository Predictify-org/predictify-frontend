jest.mock("@/app/components/PredictionCommentsLoader", () => ({
  __esModule: true,
  default: () => null,
}));

import sitemap, { buildSitemap } from "../sitemap";
import robots from "../robots";
import { generateMetadata } from "../markets/[id]/page";
import { sampleMarkets } from "@/content/markets.sample";

describe("app/sitemap, app/robots, and market metadata", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://predictify.example.com/";
  });

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  describe("sitemap()", () => {
    it("returns static routes and public markets with normalized absolute URLs", () => {
      const entries = sitemap();
      const urls = entries.map((entry) => entry.url);

      expect(urls).toContain("https://predictify.example.com/");
      expect(urls).toContain("https://predictify.example.com/markets");
      expect(urls).toContain("https://predictify.example.com/events");
      expect(urls).toContain("https://predictify.example.com/leaderboard");

      for (const market of sampleMarkets) {
        expect(urls).toContain(
          `https://predictify.example.com/markets/${market.id}`
        );
      }

      // No double slashes in paths
      for (const url of urls) {
        expect(url.replace(/^https?:\/\//, "")).not.toContain("//");
      }
    });

    it("handles an empty market list gracefully", () => {
      const entries = buildSitemap([]);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.url.includes("/markets/"))).toBe(false);
    });
  });

  describe("robots()", () => {
    it("allows public pages, disallows private/API routes, and points to sitemap.xml", () => {
      const result = robots();
      expect(result.sitemap).toBe("https://predictify.example.com/sitemap.xml");

      const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
      const wildcard = rules.find((r) => r.userAgent === "*");
      expect(wildcard).toBeDefined();
      expect(wildcard?.allow).toBe("/");
      expect(wildcard?.disallow).toEqual(
        expect.arrayContaining(["/api/", "/settings", "/dashboard"])
      );
    });
  });

  describe("app/markets/[id]/page generateMetadata", () => {
    it("sets canonical URL from config for valid markets", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ id: "btc-price" }),
      });

      expect(metadata.alternates?.canonical).toBe(
        "https://predictify.example.com/markets/btc-price"
      );
      expect(metadata.robots).toBeUndefined();
    });

    it("sets robots noindex and omits canonical for not-found markets", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ id: "not-found" }),
      });

      expect(metadata.alternates?.canonical).toBeUndefined();
      expect(metadata.robots).toEqual({
        index: false,
        follow: false,
      });
    });
  });
});
