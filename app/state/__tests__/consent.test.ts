/**
 * consent.test.ts
 *
 * Unit tests for the useConsentStore (app/state/consent.ts).
 * Covers: default state, explicit opt-in/opt-out, strict boolean coercion,
 * persistence, and boundary/invalid inputs.
 */

import { act } from "@testing-library/react"
import {
  useConsentStore,
  getAnalyticsConsent,
  parseConsent,
  CONSENT_STORAGE_KEY,
} from "../consent"

/** Reset store to the optimistic default between tests. */
function resetStore() {
  act(() => {
    useConsentStore.setState({ analyticsConsent: false })
  })
}

describe("useConsentStore", () => {
  beforeEach(() => {
    resetStore()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // ── Initial state ──────────────────────────────────────────────────────────

  it("starts with telemetry consent disabled (optimistic default)", () => {
    expect(useConsentStore.getState().analyticsConsent).toBe(false)
    expect(getAnalyticsConsent()).toBe(false)
  })

  // ── setAnalyticsConsent ────────────────────────────────────────────────────

  it("setAnalyticsConsent(true) opt-in is persisted", () => {
    act(() => useConsentStore.getState().setAnalyticsConsent(true))
    expect(useConsentStore.getState().analyticsConsent).toBe(true)
    expect(getAnalyticsConsent()).toBe(true)
  })

  it("setAnalyticsConsent(false) opt-out is respected", () => {
    act(() => useConsentStore.getState().setAnalyticsConsent(true))
    act(() => useConsentStore.getState().setAnalyticsConsent(false))
    expect(useConsentStore.getState().analyticsConsent).toBe(false)
  })

  it("coerces non-boolean opt-in values to false (no telemetry without explicit consent)", () => {
    // @ts-expect-error – intentionally passing invalid runtime input
    act(() => useConsentStore.getState().setAnalyticsConsent("yes"))
    expect(useConsentStore.getState().analyticsConsent).toBe(false)

    // @ts-expect-error – intentionally passing invalid runtime input
    act(() => useConsentStore.getState().setAnalyticsConsent(1))
    expect(useConsentStore.getState().analyticsConsent).toBe(false)

    // @ts-expect-error – intentionally passing invalid runtime input
    act(() => useConsentStore.getState().setAnalyticsConsent(null))
    expect(useConsentStore.getState().analyticsConsent).toBe(false)
  })

  // ── toggleAnalyticsConsent ─────────────────────────────────────────────────

  it("toggleAnalyticsConsent flips state and returns the new value", () => {
    let result1: boolean
    act(() => {
      result1 = useConsentStore.getState().toggleAnalyticsConsent()
    })
    expect(result1!).toBe(true)
    expect(useConsentStore.getState().analyticsConsent).toBe(true)

    let result2: boolean
    act(() => {
      result2 = useConsentStore.getState().toggleAnalyticsConsent()
    })
    expect(result2!).toBe(false)
    expect(useConsentStore.getState().analyticsConsent).toBe(false)
  })

  // ── persistence ────────────────────────────────────────────────────────────

  it("persists opt-in consent to localStorage under the consent key", () => {
    act(() => useConsentStore.getState().setAnalyticsConsent(true))

    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.analyticsConsent).toBe(true)
  })

  it("persists opt-out so telemetry stays disabled across reloads", () => {
    act(() => useConsentStore.getState().setAnalyticsConsent(true))
    act(() => useConsentStore.getState().setAnalyticsConsent(false))

    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    const parsed = JSON.parse(stored!)
    expect(parsed.state.analyticsConsent).toBe(false)
  })

  // ── parseConsent boundary inputs ───────────────────────────────────────────

  it("parseConsent accepts only the literal boolean true", () => {
    expect(parseConsent(true)).toBe(true)
    expect(parseConsent(false)).toBe(false)
  })

  it("parseConsent rejects every coercion-flavoured value", () => {
    expect(parseConsent("true")).toBe(false)
    expect(parseConsent("1")).toBe(false)
    expect(parseConsent(1)).toBe(false)
    expect(parseConsent(0)).toBe(false)
    expect(parseConsent("")).toBe(false)
    expect(parseConsent(null)).toBe(false)
    expect(parseConsent(undefined)).toBe(false)
    expect(parseConsent([])).toBe(false)
    expect(parseConsent({})).toBe(false)
    expect(parseConsent("TRUE")).toBe(false)
    expect(parseConsent(1 as unknown)).toBe(false)
  })
})