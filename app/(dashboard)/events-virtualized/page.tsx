"use client"

import * as React from "react"
import { VirtualizedEventsList } from "@/components/events/virtualized-events-list"
import { EventsToolbar } from "@/components/events/events-toolbar"
import { useEventsStore } from "@/lib/events-store"

/**
 * Demo page for virtualized events list with infinite scroll
 * 
 * Features:
 * - Virtualized rendering with @tanstack/react-virtual
 * - Infinite scroll with loading indicators
 * - Scroll position preservation on back-navigation
 * - Back-to-top floating action button
 * - Mobile-optimized with overscan: 3
 */
export default function VirtualizedEventsPage() {
  const { loadEvents } = useEventsStore()

  // Load events on mount
  React.useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#540D8D]">
              Virtualized Events (Infinite Scroll)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Demonstrating scroll position preservation and infinite scroll UX
            </p>
          </div>
        </div>

        <EventsToolbar />
      </div>

      <VirtualizedEventsList />

      <div className="text-xs text-muted-foreground space-y-1 p-4 bg-muted/50 rounded-lg">
        <p className="font-semibold">Features Demonstrated:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Virtualized rendering (only visible items rendered)</li>
          <li>Infinite scroll (auto-loads more on scroll near bottom)</li>
          <li>Scroll position preserved on back-navigation</li>
          <li>Loading indicators (initial, loading more, end-of-list)</li>
          <li>Back-to-top FAB (appears after 2 viewport heights)</li>
          <li>Mobile-optimized (overscan: 3 for memory efficiency)</li>
        </ul>
      </div>
    </div>
  )
}
