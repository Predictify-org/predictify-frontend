/**
 * Root layout metadata — extracted so it can be unit-tested without importing
 * layout.tsx (which pulls in next/font/google and CSS files).
 *
 * Re-exported from app/layout.tsx as `export { metadata }`.
 */

import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/seo";
import { config } from "@/lib/config";

const description =
  "Join thousands of predictors worldwide and start earning from your knowledge and intuition today.";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Predictify - Prediction Platform",
    template: "%s | Predictify",
  },
  description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: config.app.name,
    url: getBaseUrl(),
    title: "Predictify - Prediction Platform",
    description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Predictify - Prediction Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Predictify - Prediction Platform",
    description,
    images: ["/og-image.png"],
  },
};
