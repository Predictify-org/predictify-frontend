"use client"

import * as React from "react"
import { useGlobalLiveRegion } from "@/hooks/use-global-live-region"
import { LiveRegion } from "@/components/ui/live-region"

export function GlobalLiveRegion() {
  const { announcements } = useGlobalLiveRegion()
  const current = announcements[0]

  return <LiveRegion message={current?.message ?? ""} />
}
