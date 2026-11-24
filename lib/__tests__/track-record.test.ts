import {
  computeTrackRecord,
  isValidStellarAddress,
  type PredictionRecord,
} from "@/lib/track-record"

const address = `G${"A".repeat(55)}`

function record(
  id: string,
  status: PredictionRecord["status"],
  resolvedAt: string | null,
  category = "Crypto",
): PredictionRecord {
  return { id, status, resolvedAt, category }
}

describe("isValidStellarAddress", () => {
  it("accepts a G address with optional lowercase and surrounding whitespace", () => {
    expect(isValidStellarAddress(address)).toBe(true)
    expect(isValidStellarAddress(` ${address.toLowerCase()} `)).toBe(true)
  })

  it("rejects malformed or non-public-key addresses", () => {
    expect(isValidStellarAddress("")).toBe(false)
    expect(isValidStellarAddress(`S${"A".repeat(55)}`)).toBe(false)
    expect(isValidStellarAddress(`G${"A".repeat(54)}`)).toBe(false)
    expect(isValidStellarAddress(`G${"0".repeat(55)}`)).toBe(false)
  })
})

describe("computeTrackRecord", () => {
  it("excludes open and void records and computes deterministic category and streak stats", () => {
    const records = [
      record("a", "won", "2026-01-01T00:00:00.000Z"),
      record("b", "won", "2026-01-02T00:00:00.000Z"),
      record("c", "lost", "2026-01-03T00:00:00.000Z"),
      record("d", "won", "2026-01-04T00:00:00.000Z", "Football"),
      record("e", "won", "2026-01-05T00:00:00.000Z", "Football"),
      record("f", "won", "2026-01-06T00:00:00.000Z", "Football"),
      record("open", "open", null),
      record("void", "void", null),
    ]

    expect(computeTrackRecord(records)).toMatchObject({
      total: 6,
      wins: 5,
      accuracy: 5 / 6,
      currentStreak: 3,
      longestStreak: 3,
      byCategory: [
        { category: "Crypto", total: 3, wins: 2, accuracy: 2 / 3 },
        { category: "Football", total: 3, wins: 3, accuracy: 1 },
      ],
      badges: [],
    })
  })

  it("orders tied resolution times by id and handles a single prediction", () => {
    const result = computeTrackRecord([
      record("b", "lost", "2026-01-01T00:00:00.000Z"),
      record("a", "won", "2026-01-01T00:00:00.000Z"),
    ])

    expect(result).toMatchObject({
      total: 2,
      wins: 1,
      currentStreak: 0,
      longestStreak: 1,
    })
    expect(
      computeTrackRecord([
        record("single", "won", "2026-01-01T00:00:00.000Z"),
      ]),
    ).toMatchObject({
      total: 1,
      wins: 1,
      accuracy: 1,
      currentStreak: 1,
      longestStreak: 1,
    })
  })

  it("returns no wins or streak for all-loss records and preserves an earlier longest streak", () => {
    const allLosses = computeTrackRecord([
      record("a", "lost", "2026-01-01T00:00:00.000Z"),
      record("b", "lost", "2026-01-02T00:00:00.000Z"),
    ])
    expect(allLosses).toMatchObject({
      total: 2,
      wins: 0,
      accuracy: 0,
      currentStreak: 0,
      longestStreak: 0,
    })

    const streaks = computeTrackRecord([
      record("a", "won", "2026-01-01T00:00:00.000Z"),
      record("b", "won", "2026-01-02T00:00:00.000Z"),
      record("c", "won", "2026-01-03T00:00:00.000Z"),
      record("d", "lost", "2026-01-04T00:00:00.000Z"),
      record("e", "won", "2026-01-05T00:00:00.000Z"),
    ])
    expect(streaks).toMatchObject({ currentStreak: 1, longestStreak: 3 })
  })

  it("awards badges only after each explicit threshold is met", () => {
    const records = Array.from({ length: 20 }, (_, index) =>
      record(
        `record-${String(index).padStart(2, "0")}`,
        index < 16 ? "won" : "lost",
        new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      ),
    )

    expect(computeTrackRecord(records).badges.map(({ id }) => id)).toEqual([
      "ten-predictions",
      "five-win-streak",
      "seventy-percent-accuracy",
    ])
    expect(
      computeTrackRecord(records.slice(0, 9)).badges,
    ).toHaveLength(1)
  })
})
