"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "predictify-motion"

function getStoredMotionPreference(): boolean {
  if (typeof window === "undefined") return false
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "true" || stored === "false") return stored === "true"
  } catch {
    // localStorage unavailable
  }
  return false
}

function saveMotionPreference(value: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, value.toString())
  } catch {
    // Silently ignore storage errors
  }
}

function applyMotionPreference(value: boolean): void {
  if (typeof document === "undefined") return
  if (value) {
    document.documentElement.classList.add("motion-reduced")
  } else {
    document.documentElement.classList.remove("motion-reduced")
  }
}

export function useMotionPreference() {
  const [motionReduced, setMotionReducedState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = getStoredMotionPreference()
    setMotionReducedState(stored)
    applyMotionPreference(stored)
    setReady(true)
  }, [])

  const setMotionReduced = useCallback((value: boolean) => {
    setMotionReducedState(value)
    saveMotionPreference(value)
    applyMotionPreference(value)
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY, newValue: value.toString() })
    )
  }, [])

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const value = e.newValue === "true"
        setMotionReducedState(value)
        applyMotionPreference(value)
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])

  return {
    motionReduced,
    setMotionReduced,
    ready,
  } as const
}