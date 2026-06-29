/**
 * GET /api/admin/streams/health
 *
 * Admin endpoint returning aggregate health metrics for the streams subsystem:
 * active/paused/errored counts, recent failure rate, oldest stuck stream.
 */

import { NextResponse } from "next/server";
import { getStore } from "@/app/lib/db";

function requireAdmin(request: Request): boolean {
  const role = request.headers.get("x-admin-role");
  return role === "admin" || role === "superadmin";
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Admin access required" } },
      { status: 403 },
    );
  }

  const { streamRepository } = getStore();
  const streams = Array.from(streamRepository.getAll?.() ?? []);

  const counts: Record<string, number> = {};
  let oldestStuckAt: string | null = null;

  for (const s of streams) {
    const status = s.status ?? "unknown";
    counts[status] = (counts[status] ?? 0) + 1;

    if (status === "errored" || status === "stuck") {
      const createdAt = s.createdAt ?? "";
      if (!oldestStuckAt || createdAt < oldestStuckAt) {
        oldestStuckAt = createdAt;
      }
    }
  }

  const total = streams.length;
  const errored = counts["errored"] ?? 0;
  const failureRatePct = total > 0 ? Math.round((errored / total) * 10000) / 100 : 0;

  return NextResponse.json({
    health: {
      total,
      byStatus: counts,
      failureRatePct,
      oldestStuckAt,
      checkedAt: new Date().toISOString(),
    },
  });
}
