import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    checked_at: new Date().toISOString(),
  });
}
