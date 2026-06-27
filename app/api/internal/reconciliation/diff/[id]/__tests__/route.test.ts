/**
 * Tests for /api/internal/reconciliation/diff/[id]
 *
 * Tests the exported pure functions (isValidStreamId, fetchStreamDiff) directly
 * to stay within jsdom without needing the Web Fetch API.
 *
 * Covers:
 * - ID validation: valid and invalid formats
 * - Data layer: known stream returns diff, unknown returns null
 * - Response shape / type contract
 */

import {
  isValidStreamId,
  fetchStreamDiff,
  type ReconciliationDiff,
  type StreamField,
} from "../handler"

// ---------------------------------------------------------------------------
// isValidStreamId
// ---------------------------------------------------------------------------

describe("isValidStreamId", () => {
  it("accepts alphanumeric ids", () => {
    expect(isValidStreamId("stream123")).toBe(true)
  })

  it("accepts hyphens", () => {
    expect(isValidStreamId("stream-abc-01")).toBe(true)
  })

  it("accepts underscores", () => {
    expect(isValidStreamId("stream_01_ABC")).toBe(true)
  })

  it("accepts max-length id (128 chars)", () => {
    expect(isValidStreamId("a".repeat(128))).toBe(true)
  })

  it("rejects empty string", () => {
    expect(isValidStreamId("")).toBe(false)
  })

  it("rejects id exceeding 128 chars", () => {
    expect(isValidStreamId("a".repeat(129))).toBe(false)
  })

  it("rejects spaces", () => {
    expect(isValidStreamId("stream id")).toBe(false)
  })

  it("rejects slashes", () => {
    expect(isValidStreamId("bad/slash")).toBe(false)
  })

  it("rejects path traversal", () => {
    expect(isValidStreamId("../traversal")).toBe(false)
  })

  it("rejects XSS attempt", () => {
    expect(isValidStreamId("<script>alert</script>")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// fetchStreamDiff
// ---------------------------------------------------------------------------

describe("fetchStreamDiff", () => {
  describe("known stream", () => {
    let result: ReconciliationDiff | null

    beforeEach(async () => {
      result = await fetchStreamDiff("stream-abc")
    })

    it("returns a non-null result", () => {
      expect(result).not.toBeNull()
    })

    it("echoes the streamId", () => {
      expect(result!.streamId).toBe("stream-abc")
    })

    it("status is one of match|mismatch|missing", () => {
      expect(["match", "mismatch", "missing"]).toContain(result!.status)
    })

    it("diffs is an array", () => {
      expect(Array.isArray(result!.diffs)).toBe(true)
    })

    it("each diff entry has field, onChain, expected", () => {
      for (const entry of result!.diffs as StreamField[]) {
        expect(typeof entry.field).toBe("string")
        expect("onChain" in entry).toBe(true)
        expect("expected" in entry).toBe(true)
      }
    })

    it("checkedAt is a valid ISO 8601 date", () => {
      const { checkedAt } = result!
      expect(new Date(checkedAt).toISOString()).toBe(checkedAt)
    })
  })

  describe("unknown stream (unknown- prefix)", () => {
    it("returns null for unknown-xyz", async () => {
      const result = await fetchStreamDiff("unknown-xyz")
      expect(result).toBeNull()
    })

    it("returns null for unknown-12345", async () => {
      const result = await fetchStreamDiff("unknown-12345")
      expect(result).toBeNull()
    })
  })

  describe("edge cases", () => {
    it("works for a single-char id", async () => {
      const result = await fetchStreamDiff("a")
      expect(result).not.toBeNull()
      expect(result!.streamId).toBe("a")
    })

    it("works for a max-length id", async () => {
      const id = "b".repeat(128)
      const result = await fetchStreamDiff(id)
      expect(result).not.toBeNull()
      expect(result!.streamId).toBe(id)
    })
  })
})
