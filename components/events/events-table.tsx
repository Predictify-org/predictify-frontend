"use client"

import * as React from "react"
import Link from "next/link"
/* NEW: Added lucide icons for row actions and compare */
import { Edit, MoreHorizontal, Trash2, Users, Calendar, Trophy, Building2, CircleDollarSign, LineChart, TrendingUp, GitCompareArrows, ShieldCheck, Clock, AlertTriangle } from "lucide-react"
import { HoverTooltip } from "@/components/HoverTooltip"
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
import { NoMatchEmptyState } from "./NoMatchEmptyState"
/* NEW: GrantFox FWC26 / Stellar Wave themed empty state for the "no events at
 * all" scenario (distinct from NoMatchEmptyState which handles active-filter
 * zero-result cases). */
import { EventsEmptyState } from "./EventsEmptyState"
import { useEventsStore, formatTimeRemaining, getTimeRemainingColor } from "@/lib/events-store"
import { useCompareStore, MAX_COMPARE } from "@/lib/compare-store"
import { Checkbox } from "@/components/ui/checkbox"
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

// Icon per category so status is not conveyed by color alone
const getCategoryIcon = (category: Event["category"]) => {
  switch (category) {
    case "Football": return <Trophy className="h-3 w-3 shrink-0" aria-hidden="true" />
    case "Politics": return <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
    case "Crypto": return <CircleDollarSign className="h-3 w-3 shrink-0" aria-hidden="true" />
    case "Stocks": return <LineChart className="h-3 w-3 shrink-0" aria-hidden="true" />
    default: return <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
  }
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

  if (typeof event.timeRemainingMs !== "number" || !Number.isFinite(event.timeRemainingMs)) {
    return <span className="text-muted-foreground">-</span>
  }

  if (event.timeRemainingMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-body-sm font-medium text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        Ended
      </span>
    )
  }

  const color = getTimeRemainingColor(event.timeRemainingMs)
  const timeString = formatTimeRemaining(event.timeRemainingMs)

  // Calculate progress percentage (assuming max is 90 days)
  const maxDays = 90
  const currentDays = event.timeRemainingMs / (24 * 60 * 60 * 1000)
  const progressValue = Math.max(0, Math.min(100, (currentDays / maxDays) * 100))

  const urgencyLabels: Record<string, string> = {
    green: "Low urgency",
    orange: "Medium urgency",
    red: "High urgency",
  }
  const urgencyLabel = urgencyLabels[color] ?? "Unknown urgency"
  const urgencyIcons: Record<string, React.ReactNode> = {
    green: <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    orange: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    red: <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  }

  const progressColorClasses: Record<string, string> = {
    green: "bg-[#16DB30]",
    orange: "bg-[#FFBB00]",
    red: "bg-[#FF5858]",
  }
  const progressColorClass = progressColorClasses[color] ?? "bg-gray-200"

  const textColorClasses: Record<string, string> = {
    green: "text-[#16DB30]",
    orange: "text-[#FFBB00]",
    red: "text-[#FF5858]",
  }
  const textColorClass = textColorClasses[color] ?? "text-muted-foreground"

  const progressValueRounded = Math.round(progressValue)

  return (
    <div className="space-y-2 min-w-[120px]">
      <div className={cn("text-body-sm font-medium", textColorClass)}>
        {timeString}
        {/* Visible urgency icon and text keep status independent of color. */}
        <span className="ml-1 inline-flex items-center gap-1 text-muted-foreground">
          {urgencyIcons[color]}
          <span>{urgencyLabel}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progressValueRounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Time remaining: ${timeString} (${urgencyLabel})`}
        aria-valuetext={`${timeString} (${urgencyLabel})`}
        className="w-full bg-gray-200 rounded-full h-2"
      >
        <div
          className={cn("h-2 rounded-full transition-all duration-300", progressColorClass)}
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  )
}

/** Sub-component so useEffect is called at the top level of a component, not inside a map. */
interface EventRowProps {
  event: Event
  index: number
  isLast: boolean
  animationReady: boolean
  prefersReduced: boolean
  seenIds: React.MutableRefObject<Set<string>>
  selectedIds: string[]
  toggle: (id: string) => void
  setDeleteTarget: (event: Event) => void
}

function EventRow({
  event,
  index,
  isLast,
  animationReady,
  prefersReduced,
  seenIds,
  selectedIds,
  toggle,
  setDeleteTarget,
}: EventRowProps) {
  // Mark row as seen after initial render (valid hook placement inside a component)
  React.useEffect(() => {
    seenIds.current.add(event.id)
  }, [event.id, seenIds])

  const isSeen = seenIds.current.has(event.id)

  return (
    <TableRow
      className={cn(
        "relative grid grid-cols-2 gap-x-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-muted/50 xl:table-row xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none",
        !isLast && "xl:border-b xl:border-border",
        animationReady && !prefersReduced && !isSeen && index < 12 && "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={
        animationReady && !prefersReduced && !isSeen && index < 12
          ? { transitionDelay: `${index * 30}ms`, animationFillMode: "both" }
          : undefined
      }
    >
      {/* Compare checkbox */}
      <TableCell className="absolute left-4 top-5 w-10 p-0 xl:static xl:table-cell xl:px-6 xl:py-4">
        <Checkbox
          checked={selectedIds.includes(event.id)}
          onCheckedChange={() => toggle(event.id)}
          disabled={!selectedIds.includes(event.id) && selectedIds.length >= MAX_COMPARE}
          aria-label={`Select ${event.title} for comparison`}
          className="border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
        />
      </TableCell>

      {/* Event title cell with hover-delayed tooltip showing key data */}
      <TableCell className="col-span-2 block min-w-0 border-b border-border pb-3 pl-9 pr-0 pt-0 xl:table-cell xl:min-w-[200px] xl:border-0 xl:px-6 xl:py-4">
        <HoverTooltip
          content={
            <div className="space-y-1.5 p-1 text-left">
              <p className="font-bold text-xs uppercase tracking-wider text-purple-300">Event Details</p>
              <div className="text-xs space-y-1 text-white/90">
                <div><span className="text-white/50">Category:</span> {event.category}</div>
                <div><span className="text-white/50">Odds:</span> <span className="tabular-nums">{event.odds}</span></div>
                <div><span className="text-white/50">Participants:</span> <span className="tabular-nums">{event.participants.toLocaleString()}</span></div>
                <div><span className="text-white/50">Ends:</span> {formatDate(new Date(event.endDate))}</div>
              </div>
            </div>
          }
        >
          <div className="space-y-1 cursor-help">
            <div className="text-label leading-tight text-white">{event.title}</div>
            <div className="text-caption text-muted-foreground">#{event.txHash}</div>
          </div>
        </HoverTooltip>
      </TableCell>

      <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[100px] sm:min-w-0">
        <Badge className={cn(getCategoryBadgeVariant(event.category), "inline-flex items-center gap-1 text-caption sm:text-body-sm px-2 py-1")}>
          {getCategoryIcon(event.category)}
          {event.category}
        </Badge>
      </TableCell>

      <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[80px] sm:min-w-0">
        <div className="text-label text-white tabular-nums">{event.odds}</div>
      </TableCell>

      <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[180px] sm:min-w-0 text-white">
        <div className="text-caption sm:text-body-sm leading-tight">
          <div className="sm:hidden">
            <div>{formatDate(new Date(event.startDate))}</div>
            <div>{formatDate(new Date(event.endDate))}</div>
          </div>
          <div className="hidden xl:block">
            {formatDate(new Date(event.startDate))} - {formatDate(new Date(event.endDate))}
          </div>
        </div>
      </TableCell>

      <TableCell className="col-span-2 block min-w-0 px-0 pb-0 pt-3 xl:table-cell xl:min-w-[160px] xl:px-6 xl:py-4">
        <span className="mb-1 block text-xs font-medium text-muted-foreground xl:hidden">Time remaining</span>
        <TimeRemainingProgress event={event} />
      </TableCell>

      {/* Participants */}
      <TableCell className="py-3 md:py-4 px-4 md:px-6 min-w-[120px] sm:min-w-0">
        <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span className="text-label text-foreground tabular-nums">{event.participants.toLocaleString()}</span>
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="block min-w-0 px-0 pb-0 pt-3 text-right xl:table-cell xl:min-w-[80px] xl:px-6 xl:py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Open actions menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/events/${event.id}/edit`} className="flex items-center gap-2">
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit Event
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
              onSelect={() => setDeleteTarget(event)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function EventsTable({ className }: EventsTableProps) {
  /* MODIFIED: Added deleteEvent from store */
  const {
    filteredEvents,
    loading,
    lastFetchTime,
    pagination,
    deleteEvent,
    filters,
    setFilters,
    setSearch,
  } = useEventsStore()
  /* Compare store */
  const { selectedIds, toggle } = useCompareStore()

  /* NEW: State to track which event is pending delete confirmation */
  const [deleteTarget, setDeleteTarget] = React.useState<Event | null>(null)

  // Track rows that have already animated in
  const seenIds = React.useRef(new Set<string>())
  const [animationReady, setAnimationReady] = React.useState(false)
  const prefersReduced = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false

  React.useEffect(() => {
    setAnimationReady(true)
  }, [])

  // Calculate paginated events
  const startIndex = (pagination.page - 1) * pagination.pageSize
  const endIndex = startIndex + pagination.pageSize
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

  // During a retry, preserve the last good page instead of replacing it with a
  // skeleton. This avoids losing the user's position while live data is stale.
  if (loading && (filteredEvents.length === 0 || lastFetchTime === null)) {
    return <EventsTableSkeleton />
  }

  /*
   * MODIFIED: Split empty-state handling into two branches:
   *
   * 1. "True empty" — no events exist for the current status tab and no
   *    filters are active.  Render the GrantFox FWC26 / Stellar Wave branded
   *    EventsEmptyState with a "Create Your First Event" CTA.
   *
   * 2. "Filtered empty" — the user has active search/category/date filters
   *    that produced zero results.  Render NoMatchEmptyState (existing) so the
   *    user knows to adjust or clear their filters.
   *
   * The distinction matters: in case 1 we want to drive the user toward
   * creating content; in case 2 we want to help them find existing content.
   */
  if (filteredEvents.length === 0) {
    /** True when the user has at least one active filter in play */
    const hasActiveFilters =
      !!filters.search ||
      filters.category.length > 0 ||
      !!(filters.dateRange.from || filters.dateRange.to)

    if (!hasActiveFilters) {
      // No events and no filters → show the campaign-branded empty state
      return <EventsEmptyState />
    }

    // Filters are active but matched nothing → help the user clear them
    const handleClearFilters = () => {
      setSearch("")
      setFilters({
        category: [],
        oddsRange: [0, 10],
        dateRange: { from: null, to: null },
      })
    }

    return (
      <NoMatchEmptyState
        hasSearch={!!filters.search}
        hasCategories={filters.category.length > 0}
        hasDateRange={!!(filters.dateRange.from || filters.dateRange.to)}
        onClearFilters={handleClearFilters}
      />
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

      <div
        className="rounded-lg bg-background text-foreground xl:overflow-hidden xl:border xl:border-border"
        data-testid="events-responsive-layout"
      >
        {/* Rows become readable cards below lg without duplicating accessible content. */}
        <div className="overflow-visible xl:overflow-x-auto">
          <Table aria-label="Events" className="block w-full xl:table xl:min-w-[980px]">
            <TableHeader className="sr-only xl:not-sr-only xl:table-header-group">
              <TableRow className="border-b border-border bg-muted text-foreground hover:bg-muted">
                {/* Compare select column */}
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 w-10">
                  <span className="sr-only">Compare</span>
                </TableHead>
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-left min-w-[200px] sm:min-w-0">
                  Event Title
                </TableHead>
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-left min-w-[100px] sm:min-w-0">
                  Category
                </TableHead>
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-left min-w-[80px] sm:min-w-0">
                  Odds
                </TableHead>
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-left min-w-[180px] sm:min-w-0">
                  End Date
                </TableHead>
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-left min-w-[160px] sm:min-w-0">
                  Time Remaining
                </TableHead>
                {/* NEW: Participants column header */}
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-left min-w-[120px] sm:min-w-0">
                  Participants
                </TableHead>
                {/* NEW: Actions column header */}
                <TableHead scope="col" className="text-label text-muted-foreground py-3 md:py-4 px-4 md:px-6 text-right min-w-[80px] sm:min-w-0">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:table-row-group">
              {paginatedEvents.map((event, index) => (
                <EventRow
                  key={event.id}
                  event={event}
                  index={index}
                  isLast={index === paginatedEvents.length - 1}
                  animationReady={animationReady}
                  prefersReduced={prefersReduced}
                  seenIds={seenIds}
                  selectedIds={selectedIds}
                  toggle={toggle}
                  setDeleteTarget={setDeleteTarget}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
