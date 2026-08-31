/**
 * telemetry.test.ts
 *
 * Unit tests for lib/telemetry.ts — the consent-gated recommendation
 * telemetry primitive. Covers consent gating, strict input validation,
 * boundary clamping, duplicate suppression, sink failure recovery, and
 * determinism of the emitted event shape.
 */

import { act } from "@testing-library/react"
import { useConsentStore } from "@/app/state/consent"
import {
  trackRecommendation,
  trackRecommendationImpression,
  sanitizeTelemetryEvent,
  setTelemetrySink,
  resetTelemetrySession,
  MAX_MARKET_ID_LENGTH,
  MAX_CATEGORY_LENGTH,
} from "../telemetry"

const sink = jest.fn()

function grantConsent(enabled: boolean) {
  act(() => {
    useConsentStore.setState({ analyticsConsent: enabled })
  })
}

describe("sanitizeTelemetryEvent", () => {
  beforeEach(() => {
    grantConsent(true)
    resetTelemetrySession()
  })

  it("builds a well-formed event for valid input", () => {
    const event = sanitizeTelemetryEvent({
      type: "recommendation_click",
      marketId: "rec-crypto-1",
      category: "crypto",
      position: 2,
    })
    expect(event).not.toBeNull()
    expect(event!.type).toBe("recommendation_click")
    expect(event!.marketId).toBe("rec-crypto-1")
    expect(event!.category).toBe("crypto")
    expect(event!.position).toBe(2)
    expect(typeof event!.timestamp).toBe("number")
    expect(typeof event!.sessionId).toBe("string")
    expect(event!.sessionId.length).toBeGreaterThan(0)
  })

  it("rejects non-object input", () => {
    expect(sanitizeTelemetryEvent(null)).toBeNull()
    expect(sanitizeTelemetryEvent(undefined)).toBeNull()
    expect(sanitizeTelemetryEvent("event")).toBeNull()
    expect(sanitizeTelemetryEvent(42)).toBeNull()
  })

  it("rejects unknown event types", () => {
    expect(
      sanitizeTelemetryEvent({ type: "page_view", marketId: "x" })
    ).toBeNull()
  })

  it("rejects missing, empty, or whitespace-only marketId", () => {
    expect(sanitizeTelemetryEvent({ type: "recommendation_click" })).toBeNull()
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "" })
    ).toBeNull()
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "   " })
    ).toBeNull()
  })

  it("trims and bounds the marketId and category lengths", () => {
    const event = sanitizeTelemetryEvent({
      type: "recommendation_impression",
      marketId: `  ${"a".repeat(MAX_MARKET_ID_LENGTH + 50)}  `,
      category: `  ${"b".repeat(MAX_CATEGORY_LENGTH + 50)}  `,
    })
    expect(event!.marketId).toBe("a".repeat(MAX_MARKET_ID_LENGTH))
    expect(event!.category).toBe("b".repeat(MAX_CATEGORY_LENGTH))
  })

  it("drops the category when it is missing or collapses to empty", () => {
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x" })
        ?.category
    ).toBeUndefined()
    expect(
      sanitizeTelemetryEvent({
        type: "recommendation_click",
        marketId: "x",
        category: "   ",
      })?.category
    ).toBeUndefined()
    expect(
      sanitizeTelemetryEvent({
        type: "recommendation_click",
        marketId: "x",
        category: 7,
      })?.category
    ).toBeUndefined()
  })

  it("clamps position into [0, MAX_POSITION] deterministically", () => {
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x", position: 0 })!
        .position
    ).toBe(0)
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x", position: 3.9 })!
        .position
    ).toBe(3)
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x", position: -5 })!
        .position
    ).toBe(0)
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x", position: 100000 })!
        .position
    ).toBe(999)
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x", position: NaN })!
        .position
    ).toBe(0)
    expect(
      sanitizeTelemetryEvent({ type: "recommendation_click", marketId: "x", position: Infinity })!
        .position
    ).toBe(0)
  })

  it("falls back to the current timestamp for invalid timestamps", () => {
    const before = Date.now()
    const event = sanitizeTelemetryEvent({
      type: "recommendation_click",
      marketId: "x",
      timestamp: -1,
    })
    expect(event!.timestamp).toBeGreaterThanOrEqual(before)
  })
})

