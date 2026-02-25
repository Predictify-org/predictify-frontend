"use client"

import * as React from "react"
import Link from "next/link"
/* NEW: Added lucide icons for row actions */
import { Edit, MoreHorizontal, Trash2, Users, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
/* NEW: Added Button for action triggers */
import { Button } from "@/components/ui/button"
/* NEW: Added DropdownMenu for row action menus */
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
/* NEW: Added AlertDialog for delete confirmation */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  /* MODIFIED: Added deleteEvent from store */
  const { filteredEvents, loading, pagination, deleteEvent } = useEventsStore()

  /* NEW: State to track which event is pending delete confirmation */
  const [deleteTarget, setDeleteTarget] = React.useState<Event | null>(null)

  // Calculate paginated events
  const startIndex = (pagination.page - 1) * pagination.pageSize
  const endIndex = startIndex + pagination.pageSize
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

  if (loading) {
    return <EventsTableSkeleton />
  }

  {/* NEW: Enhanced empty state with icon illustration and contextual messaging */}
  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center bg-black text-white justify-center py-16 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white mb-4">
          <Calendar className="h-8 w-8 text-[#540D8D]" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No events found</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {"There are no prediction events matching your current filters. Try adjusting your search or filter criteria."}
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* NEW: Delete confirmation AlertDialog triggered by row action */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {"This action cannot be undone. This will permanently delete the event "}
              <span className="font-semibold text-foreground">{deleteTarget?.title}</span>
              {" and remove all associated predictions and participant data."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              onClick={() => {
                if (deleteTarget) {
                  deleteEvent(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-lg border-b border-[#540D8D] overflow-hidden bg-black text-white">
        {/* Responsive table container with horizontal scroll */}
        <div className="overflow-x-auto">
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow className="hover:bg-[#540D8D] text-white border-b border-[#540D8D]/50 bg-black">
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
                {/* NEW: Participants column header */}
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-left min-w-[120px] sm:min-w-0">
                  Participants
                </TableHead>
                {/* NEW: Actions column header */}
                <TableHead className="text-muted-foreground font-medium py-3 md:py-4 px-4 md:px-6 text-right min-w-[80px] sm:min-w-0">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.map((event, index) => (
                <TableRow
                  key={event.id}
                  className={cn(
                    "hover:bg-[#540D8D] transition-colors border-0",
                    index !== paginatedEvents.length - 1 && "border-b border-[#540D8D]",
                  )}
                >
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[200px] sm:min-w-0">
                    <div className="space-y-1">
                      <div className="font-medium text-sm leading-tight text-White">{event.title}</div>
                      <div className="text-xs text-muted-foreground">#{event.txHash}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[100px] sm:min-w-0">
                    <Badge className={cn(getCategoryBadgeVariant(event.category), "text-xs sm:text-sm px-2 py-1")}>
                      {event.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[80px] sm:min-w-0">
                    <div className="font-medium text-sm text-white">{event.odds}</div>
                  </TableCell>
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[180px] sm:min-w-0 text-white">
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
                  {/* NEW: Participants cell showing formatted participant count */}
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[120px] sm:min-w-0">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="font-medium text-foreground">{event.participants.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  {/* NEW: Actions cell with dropdown menu for Edit/Delete */}
                  <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[80px] sm:min-w-0 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open actions menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.id}/edit`} className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Edit Event
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                          onSelect={() => setDeleteTarget(event)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Event
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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