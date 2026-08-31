import { NextResponse } from "next/server";

/**
 * Claim eligibility endpoint (integration seam).
 *
 * The frontend resolves claim eligibility from the authoritative-evidence
 * record returned here for a (market, account) pair. This route is the single
 * seam the `ClaimEligibilityStatus` / `useClaimEligibility` client talks to.
 *
 * Authorization model:
 *  - If no `account` is supplied the caller is not authorized, so we respond
 *    401 which the client maps to a clean, non-misleading "permission" state
 *    (the user must connect their wallet).
 *  - If an account is supplied but no authoritative source is wired up in this
 *    deployment, we respond 404 ("not available for this market") which the
 *    client maps to a neutral empty state. When a real settlement source is
 *    connected, return a `ClaimEvidence` shaped like `types/claim-eligibility.ts`.
 *
 * The response must never include secrets.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");
  const account = searchParams.get("account");

  if (!marketId || !marketId.trim()) {
    return NextResponse.json(
      { error: "marketId is required" },
      { status: 400 },
    );
  }

  // No authorized caller: surface the permission state rather than guessing.
  if (!account || !account.trim()) {
    return NextResponse.json(
      { error: "An authorized account is required to view claim eligibility." },
      { status: 401 },
    );
  }

  // No authoritative claim source is configured in this deployment.
  return NextResponse.json(
    { error: "Claim eligibility is not available for this market." },
    { status: 404 },
  );
}
