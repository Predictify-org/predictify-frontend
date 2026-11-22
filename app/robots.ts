import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/settings",
          "/settings/",
          "/dashboard",
          "/bets",
          "/claims",
          "/finances",
          "/linked-accounts",
          "/mypredictions",
          "/profile",
          "/transactions",
          "/verification",
          "/login",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
