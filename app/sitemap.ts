import type { MetadataRoute } from "next";
import { sampleMarkets } from "@/content/markets.sample";
import { absoluteUrl, marketCanonical } from "@/lib/seo";

export interface SitemapMarketEntry {
  id: string;
  lastModified?: Date | string;
}

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/markets", changeFrequency: "hourly", priority: 0.9 },
  { path: "/events", changeFrequency: "hourly", priority: 0.8 },
  { path: "/leaderboard", changeFrequency: "daily", priority: 0.7 },
  { path: "/docs", changeFrequency: "weekly", priority: 0.6 },
  { path: "/help", changeFrequency: "weekly", priority: 0.5 },
];

export function buildSitemap(
  markets: SitemapMarketEntry[] = sampleMarkets
): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const seenIds = new Set<string>();
  const marketEntries: MetadataRoute.Sitemap = [];

  for (const market of markets) {
    if (!market.id || seenIds.has(market.id)) {
      continue;
    }
    seenIds.add(market.id);
    marketEntries.push({
      url: marketCanonical(market.id),
      lastModified: market.lastModified ?? now,
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  return [...staticEntries, ...marketEntries];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
