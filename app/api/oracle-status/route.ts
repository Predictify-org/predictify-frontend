import { NextResponse } from "next/server";

/**
 * Oracle status endpoint (integration seam).
 *
 * The frontend resolves oracle freshness + fallback status from the
 * resolution-chain attempts returned here. This route is the single seam the
 * `OracleStatusBadge` / `useOracleStatus` client talks to.
 *
 * In this frontend deployment no on-chain oracle event source is wired up, so
 * we respond 404 ("not available for this market") which the client maps to a
 * clean, non-misleading "unavailable" state. When a real source is connected,
 * return `{ attempts: OracleAttemptResult[] }` shaped like
 * `types/oracle-status.ts`. The response must never include secrets.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");

  if (!marketId || !marketId.trim()) {
    return NextResponse.json(
      { error: "marketId is required" },
      { status: 400 },
    );
  }

  // No oracle data source is configured in this deployment.
  return NextResponse.json(
    { error: "Oracle status is not available for this market." },
    { status: 404 },
  );
}
