"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Edit, MoreHorizontal, Trash2, Users, Calendar } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { LoadingMoreIndicator } from "@/components/ui/loading-more-indicator"
import { EndOfList } from "@/components/ui/end-of-list"
import { BackToTopFab } from "@/components/ui/back-to-top-fab"
import { useEventsStore, formatTimeRemaining, getTimeRemainingColor } from "@/lib/events-store"
import { saveScrollPosition, getScrollPosition, clearScrollPosition } from "@/lib/scroll-position-store"
import type { Event } from "@/types/events"

interface VirtualizedEventsListProps {
  className?: string
}

// Custom date formatting function
const formatDate = (date: Date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

// Category badge colors
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

export function VirtualizedEventsList({ className }: VirtualizedEventsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const { 
    filteredEvents, 
    loading, 
    deleteEvent,
    hasNextPage,
    isFetchingNextPage,
    loadNextPage,
    isDataStale,
    loadEvents,
  } = useEventsStore()

  const [deleteTarget, setDeleteTarget] = React.useState<Event | null>(null)
  const parentRef = React.useRef<HTMLDivElement>(null)
  const [hasMounted, setHasMounted] = React.useState(false)

  // Generate route key for scroll position
  const routeKey = React.useMemo(() => {
    const params = searchParams.toString()
    return params ? `${pathname}?${params}` : pathname
  }, [pathname, searchParams])

  // Virtualization setup with fixed item size
  const rowVirtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Fixed row height
    overscan: 3, // Render 3 items above and below viewport
  })

  // Load events on mount if data is stale
  React.useEffect(() => {
    if (isDataStale()) {
      loadEvents()
    }
  }, [isDataStale, loadEvents])

  // Restore scroll position on mount
  React.useLayoutEffect(() => {
    if (!hasMounted) {
      setHasMounted(true)
      const savedPosition = getScrollPosition(routeKey)
      
      if (savedPosition > 0 && parentRef.current) {
        // Restore after render
        requestAnimationFrame(() => {
          if (parentRef.current) {
            parentRef.current.scrollTop = savedPosition
          }
        })
      }
    }
  }, [hasMounted, routeKey])

  // Infinite scroll: detect when near bottom
  React.useEffect(() => {
    const container = parentRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Trigger load when within 200px of bottom
      if (distanceFromBottom < 200 && hasNextPage && !isFetchingNextPage) {
        loadNextPage()
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [hasNextPage, isFetchingNextPage, loadNextPage])

  // Handle item click with scroll position save
  const handleItemClick = (event: Event) => {
    if (parentRef.current) {
      saveScrollPosition(routeKey, parentRef.current.scrollTop)
    }
    router.push(`/events/${event.id}`)
  }

  // Handle back to top
  const handleBackToTop = () => {
    clearScrollPosition(routeKey)
  }

  if (loading && filteredEvents.length === 0) {
    return <EventsTableSkeleton />
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center bg-black text-white justify-center py-16 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white mb-4">
          <Calendar className="h-8 w-8 text-[#540D8D]" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No events found</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          There are no prediction events matching your current filters. Try adjusting your search or filter criteria.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("relative space-y-4", className)}>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event{" "}
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

      <div
        ref={parentRef}
        className="h-[600px] overflow-auto rounded-lg border-b border-[#540D8D] bg-black text-white"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const event = filteredEvents[virtualRow.index]
            
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex items-center gap-4 px-4 md:px-6 py-3 md:py-4 border-b border-[#540D8D] hover:bg-[#540D8D] transition-colors">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleItemClick(event)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="min-w-[200px] space-y-1">
                        <div className="font-medium text-sm leading-tight text-white">{event.title}</div>
                        <div className="text-xs text-muted-foreground">#{event.txHash}</div>
                      </div>
                      
                      <Badge className={cn(getCategoryBadgeVariant(event.category), "text-xs px-2 py-1")}>
                        {event.category}
                      </Badge>
                      
                      <div className="font-medium text-sm text-white min-w-[60px]">{event.odds}</div>
                      
                      <div className="text-xs text-white min-w-[180px]">
                        {formatDate(new Date(event.startDate))} - {formatDate(new Date(event.endDate))}
                      </div>
                      
                      <TimeRemainingProgress event={event} />
                      
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-[100px]">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-foreground">{event.participants.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
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
                </div>
              </div>
            )
          })}
        </div>

        <LoadingMoreIndicator 
          isLoading={isFetchingNextPage} 
          text="Loading more events..."
        />

        <EndOfList 
          show={!hasNextPage && filteredEvents.length > 0 && !isFetchingNextPage}
          text="You've reached the end"
        />
      </div>

      <BackToTopFab 
        scrollContainerRef={parentRef}
        threshold={2}
        onScrollToTop={handleBackToTop}
      />
    </div>
  )
}