describe("trackRecommendation (consent gate)", () => {
  beforeEach(() => {
    sink.mockClear()
    setTelemetrySink(sink)
    resetTelemetrySession()
    grantConsent(false)
  })

  afterEach(() => {
    setTelemetrySink(null)
    grantConsent(false)
  })

  it("emits nothing and returns false when consent is disabled", () => {
    const result = trackRecommendation({
      type: "recommendation_click",
      marketId: "rec-crypto-1",
    })
    expect(result).toBe(false)
    expect(sink).not.toHaveBeenCalled()
  })

  it("emits a valid event and returns true when consent is granted", () => {
    grantConsent(true)
    const result = trackRecommendation({
      type: "recommendation_click",
      marketId: "rec-crypto-1",
      category: "crypto",
      position: 4,
    })
    expect(result).toBe(true)
    expect(sink).toHaveBeenCalledTimes(1)
    const dispatched = sink.mock.calls[0][0]
    expect(dispatched.marketId).toBe("rec-crypto-1")
    expect(dispatched.category).toBe("crypto")
    expect(dispatched.position).toBe(4)
    // No sensitive data is ever forwarded (there is no identity field).
    expect(dispatched).not.toHaveProperty("wallet")
    expect(dispatched).not.toHaveProperty("userId")
    expect(dispatched).not.toHaveProperty("address")
  })

  it("does not dispatch invalid input even when consent is granted", () => {
    grantConsent(true)
    expect(trackRecommendation({ type: "recommendation_click" })).toBe(false)
    expect(trackRecommendation({ type: "recommendation_click", marketId: "" })).toBe(false)
    expect(trackRecommendation("garbage")).toBe(false)
    expect(sink).not.toHaveBeenCalled()
  })

  it("is deterministic for duplicate click input (clicks are not de-duplicated)", () => {
    grantConsent(true)
    const input = { type: "recommendation_click" as const, marketId: "rec-crypto-1" }
    expect(trackRecommendation(input)).toBe(true)
    expect(trackRecommendation(input)).toBe(true)
    expect(sink).toHaveBeenCalledTimes(2)
  })

  it("swallows sink failures so callers are never broken", () => {
    grantConsent(true)
    const error = new Error("sink is down")
    setTelemetrySink(() => {
      throw error
    })
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    let result: boolean
    expect(() => {
      result = trackRecommendation({ type: "recommendation_click", marketId: "x" })
    }).not.toThrow()
    expect(result!).toBe(true)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it("recovers on the next call after a transient sink failure", () => {
    grantConsent(true)
    let shouldThrow = true
    setTelemetrySink(() => {
      if (shouldThrow) throw new Error("boom")
    })
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    const input = { type: "recommendation_click" as const, marketId: "x" }
    expect(trackRecommendation(input)).toBe(true)
    shouldThrow = false
    expect(trackRecommendation(input)).toBe(true)
    spy.mockRestore()
  })
})

describe("trackRecommendationImpression (dedup)", () => {
  beforeEach(() => {
    sink.mockClear()
    setTelemetrySink(sink)
    resetTelemetrySession()
  })

  afterEach(() => {
    setTelemetrySink(null)
    grantConsent(false)
  })

  it("dispatches an impression for each distinct market in the session", () => {
    grantConsent(true)
    expect(
      trackRecommendationImpression({ marketId: "rec-crypto-1", category: "crypto", position: 0 })
    ).toBe(true)
    expect(
      trackRecommendationImpression({ marketId: "rec-football-1", category: "football", position: 1 })
    ).toBe(true)
    expect(sink).toHaveBeenCalledTimes(2)
  })

  it("suppresses a duplicate impression of the same market in the same session", () => {
    grantConsent(true)
    const input = { marketId: "rec-crypto-1", category: "crypto", position: 0 }
    expect(trackRecommendationImpression(input)).toBe(true)
    expect(trackRecommendationImpression(input)).toBe(false)
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it("is suppressed entirely without consent and never reaches the sink", () => {
    grantConsent(false)
    expect(
      trackRecommendationImpression({ marketId: "rec-crypto-1" })
    ).toBe(false)
    expect(sink).not.toHaveBeenCalled()
  })

  it("does not dedup invalid impressions (they are simply rejected)", () => {
    grantConsent(true)
    expect(trackRecommendationImpression({ marketId: "" })).toBe(false)
    expect(trackRecommendationImpression({ marketId: "   " })).toBe(false)
    expect(sink).not.toHaveBeenCalled()
  })

  it("a fresh session re-enables impressions for the same market", () => {
    grantConsent(true)
    const input = { marketId: "rec-crypto-1", category: "crypto", position: 0 }
    expect(trackRecommendationImpression(input)).toBe(true)
    resetTelemetrySession()
    expect(trackRecommendationImpression(input)).toBe(true)
    expect(sink).toHaveBeenCalledTimes(2)
  })

  it("keeps the dedup set size-bounded (oldest evicted past the cap)", () => {
    grantConsent(true)
    const marketIds = Array.from({ length: 300 }, (_, i) => `market-${i}`)
    marketIds.forEach((marketId, i) => {
      trackRecommendationImpression({ marketId, position: i % 6 })
    })
    // Cap is 256 → the first 300-256=44 keys were evicted.
    expect(trackRecommendationImpression({ marketId: "market-0" })).toBe(true)
    expect(trackRecommendationImpression({ marketId: "market-299" })).toBe(false)
  })

  it("does not corrupt the store or sink state after a batch of impressions", () => {
    grantConsent(true)
    for (let i = 0; i < 50; i++) {
      trackRecommendationImpression({ marketId: `m-${i % 5}`, position: i })
    }
    // Only 5 unique markets are seen even after 50 calls.
    expect(sink).toHaveBeenCalledTimes(5)
    expect(useConsentStore.getState().analyticsConsent).toBe(true)
  })
})