/**
 * POST /api/streams/dryrun
 *
 * Preflight validation for stream creation — runs all validation
 * checks without writing anything. Returns what would happen if
 * the stream were created for real.
 */

import { NextResponse } from "next/server";

interface DryRunRequest {
  recipient: string;
  sender: string;
  asset: string;
  amountPerInterval: number;
  intervalSeconds: number;
  durationSeconds?: number;
  memo?: string;
}

interface ValidationIssue {
  field: string;
  message: string;
}

function validate(body: Partial<DryRunRequest>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!body.recipient?.trim()) {
    issues.push({ field: "recipient", message: "recipient is required" });
  }
  if (!body.sender?.trim()) {
    issues.push({ field: "sender", message: "sender is required" });
  }
  if (!body.asset?.trim()) {
    issues.push({ field: "asset", message: "asset is required" });
  }
  if (!body.amountPerInterval || Number(body.amountPerInterval) <= 0) {
    issues.push({ field: "amountPerInterval", message: "must be a positive number" });
  }
  if (!body.intervalSeconds || Number(body.intervalSeconds) < 60) {
    issues.push({ field: "intervalSeconds", message: "must be at least 60 seconds" });
  }
  if (body.durationSeconds !== undefined && Number(body.durationSeconds) <= 0) {
    issues.push({ field: "durationSeconds", message: "must be a positive number if provided" });
  }
  if (body.memo && body.memo.length > 256) {
    issues.push({ field: "memo", message: "memo must be 256 characters or fewer" });
  }

  return issues;
}

export async function POST(request: Request) {
  let body: Partial<DryRunRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const issues = validate(body);

  if (issues.length > 0) {
    return NextResponse.json(
      { valid: false, issues },
      { status: 422 },
    );
  }

  const amountPerInterval = Number(body.amountPerInterval);
  const intervalSeconds = Number(body.intervalSeconds);
  const durationSeconds = body.durationSeconds ? Number(body.durationSeconds) : null;

  const estimatedPayments = durationSeconds
    ? Math.floor(durationSeconds / intervalSeconds)
    : null;

  const totalEstimatedAmount = estimatedPayments !== null
    ? estimatedPayments * amountPerInterval
    : null;

  return NextResponse.json({
    valid: true,
    issues: [],
    preview: {
      recipient: body.recipient,
      sender: body.sender,
      asset: body.asset,
      amountPerInterval,
      intervalSeconds,
      durationSeconds,
      estimatedPayments,
      totalEstimatedAmount,
      memo: body.memo ?? null,
    },
  });
}
