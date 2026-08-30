import {
  DEFAULT_QUIET_HOURS,
  isCriticalToast,
  isQuietHoursActive,
  normalizeQuietHoursSettings,
} from "@/lib/quiet-hours"

describe("quiet hours", () => {
  it("treats the default overnight window as active after the start boundary", () => {
    const now = new Date(2026, 0, 1, 22, 0)

    expect(isQuietHoursActive(DEFAULT_QUIET_HOURS, now)).toBe(true)
  })

  it("keeps an overnight window active before the end boundary", () => {
    const now = new Date(2026, 0, 2, 7, 59)

    expect(isQuietHoursActive(DEFAULT_QUIET_HOURS, now)).toBe(true)
  })

  it("ends an overnight window at the end boundary", () => {
    const now = new Date(2026, 0, 2, 8, 0)

    expect(isQuietHoursActive(DEFAULT_QUIET_HOURS, now)).toBe(false)
  })

  it("supports same-day quiet hour windows", () => {
    const settings = { start: "09:00", end: "17:00", tz: "auto" }

    expect(isQuietHoursActive(settings, new Date(2026, 0, 1, 12, 0))).toBe(true)
    expect(isQuietHoursActive(settings, new Date(2026, 0, 1, 18, 0))).toBe(false)
  })

  it("falls back to safe defaults for malformed stored values", () => {
    expect(normalizeQuietHoursSettings({ start: "99:99", end: "bad", tz: "" })).toEqual(DEFAULT_QUIET_HOURS)
  })

  it("keeps critical and actionable warning toasts visible", () => {
    expect(isCriticalToast("critical")).toBe(true)
    expect(isCriticalToast("warning")).toBe(true)
    expect(isCriticalToast(undefined, "destructive")).toBe(true)
    expect(isCriticalToast("info")).toBe(false)
  })

  it("uses IANA time zones so DST and timezone changes are delegated to Intl", () => {
    const settings = { start: "01:30", end: "03:30", tz: "America/New_York" }
    const duringSpringForward = new Date("2026-03-08T07:00:00.000Z")

    expect(isQuietHoursActive(settings, duringSpringForward)).toBe(true)
  })
})
