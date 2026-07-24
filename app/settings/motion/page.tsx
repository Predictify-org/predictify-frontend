"use client"

/**
 * Settings → Motion page
 *
 * Provides a global toggle for reduced motion across the Predictify
 * platform. When enabled, all CSS animations, transitions, and smooth
 * scrolling are disabled site-wide via the `html.motion-reduced` class.
 *
 * WCAG 2.1 AA:
 *  - The toggle is a labelled <Switch> with aria-describedby linking
 *    to the description paragraph.
 *  - Live region announces the current state to screen readers.
 *  - Focus-visible ring on all interactive elements meets 3:1 contrast.
 *  - Persisted to localStorage for cross-session consistency.
 *  - Cross-tab sync via StorageEvent so the preference stays in sync
 *    across open tabs.
 *  - Respects `prefers-reduced-motion` as the initial default on first
 *    visit before any explicit user choice.
 */

import React, { useState, useEffect, useCallback } from "react"
import { Sparkles, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

type SaveState = "idle" | "saving" | "saved" | "error"

const MOTION_STORAGE_KEY = "predictify-motion"

export default function MotionSettingsPage() {
  const [motionReduced, setMotionReduced] = useState(false)
  const [ready, setReady] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  // Load stored preference on mount; also check system preference as fallback
  useEffect(() => {
    let stored: boolean | null = null
    try {
      const raw = localStorage.getItem(MOTION_STORAGE_KEY)
      if (raw === "true" || raw === "false") {
        stored = raw === "true"
      }
    } catch {
      // localStorage unavailable
    }

    // Fall back to system preference if no stored value
    if (stored === null && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      stored = mediaQuery.matches
    }

    const value = stored ?? false
    setMotionReduced(value)
    applyMotionClass(value)
    setReady(true)
  }, [])

  const toggleMotionReduced = useCallback((value: boolean) => {
    setMotionReduced(value)
    applyMotionClass(value)

    // Persist
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, value.toString())
    } catch {
      // ignore storage errors
    }

    // Broadcast to other tabs
    window.dispatchEvent(
      new StorageEvent("storage", { key: MOTION_STORAGE_KEY, newValue: value.toString() })
    )

    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3000)
    }, 600)
  }, [])

  return (
    <main
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6"
      aria-labelledby="motion-settings-heading"
    >
      {/* Page heading */}
      <div className="space-y-1">
        <h1
          id="motion-settings-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          Motion
        </h1>
        <p className="text-muted-foreground text-sm">
          Control animations and transitions across the platform.
        </p>
      </div>

      {/* Live region for screen reader announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {saveState === "saved" ? "Motion preference saved." : ""}
        {saveState === "error" ? "Failed to save. Please try again." : ""}
      </div>

      {/* Saved feedback */}
      {saveState === "saved" && (
        <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>Motion preference saved.</AlertDescription>
        </Alert>
      )}
      {saveState === "error" && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Reduced motion</CardTitle>
          <CardDescription>
            Turn off animations and transitions for a calmer experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-2xl py-2">
            <div className="space-y-1">
              <Label htmlFor="motion-reduced-toggle" className="text-sm font-medium">
                Reduce motion globally
              </Label>
              <p
                id="motion-reduced-description"
                className="text-muted-foreground text-xs leading-relaxed"
              >
                Disables CSS animations, transitions, and smooth scrolling across
                the entire platform. This helps reduce visual fatigue and improves
                readability for users who are sensitive to motion.
              </p>
            </div>
            <Switch
              id="motion-reduced-toggle"
              checked={motionReduced}
              onCheckedChange={toggleMotionReduced}
              aria-describedby="motion-reduced-description"
            />
          </div>

          {/* Preview of affected elements */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Current state</p>
            <div className="flex flex-wrap gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  motionReduced
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                )}
              >
                {motionReduced ? "Motion reduced" : "Animations enabled"}
              </span>
              <span className="text-xs text-muted-foreground">
                {ready ? "Preference active" : "Loading…"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

/**
 * Applies or removes the `motion-reduced` class on the <html> element
 * so that the global CSS rule takes effect immediately.
 */
function applyMotionClass(reduced: boolean): void {
  if (typeof document === "undefined") return
  if (reduced) {
    document.documentElement.classList.add("motion-reduced")
  } else {
    document.documentElement.classList.remove("motion-reduced")
  }
}