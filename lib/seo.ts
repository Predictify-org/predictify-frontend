import { config } from "./config";

export interface MarketSeoInput {
  id: string;
  title: string;
  description: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Returns the normalized application base URL without a trailing slash.
 * Reads `NEXT_PUBLIC_APP_URL` dynamically when available, falling back to `config.app.url`.
 */
export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || config.app.url;
  return raw.replace(/\/+$/, "");
}

/**
 * Builds an absolute URL from a relative path using the configured app base URL.
 */
export function absoluteUrl(path: string, baseUrl?: string): string {
  const base = (baseUrl ?? getBaseUrl()).replace(/\/+$/, "");
  if (!path) {
    return base;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/**
 * Returns the canonical URL for a prediction market detail page.
 */
export function marketCanonical(id: string, baseUrl?: string): string {
  return absoluteUrl(`/markets/${encodeURIComponent(id)}`, baseUrl);
}

/**
 * Builds a schema.org JSON-LD object for a prediction market.
 */
export function buildMarketJsonLd(
  market: MarketSeoInput,
  baseUrl?: string
): Record<string, unknown> {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: market.title,
    description: market.description,
    url: marketCanonical(market.id, baseUrl),
  };

  if (market.category) {
    jsonLd.about = {
      "@type": "Thing",
      name: market.category,
    };
  }

  if (market.startDate) {
    jsonLd.startDate = market.startDate;
  }

  if (market.endDate) {
    jsonLd.endDate = market.endDate;
  }

  return jsonLd;
}

/**
 * Safely serializes a JSON-LD object for embedding inside a `<script type="application/ld+json">` tag.
 * Escapes `<` to `\u003c` so user/market strings containing `</script>` cannot break out of the script tag.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
