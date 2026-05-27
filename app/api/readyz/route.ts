import { NextResponse } from "next/server";
import { getReadinessReport } from "@/app/lib/health";

export async function GET() {
  const report = await getReadinessReport();
  return NextResponse.json(report, { status: report.status === "ok" ? 200 : 503 });
}
