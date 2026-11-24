import type { MarketEvent, MarketEventType } from "@/types/market-timeline"
import {
  formatMarketTime,
  formatMarketTimestamp,
  generateMockMarketEvents,
  groupMarketEventsByDate,
} from "@/lib/market-timeline"

const NOW = new Date("2026-04-15T12:00:00.000Z")
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function marketEvent(
  id: string,
  timestamp: Date,
  overrides: Partial<MarketEvent> = {}
): MarketEvent {
  return {
    id,
    eventType: "prediction_placed",
    timestamp,
    title: id,
    ...overrides,
  }
}

describe("generateMockMarketEvents", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("generates every market lifecycle and activity event type", () => {
    const expectedTypes: MarketEventType[] = [
      "market_created",
      "market_opened",
      "liquidity_added",
      "prediction_placed",
      "prediction_placed",
      "odds_updated",
      "prediction_placed",
      "odds_updated",
      "prediction_placed",
      "dispute_filed",
      "dispute_resolved",
      "market_closed",
      "market_resolved",
      "payouts_distributed",
    ]

    const events = generateMockMarketEvents("Test Market")

    expect(events.map((event) => event.eventType)).toEqual(expectedTypes)
    expect(events[0].title).toContain('"Test Market"')
    expect(events.every((event) => event.timestamp instanceof Date)).toBe(true)
    expect(events[0].timestamp.getTime()).toBe(NOW.getTime() - 30 * DAY)
    expect(events[events.length - 1].timestamp.getTime()).toBe(
      NOW.getTime() - 6 * HOUR
    )
  })

  it("uses the default title when none is provided", () => {
    expect(generateMockMarketEvents()[0].title).toContain(
      '"Super Bowl Winner 2025"'
    )
  })
})

describe("formatMarketTimestamp", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("formats recent and future timestamps at the minute boundaries", () => {
    expect(formatMarketTimestamp(NOW)).toBe("Just now")
    expect(formatMarketTimestamp(new Date(NOW.getTime() - MINUTE + 1))).toBe(
      "Just now"
    )
    expect(formatMarketTimestamp(new Date(NOW.getTime() - MINUTE))).toBe(
      "1m ago"
    )
    expect(formatMarketTimestamp(new Date(NOW.getTime() + 1))).toBe("Just now")
  })

  it("formats hour, day, and week boundaries", () => {
    expect(formatMarketTimestamp(new Date(NOW.getTime() - HOUR))).toBe(
      "1h ago"
    )
    expect(formatMarketTimestamp(new Date(NOW.getTime() - DAY))).toBe(
      "Yesterday"
    )
    expect(formatMarketTimestamp(new Date(NOW.getTime() - 2 * DAY))).toBe(
      "2d ago"
    )
    expect(formatMarketTimestamp(new Date(NOW.getTime() - 7 * DAY))).toMatch(
      /^Apr \d{1,2}$/
    )
  })

  it("includes the year for timestamps from a prior year", () => {
    const previousYear = new Date("2025-01-15T12:00:00.000Z")
    expect(formatMarketTimestamp(previousYear)).toMatch(/2025$/)
  })
})

describe("formatMarketTime", () => {
  it("formats a local time with an AM/PM marker without assuming a timezone", () => {
    expect(formatMarketTime(new Date("2026-04-15T12:34:00.000Z"))).toMatch(
      /^\d{1,2}:34 [AP]M$/
    )
  })
})

describe("groupMarketEventsByDate", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("groups each relative date phase and older calendar months in recency order", () => {
    const events = [
      marketEvent("old-jan", new Date("2026-01-15T12:00:00.000Z")),
      marketEvent("month", new Date(NOW.getTime() - 10 * DAY)),
      marketEvent("week", new Date(NOW.getTime() - 3 * DAY)),
      marketEvent("yesterday", new Date(NOW.getTime() - DAY)),
      marketEvent("today", new Date(NOW.getTime() - HOUR)),
      marketEvent("old-mar", new Date("2026-03-06T12:00:00.000Z")),
    ]

    const groups = groupMarketEventsByDate(events)

    expect(groups.map(({ date, label }) => ({ date, label }))).toEqual([
      { date: "today", label: "Today" },
      { date: "yesterday", label: "Yesterday" },
      { date: "this-week", label: "This Week" },
      { date: "this-month", label: "This Month" },
      { date: "March 2026", label: "March 2026" },
      { date: "January 2026", label: "January 2026" },
    ])
    expect(groups.map((group) => group.events[0].id)).toEqual([
      "today",
      "yesterday",
      "week",
      "month",
      "old-mar",
      "old-jan",
    ])
  })

  it("assigns exact relative-day boundaries to the expected phase", () => {
    const groups = groupMarketEventsByDate([
      marketEvent("exact-now", NOW),
      marketEvent("one-ms-before-day", new Date(NOW.getTime() - DAY + 1)),
      marketEvent("exact-day", new Date(NOW.getTime() - DAY)),
      marketEvent("one-ms-after-day", new Date(NOW.getTime() - DAY - 1)),
    ])

    expect(groups.find((group) => group.date === "today")?.events.map((event) => event.id)).toEqual([
      "exact-now",
      "one-ms-before-day",
    ])
    expect(
      groups.find((group) => group.date === "yesterday")?.events.map((event) => event.id)
    ).toEqual(["exact-day", "one-ms-after-day"])
  })

  it("sorts events newest-first, preserves stable order for equal timestamps, and does not mutate input", () => {
    const sameTimestamp = new Date(NOW.getTime() - HOUR)
    const events = [
      marketEvent("older", new Date(NOW.getTime() - 2 * HOUR)),
      marketEvent("same-first", sameTimestamp),
      marketEvent("same-second", sameTimestamp),
    ]
    const originalOrder = [...events]

    const groups = groupMarketEventsByDate(events)

    expect(events).toEqual(originalOrder)
    expect(groups[0].events.map((event) => event.id)).toEqual([
      "same-first",
      "same-second",
      "older",
    ])
  })

  it("returns no groups for an empty list", () => {
    expect(groupMarketEventsByDate([])).toEqual([])
  })
})
