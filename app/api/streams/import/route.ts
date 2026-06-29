/**
 * POST /api/streams/import
 *
 * Bulk-import streams from a CSV payload.
 * Accepts application/json with a `rows` array of CSV-parsed objects.
 * Returns per-row success/failure and a summary.
 */

import { NextResponse } from "next/server";

interface ImportRow {
  recipient: string;
  amount: string;
  asset?: string;
  memo?: string;
}

interface RowResult {
  index: number;
  status: "imported" | "error";
  error?: string;
  streamId?: string;
}

function validateRow(row: ImportRow, index: number): string | null {
  if (!row.recipient || typeof row.recipient !== "string" || row.recipient.trim().length === 0) {
    return `row ${index}: missing recipient`;
  }
  const amount = Number(row.amount);
  if (!row.amount || Number.isNaN(amount) || amount <= 0) {
    return `row ${index}: amount must be a positive number`;
  }
  return null;
}

export async function POST(request: Request) {
  let body: { rows?: ImportRow[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { status: 400 },
    );
  }

  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: { code: "MISSING_ROWS", message: "rows array is required and must not be empty" } },
      { status: 400 },
    );
  }

  if (rows.length > 500) {
    return NextResponse.json(
      { error: { code: "TOO_MANY_ROWS", message: "Maximum 500 rows per import" } },
      { status: 400 },
    );
  }

  const results: RowResult[] = [];
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const validationError = validateRow(row, i + 1);
    if (validationError) {
      results.push({ index: i + 1, status: "error", error: validationError });
      failed++;
      continue;
    }
    // In production this would call the stream creation service.
    const streamId = `stream_import_${Date.now()}_${i}`;
    results.push({ index: i + 1, status: "imported", streamId });
    imported++;
  }

  return NextResponse.json(
    {
      summary: { total: rows.length, imported, failed },
      results,
    },
    { status: 207 },
  );
}
