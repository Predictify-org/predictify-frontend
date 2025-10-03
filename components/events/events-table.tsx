"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { EventsTableSkeleton } from "./events-table-skeleton"
import { useEventsStore, formatTimeRemaining, getTimeRemainingColor } from "@/lib/events-store"
import type { Event } from "@/types/events"

interface EventsTableProps {
  className?: string
}

// Custom date formatting function to replace date-fns
const formatDate = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

// Category badge colors matching the design
const getCategoryBadgeVariant = (category: Event["category"]) => {
  switch (category) {
    case "Football":
      return "bg-[#EBE7F6] text-[#4400FF] hover:bg-blue-100 border-0"
    case "Politics":
      return "bg-[#E7F6EC] text-[#036B26] hover:bg-green-100 border-0"
    case "Crypto":
      return "bg-[#FBF703] text-[#865503] hover:bg-yellow-100 border-0"
    case "Stocks":
      return "bg-[#03E6FB3B] text-[#035C86] hover:bg-cyan-100 border-0"
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100 border-0"
  }
}

// Time remaining progress bar component
function TimeRemainingProgress({ event }: { event: Event }) {
  const [currentTime, setCurrentTime] = React.useState(Date.now())

  // Update time every second for live countdown
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!event.timeRemainingMs) {
    return <span className="text-muted-foreground">-</span>
  }

  const color = getTimeRemainingColor(event.timeRemainingMs)
  const timeString = formatTimeRemaining(event.timeRemainingMs)

  // Calculate progress percentage (assuming max is 90 days)
  const maxDays = 90
  const currentDays = event.timeRemainingMs / (24 * 60 * 60 * 1000)
  const progressValue = Math.max(0, Math.min(100, (currentDays / maxDays) * 100))

  const progressColorClass = {
    green: "bg-[#16DB30]",
    orange: "bg-[#FFBB00]",
    red: "bg-[#FF5858]",
  }[color]

  const textColorClass = {
    green: "text-[#16DB30]",
    orange: "text-[#FFBB00]",
    red: "text-[#FF5858]",
  }[color]

  return (
    <div className="space-y-2 min-w-[120px]">
      <div className={cn("text-sm font-medium", textColorClass)}>{timeString}</div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-300", progressColorClass)}
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  )
}

export function EventsTable({ className }: EventsTableProps) {
  const { filteredEvents, loading, pagination } = useEventsStore()

  // Calculate paginated events
  const startIndex = (pagination.page - 1) * pagination.pageSize
  const endIndex = startIndex + pagination.pageSize
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

  if (loading) {
    return <EventsTableSkeleton />
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">No events found</p>
          <p className="text-sm">Try adjusting your filters or search terms</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        {/* Responsive table container with horizontal scroll */}
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200 bg-gray-50">
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-left min-w-[200px] sm:min-w-0">
                  Event Title
                </TableHead>
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-left min-w-[100px] sm:min-w-0">
                  Category
                </TableHead>
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-left min-w-[80px] sm:min-w-0">
                  Odds
                </TableHead>
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-left min-w-[180px] sm:min-w-0">
                  End Date
                </TableHead>
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-left min-w-[160px] sm:min-w-0">
                  Time Remaining
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.map((event, index) => (
                <TableRow
                  key={event.id}
                  className={cn(
                    "hover:bg-gray-50/50 transition-colors border-0",
                    index !== paginatedEvents.length - 1 && "border-b border-gray-100",
                  )}
                >
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[200px] sm:min-w-0">
                    <div className="space-y-1">
                      <div className="font-medium text-sm leading-tight text-black">{event.title}</div>
                      <div className="text-xs text-muted-foreground">#{event.txHash}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[100px] sm:min-w-0">
                    <Badge className={cn(getCategoryBadgeVariant(event.category), "text-xs sm:text-sm px-2 py-1")}>
                      {event.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[80px] sm:min-w-0">
                    <div className="font-medium text-sm text-black">{event.odds}</div>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[180px] sm:min-w-0 text-black">
                    <div className="text-xs sm:text-sm leading-tight">
                      <div className="sm:hidden">
                        {/* Mobile: Stack dates vertically */}
                        <div>{formatDate(new Date(event.startDate))}</div>
                        <div>{formatDate(new Date(event.endDate))}</div>
                      </div>
                      <div className="hidden sm:block">
                        {/* Desktop: Show dates inline with dash */}
                        {formatDate(new Date(event.startDate))} - {formatDate(new Date(event.endDate))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[160px] sm:min-w-0">
                    <TimeRemainingProgress event={event} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}