import { NextResponse, type NextRequest } from "next/server";
import {
  isV1SunsetPassed,
  sunsetResponse,
  V1_DEPRECATION_DATE,
  V1_SUNSET_DATE,
  V2_MIGRATION_URL,
} from "@/app/lib/api-version";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/v1/")) {
    // After sunset, stop proxying and return 410 Gone with migration link.
    if (isV1SunsetPassed()) {
      return sunsetResponse();
    }

    // Rewrite /api/v1/<rest> → /api/<rest> so existing route handlers serve it.
    const rewrittenUrl = request.nextUrl.clone();
    rewrittenUrl.pathname = pathname.replace("/api/v1/", "/api/");

    const response = NextResponse.rewrite(rewrittenUrl);

    // RFC 9745 Deprecation and Sunset headers on every v1 response.
    response.headers.set("Deprecation", V1_DEPRECATION_DATE.toUTCString());
    response.headers.set("Sunset", V1_SUNSET_DATE.toUTCString());
    response.headers.set(
      "Link",
      `<${V2_MIGRATION_URL}>; rel="successor-version", <${V2_MIGRATION_URL}>; rel="deprecation"`,
    );
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on versioned API paths to avoid overhead on pages.
  matcher: "/api/v1/:path*",
};
