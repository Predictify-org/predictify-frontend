"use client"

import { useCallback, useEffect, useState } from "react"
import changelogEntries from "@/content/changelog.json"

export interface ChangelogEntry {
  id: string
  version: string
  date: string
  title: string
  description: string
  highlights: string[]
  /** Path to a screenshot under /public, e.g. "/changelog/2026-06-20.png" */
  image?: string
  imageAlt?: string
}

const STORAGE_KEYS = {
  lastSeenId: "predictify:whats-new:last-seen-id",
  dontShowAgain: "predictify:whats-new:dont-show-again",
} as const

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Private browsing / disabled storage — treat as "nothing stored"
    return null
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable — the indicator just won't persist across reloads
  }
}

/**
 * Drives the "What's new" drawer's unseen indicator.
 *
 * `entries` defaults to the bundled changelog but can be overridden (used by tests)
 * to exercise the seen/unseen transitions without touching real content.
 */
export function useWhatsNew(entries: ChangelogEntry[] = changelogEntries as ChangelogEntry[]) {
  const latestId = entries[0]?.id
  const [hasUnseen, setHasUnseen] = useState(false)

  useEffect(() => {
    if (!latestId) {
      setHasUnseen(false)
      return
    }
    const dontShowAgain = readStorage(STORAGE_KEYS.dontShowAgain) === "true"
    const lastSeenId = readStorage(STORAGE_KEYS.lastSeenId)
    setHasUnseen(!dontShowAgain && lastSeenId !== latestId)
  }, [latestId])

  const markSeen = useCallback(() => {
    if (!latestId) return
    writeStorage(STORAGE_KEYS.lastSeenId, latestId)
    setHasUnseen(false)
  }, [latestId])

  const dismissForever = useCallback(() => {
    writeStorage(STORAGE_KEYS.dontShowAgain, "true")
    setHasUnseen(false)
  }, [])

  return { entries, hasUnseen, markSeen, dismissForever }
}
