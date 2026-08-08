"use client"

/**
 * EventsGrid — responsive card-grid view for prediction events.
 *
 * Displays events as styled cards in a responsive grid layout (1 col mobile,
 * 2 col tablet, 3 col desktop). Integrates with the Zustand events store and
 * handles all states:
 *   - **Loading**: Renders <EventsGridSkeleton /> while data loads
 *   - **Empty**: Shows contextual empty state with clear-filters action
 *   - **Error**: Renders a simple error state with retry
 *   - **Data**: Renders event cards with category badges, odds, time remaining
 *     progress bars, participants count, and action menus
 *
 * Theming uses the GrantFox FWC26 campaign palette:
 *   - Dark card background (`bg-[#0A0A1A]`) with purple borders (`border-[#540D8D]/20`)
 *   - Glass-morphism hover state (`hover:bg-[#540D8D]/5`)
 *   - Category badges matching the existing design system
 *
 * Accessibility:
 *   - Cards are keyboard-focusable `<article>` elements with `aria-labelledby`
 *   - Progress bars use `role="progressbar"` with `aria-valuenow/min/max`
 *   - Action menus use standard ARIA menu patterns
 *   - Reduced motion respected for entry animations
 */

import * as React from "react"
import Link from "next/link"
import {
  Edit,
  MoreHorizontal,
  Trash2,
  Users,
  Calendar,
  Trophy,
  Building2,
  CircleDollarSign,
  LineChart,
  TrendingUp,
  Clock,
} from "lucide-react"
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
import { CopyableText } from "@/components/ui/CopyableText"
import { EventsGridSkeleton } from "./events-grid-skeleton"
import { NoMatchEmptyState } from "./NoMatchEmptyState"
import {
  useEventsStore,
  formatTimeRemaining,
  getTimeRemainingColor,
} from "@/lib/events-store"
import type { Event } from "@/types/events"

// ── Constants ────────────────────────────────────────────────────────────────

/** Number of skeleton cards to show while loading */
const LOADING_SKELETON_COUNT = 6

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date: Date) => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

/** Icon per category so status is not conveyed by color alone (WCAG 2.1 AA 1.4.1) */
const getCategoryIcon = (category: Event["category"]) => {
  switch (category) {
    case "Football":
      return <Trophy className="h-3 w-3 shrink-0" aria-hidden="true" />
    case "Politics":
      return <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
    case "Crypto":
      return <CircleDollarSign className="h-3 w-3 shrink-0" aria-hidden="true" />
    case "Stocks":
      return <LineChart className="h-3 w-3 shrink-0" aria-hidden="true" />
    default:
      return <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
  }
}

