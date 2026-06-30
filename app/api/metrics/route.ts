import { NextResponse } from "next/server";
import { logger } from "@/app/lib/logger";
import { getMetrics } from "@/app/lib/rate-limit-metrics";

/**
 * GET /api/metrics
 *
 * Exposes application metrics in Prometheus text exposition format.
 *
 * ## Authentication
 * The endpoint is gated by a static bearer token supplied via the
 * `METRICS_AUTH_TOKEN` environment variable. Callers must present it as
 * `Authorization: Bearer <token>`. If the variable is unset the route is
 * disabled (returns 503) so metrics are never exposed accidentally.
 *
 * The token comparison is constant-time to avoid leaking its length or
 * contents through timing side-channels.
 *
 * ## Response
 * - `200 text/plain; version=0.0.4` — Prometheus metrics on success.
 * - `401` — missing or malformed `Authorization` header.
 * - `403` — token present but incorrect.
 * - `503` — endpoint disabled (no token configured).
 */

const PROM_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";

/**
 * Constant-time string comparison. Returns `true` only when both inputs are
 * identical. The loop always runs over the longer of the two lengths so the
 * timing does not depend on where the first mismatch occurs.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Escapes a Prometheus label value per the text exposition format spec. */
function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

/**
 * Renders the in-memory counters as Prometheus metrics. Each metric carries a
 * `# HELP` and `# TYPE` line followed by one sample per label set.
 */
function renderPrometheus(): string {
  const metrics = getMetrics();
  const lines: string[] = [];

  lines.push("# HELP streampay_requests_total Total requests observed per route.");
  lines.push("# TYPE streampay_requests_total counter");
  for (const [route, count] of Object.entries(metrics.total)) {
    lines.push(`streampay_requests_total{route="${escapeLabel(route)}"} ${count}`);
  }

  lines.push("# HELP streampay_rate_limit_throttled_total Throttled requests per route and limit type.");
  lines.push("# TYPE streampay_rate_limit_throttled_total counter");
  for (const [key, count] of Object.entries(metrics.throttled)) {
    const sep = key.lastIndexOf(":");
    const route = sep >= 0 ? key.slice(0, sep) : key;
    const limitType = sep >= 0 ? key.slice(sep + 1) : "unknown";
    lines.push(
      `streampay_rate_limit_throttled_total{route="${escapeLabel(route)}",limit_type="${escapeLabel(limitType)}"} ${count}`
    );
  }

  // Always-present gauge so scrapers can confirm the endpoint is healthy even
  // when no traffic has been recorded yet.
  lines.push("# HELP streampay_metrics_up Whether the metrics endpoint is serving.");
  lines.push("# TYPE streampay_metrics_up gauge");
  lines.push("streampay_metrics_up 1");

  return `${lines.join("\n")}\n`;
}

export async function GET(request: Request): Promise<NextResponse> {
  const expected = process.env.METRICS_AUTH_TOKEN;

  if (!expected) {
    logger.warn("Metrics endpoint requested but METRICS_AUTH_TOKEN is not configured");
    return NextResponse.json(
      { error: { code: "METRICS_DISABLED", message: "Metrics endpoint is not configured." } },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing or malformed Authorization header." } },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } }
    );
  }

  if (!timingSafeEqual(match[1], expected)) {
    logger.warn("Metrics endpoint rejected an invalid token");
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid metrics token." } },
      { status: 403 }
    );
  }

  const body = renderPrometheus();
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": PROM_CONTENT_TYPE, "Cache-Control": "no-store" },
  });
}
