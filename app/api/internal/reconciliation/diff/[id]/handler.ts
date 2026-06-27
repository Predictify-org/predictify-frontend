/**
 * Pure logic for the reconciliation diff endpoint.
 * Separated from next/server so it can be unit-tested in jsdom.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreamField {
  field: string
  onChain: unknown
  expected: unknown
}

export interface ReconciliationDiff {
  streamId: string
  status: "match" | "mismatch" | "missing"
  diffs: StreamField[]
  checkedAt: string
}

export interface ErrorEnvelope {
  error: string
  code: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that `id` is safe: alphanumeric + hyphens/underscores, max 128 chars.
 */
export function isValidStreamId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(id)
}

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------

/**
 * Fetches stream diff from the data layer.
 * Returns `null` when the stream is not found.
 *
 * TODO: replace mock with real Horizon / DB calls.
 */
export async function fetchStreamDiff(
  streamId: string
): Promise<ReconciliationDiff | null> {
  if (streamId.startsWith("unknown-")) {
    return null
  }

  return {
    streamId,
    status: "mismatch",
    diffs: [
      {
        field: "balance",
        onChain: "950.00",
        expected: "1000.00",
      },
    ],
    checkedAt: new Date().toISOString(),
  }
}
