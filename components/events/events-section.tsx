"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { EventsToolbar } from "./events-toolbar"
import { EventsTable } from "./events-table"
import { EventsPagination } from "./pagination"
import { useEventsStore, getEventCounts } from "@/lib/events-store"

interface EventsSectionProps {
  className?: string
}

export function EventsSection({ className }: EventsSectionProps) {
  const { events, filters, setStatus, loadEvents } = useEventsStore()

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-purple-600">Events</h1>

        <Tabs value={filters.status} onValueChange={handleTabChange}>
          <TabsList className="bg-[#F1F5F9] p-1 sm:p-1.5 rounded-full h-auto w-fit overflow-x-auto">
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
                    className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-white text-xs text-[#540D8D] flex items-center justify-center p-0 font-medium"
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

      {/* Tab Content */}
      <Tabs value={filters.status} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="ongoing" className="space-y-6 mt-6">
          <EventsToolbar />
          <EventsTable />
          <EventsPagination />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-6 mt-6">
          <EventsToolbar />
          <EventsTable />
          <EventsPagination />
        </TabsContent>

        <TabsContent value="past" className="space-y-6 mt-6">
          <EventsToolbar />
          <EventsTable />
          <EventsPagination />
        </TabsContent>
      </Tabs>
    </div>
  )
}