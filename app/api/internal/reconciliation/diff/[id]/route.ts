/**
 * GET /api/internal/reconciliation/diff/:streamId
 *
 * Returns a structured diff for a specific stream, comparing its
 * on-chain state against the local expected state.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  isValidStreamId,
  fetchStreamDiff,
  type ReconciliationDiff,
  type ErrorEnvelope,
} from "./handler"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ReconciliationDiff | ErrorEnvelope>> {
  const { id: streamId } = await params

  if (!isValidStreamId(streamId)) {
    return NextResponse.json<ErrorEnvelope>(
      { error: "Invalid streamId format", code: "INVALID_STREAM_ID" },
      { status: 400 }
    )
  }

  const diff = await fetchStreamDiff(streamId)

  if (!diff) {
    return NextResponse.json<ErrorEnvelope>(
      { error: "Stream not found", code: "STREAM_NOT_FOUND" },
      { status: 404 }
    )
  }

  return NextResponse.json<ReconciliationDiff>(diff, { status: 200 })
}
