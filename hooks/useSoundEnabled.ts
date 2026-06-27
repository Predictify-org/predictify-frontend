"use client"

import { useState, useEffect, useCallback } from "react"
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio/play-sound"

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setEnabled(isSoundEnabled())
    setReady(true)
  }, [])

  const toggle = useCallback((value: boolean) => {
    setEnabled(value)
    setSoundEnabled(value)
  }, [])

  return { soundEnabled: enabled, setSoundEnabled: toggle, ready } as const
}
