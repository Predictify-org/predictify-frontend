"use client"

import * as React from "react"
/* NEW: Added Link for navigation to create event page */
import Link from "next/link"
/* NEW: Added Plus icon for create event button */
import { AlertTriangle, Plus, LayoutGrid, Table2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
/* NEW: Added Button for the Create Event primary action */
import { Button } from "@/components/ui/button"
import { EventsToolbar } from "./events-toolbar"
import { EventsTable } from "./events-table"
import { EventsGrid } from "./events-grid"
import { EventsPagination } from "./pagination"
import { useEventsStore, getEventCounts } from "@/lib/events-store"
/* Compare feature */
import { CompareMarketsModal } from "@/app/components/CompareMarketsModal"
import { CompareSelectionChip } from "@/components/market/CompareSelectionChip"

interface EventsSectionProps {
  className?: string
}

export function EventsSection({ className }: EventsSectionProps) {
  const {
    events,
    filteredEvents,
    filters,
    setStatus,
    loadEvents,
    retryLoadEvents,
    error,
    canRetry,
  } = useEventsStore()
  const [viewMode, setViewMode] = React.useState<"table" | "grid">("table")

  // Get event counts for each tab
  const eventCounts = React.useMemo(() => getEventCounts(events), [events])

  // Load events on mount
  React.useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setStatus(value as "ongoing" | "upcoming" | "past")
  }

  return (
    <div className={cn("w-full max-w-7xl mx-auto p-4 space-y-6", className)}>
      {/* Compare overlay dialog (portal-rendered) */}
      <CompareMarketsModal />
      {/* Floating selection chip */}
      <CompareSelectionChip />
      {/* MODIFIED: Added Create Event button alongside the title */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-[#540D8D]">Events</h1>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="flex items-center border border-[#540D8D]/30 rounded-lg overflow-hidden" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-3 py-2 text-sm transition-colors",
                  viewMode === "table"
                    ? "bg-[#540D8D] text-white"
                    : "text-[#540D8D] hover:bg-[#540D8D]/10",
                )}
                aria-pressed={viewMode === "table"}
                aria-label="Table view"
              >
                <Table2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-2 text-sm transition-colors",
                  viewMode === "grid"
                    ? "bg-[#540D8D] text-white"
                    : "text-[#540D8D] hover:bg-[#540D8D]/10",
                )}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {/* NEW: Primary "Create Event" button linking to the new event form */}
            <Button asChild className="bg-[#540D8D] hover:bg-[#6B1DAB] text-white w-full sm:w-auto">
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
          </div>
        </div>

        <Tabs value={filters.status} onValueChange={handleTabChange}>
          <TabsList className="bg-black text-white p-1 sm:p-1.5 rounded-full h-auto w-fit overflow-x-auto">
            <div className="flex">
              <TabsTrigger
                value="ongoing"
                className="relative rounded-full px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-[#540D8D] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-200 data-[state=active]:hover:bg-purple-700 whitespace-nowrap text-[#475569]"
              >
                <span className="hidden sm:inline">Ongoing Events</span>
                <span className="sm:hidden">Ongoing</span>
                {eventCounts.ongoing > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-black text-xs text-white flex items-center justify-center p-0 font-medium"
                  >
                    {eventCounts.ongoing}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="rounded-full px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-[#540D8D] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-200 data-[state=active]:hover:bg-purple-700 whitespace-nowrap text-[#475569]"
              >
                <span className="hidden sm:inline">Upcoming Events</span>
                <span className="sm:hidden">Upcoming</span>
              </TabsTrigger>
              <TabsTrigger
                value="past"
                className="rounded-full px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-[#540D8D] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-gray-200 data-[state=active]:hover:bg-purple-700 whitespace-nowrap text-[#475569]"
              >
                <span className="hidden sm:inline">Past Events</span>
                <span className="sm:hidden">Past</span>
              </TabsTrigger>
            </div>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              {error}
              {filteredEvents.length > 0 && (
                <span className="ml-1 text-muted-foreground">
                  Your current page has been kept in place.
                </span>
              )}
            </p>
          </div>
          {canRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void retryLoadEvents()}
              className="shrink-0"
            >
              Try again
            </Button>
          )}
        </div>
      )}

      {/* Tab Content */}
      <Tabs value={filters.status} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="ongoing" className="space-y-6 mt-6">
          <EventsToolbar />
          {viewMode === "table" ? <EventsTable /> : <EventsGrid />}
          {viewMode === "table" && <EventsPagination />}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6 mt-6">
          <EventsToolbar />
          {viewMode === "table" ? <EventsTable /> : <EventsGrid />}
          {viewMode === "table" && <EventsPagination />}
        </TabsContent>

        <TabsContent value="past" className="space-y-6 mt-6">
          <EventsToolbar />
          {viewMode === "table" ? <EventsTable /> : <EventsGrid />}
          {viewMode === "table" && <EventsPagination />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