/** Category badge colour mapping — preserves existing design tokens */
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

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * TimeRemainingProgress — live countdown progress bar.
 *
 * Renders a text label + visual progress track with colour-coded urgency.
 * The urgency is also conveyed via a visually-hidden `<span>` to comply with
 * WCAG 2.1 AA 1.4.1 (Use of Color).
 */
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

  const urgencyLabel = { green: "Low urgency", orange: "Medium urgency", red: "High urgency" }[color]

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

  const progressValueRounded = Math.round(progressValue)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Time Remaining</span>
        <span className={cn("text-xs font-medium tabular-nums", textColorClass)}>
          <Clock className="inline-block h-3 w-3 mr-1 -mt-0.5" aria-hidden="true" />
          {timeString}
          <span className="sr-only"> — {urgencyLabel}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progressValueRounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Time remaining: ${timeString} (${urgencyLabel})`}
        className="w-full bg-white/10 rounded-full h-2"
      >
        <div
          className={cn("h-2 rounded-full transition-all duration-300", progressColorClass)}
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  )
}

// ── Event Card ────────────────────────────────────────────────────────────────

interface EventCardProps {
  event: Event
  index: number
  onDelete: (event: Event) => void
}

function EventCard({ event, index, onDelete }: EventCardProps) {
  const prefersReduced = React.useMemo(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }, [])

  return (
    <article
      className={cn(
        // Layout & styling
        "rounded-2xl border border-[#540D8D]/20 bg-[#0A0A1A] p-5",
        "flex flex-col gap-4",
        "transition-all duration-200",
        "hover:border-[#540D8D]/40 hover:bg-[#540D8D]/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#540D8D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060e20]",
        // Entry animation
        !prefersReduced && "animate-in fade-in slide-in-from-bottom-2",
      )}
      style={
        !prefersReduced
          ? { animationDelay: `${index * 60}ms`, animationFillMode: "both" }
          : undefined
      }
      aria-labelledby={`event-title-${event.id}`}
    >
      {/* ── Header: Category icon + Title + Badge ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Category icon */}
          <div className="h-10 w-10 rounded-xl bg-[#540D8D]/10 flex items-center justify-center shrink-0 text-[#540D8D]">
            {getCategoryIcon(event.category)}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id={`event-title-${event.id}`}
              className="font-semibold text-sm text-white truncate"
            >
              {event.title}
            </h3>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              <CopyableText
                text={`#${event.txHash}`}
                truncateMiddle={false}
                className="text-xs"
                aria-label={`Copy transaction hash ${event.txHash}`}
              />
            </p>
          </div>
        </div>
        {/* Category badge */}
        <Badge
          className={cn(
            getCategoryBadgeVariant(event.category),
            "inline-flex items-center gap-1 text-xs px-2 py-1 shrink-0",
          )}
        >
          {getCategoryIcon(event.category)}
          {event.category}
        </Badge>
      </div>

      {/* ── Odds + Participants stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Odds</p>
          <p className="text-lg font-bold text-white tabular-nums">{event.odds}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Participants</p>
          <p className="text-lg font-bold text-white tabular-nums flex items-center gap-1">
            <Users className="h-4 w-4 text-[#540D8D]" aria-hidden="true" />
            {event.participants.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-white capitalize">{event.status}</p>
        </div>
      </div>

      {/* ── Time remaining progress bar ── */}
      <TimeRemainingProgress event={event} />

      {/* ── Date + Actions footer ── */}
      <div className="flex items-center justify-between pt-3 border-t border-[#540D8D]/10">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{formatDate(new Date(event.endDate))}</span>
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              aria-label={`Open actions for ${event.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={`/events/${event.id}/edit`}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Event
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
              onSelect={() => onDelete(event)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  )
}

// ── EventsGrid Component ──────────────────────────────────────────────────────

export interface EventsGridProps {
  className?: string
}

export function EventsGrid({ className }: EventsGridProps) {
  const {
    filteredEvents,
    loading,
    error,
    deleteEvent,
    filters,
    setFilters,
    setSearch,
  } = useEventsStore()

  const [deleteTarget, setDeleteTarget] = React.useState<Event | null>(null)
  const [animationReady, setAnimationReady] = React.useState(false)
  const errorMessageId = React.useId()

  React.useEffect(() => {
    setAnimationReady(true)
  }, [])

  // ── Loading state ──
  if (loading && filteredEvents.length === 0) {
    return <EventsGridSkeleton count={LOADING_SKELETON_COUNT} />
  }

  // ── Error state ──
  if (error && filteredEvents.length === 0) {

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <TrendingUp className="h-8 w-8 text-red-500" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">
          Failed to load events
        </h3>
        <p
          id={errorMessageId}
          className="text-sm text-muted-foreground max-w-sm mb-4"
        >
          {error}
        </p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          aria-describedby={errorMessageId}
          className="border-[#540D8D] text-[#540D8D] hover:bg-[#540D8D]/10"
        >
          Try again
        </Button>
      </div>
    )
  }

  // ── Empty state ──
  if (filteredEvents.length === 0) {
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

  // ── Data state ──
  return (
    <div className={cn("space-y-6", className)}>
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.title}
              </span>
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

      {/* Grid of event cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredEvents.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            index={index}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>
    </div>
  )
}

