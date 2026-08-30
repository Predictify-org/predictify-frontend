"use client"

import { useEffect, useState } from "react"

export type QuietHoursSettings = {
  start: string
  end: string
  tz: "auto" | string
}

export type ToastSeverity = "critical" | "warning" | "info" | "success"

export const QUIET_HOURS_STORAGE_KEY = "predictify_quiet_hours"
export const QUIET_HOURS_EVENT = "predictify:quiet-hours-change"
export const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  start: "22:00",
  end: "08:00",
  tz: "auto",
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function parseClockTime(value: string): number | null {
  const match = TIME_PATTERN.exec(value)
  if (!match) return null

  return Number(match[1]) * 60 + Number(match[2])
}

function readClockMinutes(now: Date, tz: QuietHoursSettings["tz"]): number {
  if (tz === "auto") {
    return now.getHours() * 60 + now.getMinutes()
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    }).formatToParts(now)
    const hour = Number(parts.find((part) => part.type === "hour")?.value)
    const minute = Number(parts.find((part) => part.type === "minute")?.value)

    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return (hour % 24) * 60 + minute
    }
  } catch {
    // Invalid time zones fall back to local time instead of disabling protection.
  }

  return now.getHours() * 60 + now.getMinutes()
}

export function normalizeQuietHoursSettings(value: unknown): QuietHoursSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_QUIET_HOURS
  }

  const candidate = value as Partial<QuietHoursSettings>
  return {
    start: typeof candidate.start === "string" && parseClockTime(candidate.start) !== null ? candidate.start : DEFAULT_QUIET_HOURS.start,
    end: typeof candidate.end === "string" && parseClockTime(candidate.end) !== null ? candidate.end : DEFAULT_QUIET_HOURS.end,
    tz: typeof candidate.tz === "string" && candidate.tz.length > 0 ? candidate.tz : DEFAULT_QUIET_HOURS.tz,
  }
}

export function getQuietHoursSettings(): QuietHoursSettings {
  if (typeof window === "undefined") {
    return DEFAULT_QUIET_HOURS
  }

  try {
    return normalizeQuietHoursSettings(JSON.parse(window.localStorage.getItem(QUIET_HOURS_STORAGE_KEY) ?? "null"))
  } catch {
    return DEFAULT_QUIET_HOURS
  }
}

export function saveQuietHoursSettings(settings: QuietHoursSettings) {
  if (typeof window === "undefined") return

  const normalized = normalizeQuietHoursSettings(settings)
  window.localStorage.setItem(QUIET_HOURS_STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(QUIET_HOURS_EVENT, { detail: normalized }))
}

export function isQuietHoursActive(settings = getQuietHoursSettings(), now = new Date()): boolean {
  const start = parseClockTime(settings.start)
  const end = parseClockTime(settings.end)

  if (start === null || end === null || start === end) {
    return false
  }

  const current = readClockMinutes(now, settings.tz)

  if (start < end) {
    return current >= start && current < end
  }

  return current >= start || current < end
}

export function isCriticalToast(severity?: ToastSeverity, variant?: string | null): boolean {
  return severity === "critical" || severity === "warning" || variant === "destructive"
}

export function shouldShowToastDuringQuietHours(options?: {
  severity?: ToastSeverity
  variant?: string | null
  now?: Date
}) {
  return !isQuietHoursActive(getQuietHoursSettings(), options?.now) || isCriticalToast(options?.severity, options?.variant)
}

export function applyQuietHoursMotionState(active: boolean) {
  if (typeof document === "undefined") return

  document.documentElement.classList.toggle("quiet-hours-active", active)
}

export function useQuietHours() {
  const [settings, setSettings] = useState<QuietHoursSettings>(DEFAULT_QUIET_HOURS)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const sync = () => {
      const next = getQuietHoursSettings()
      setSettings(next)
      setActive(isQuietHoursActive(next))
    }

    sync()
    const interval = window.setInterval(sync, 30_000)
    window.addEventListener("storage", sync)
    window.addEventListener(QUIET_HOURS_EVENT, sync)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("storage", sync)
      window.removeEventListener(QUIET_HOURS_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    applyQuietHoursMotionState(active)
  }, [active])

  return { settings, active, saveSettings: saveQuietHoursSettings }
}
