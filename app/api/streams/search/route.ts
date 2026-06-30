/**
 * GET /api/streams/search
 *
 * Full-text + filter search across streams.
 * Query params:
 *   q        - full-text query (matches id, recipient, memo)
 *   status   - filter by stream status
 *   asset    - filter by asset symbol
 *   sender   - filter by sender address
 *   from     - ISO date lower bound (createdAt)
 *   to       - ISO date upper bound (createdAt)
 *   limit    - max results (default 50, max 200)
 */

import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";

function matchesText(value: string | undefined, query: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(query.toLowerCase());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status");
  const asset = searchParams.get("asset");
  const sender = searchParams.get("sender");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 200);

  const { streamRepository } = getStore();
  let streams = Array.from(streamRepository.getAll?.() ?? []);

  // Full-text filter
  if (q.trim()) {
    streams = streams.filter(
      (s) =>
        matchesText(s.id, q) ||
        matchesText(s.recipient, q) ||
        matchesText(s.memo, q) ||
        matchesText(s.sender, q),
    );
  }

  // Field filters
  if (status) {
    streams = streams.filter((s) => s.status === status);
  }
  if (asset) {
    streams = streams.filter((s) => s.asset === asset);
  }
  if (sender) {
    streams = streams.filter((s) => s.sender === sender);
  }
  if (from) {
    const fromMs = Date.parse(from);
    if (!Number.isNaN(fromMs)) {
      streams = streams.filter((s) => Date.parse(s.createdAt ?? "") >= fromMs);
    }
  }
  if (to) {
    const toMs = Date.parse(to);
    if (!Number.isNaN(toMs)) {
      streams = streams.filter((s) => Date.parse(s.createdAt ?? "") <= toMs);
    }
  }

  const total = streams.length;
  const results = streams.slice(0, limit);

  return NextResponse.json({ total, limit, results });
}
