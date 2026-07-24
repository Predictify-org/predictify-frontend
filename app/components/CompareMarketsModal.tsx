"use client"

import * as React from "react"
import { X, Users, Calendar, TrendingUp, Tag, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCompareStore } from "@/lib/compare-store"
import { useEventsStore } from "@/lib/events-store"
import type { Event } from "@/types/events"

const categoryClass: Record<Event["category"], string> = {
  Football: "bg-[#EBE7F6] text-[#4400FF] border-0",
  Politics: "bg-[#E7F6EC] text-[#036B26] border-0",
  Crypto: "bg-[#FBF703] text-[#865503] border-0",
  Stocks: "bg-[#03E6FB3B] text-[#035C86] border-0",
}

const statusClass: Record<Event["status"], string> = {
  ongoing: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  past: "bg-gray-100 text-gray-600",
}

function MarketColumn({ event }: { event: Event }) {
  return (
    <article
      aria-label={`Market details: ${event.title}`}
      className="flex flex-col gap-4 p-4 sm:p-6"
    >
      <h3 className="text-base font-semibold leading-snug text-foreground">{event.title}</h3>

      <div className="flex flex-wrap gap-2">
        <Badge className={cn("text-xs font-medium", categoryClass[event.category])}>
          {event.category}
        </Badge>
        <Badge className={cn("text-xs font-medium capitalize", statusClass[event.status])}>
          {event.status}
        </Badge>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm">
        <Row icon={<TrendingUp className="h-4 w-4" />} label="Odds" value={`${event.odds}x`} />
        <Row
          icon={<Users className="h-4 w-4" />}
          label="Participants"
          value={event.participants.toLocaleString()}
        />
        <Row
          icon={<Calendar className="h-4 w-4" />}
          label="Start date"
          value={formatDate(event.startDate)}
        />
        <Row icon={<Calendar className="h-4 w-4" />} label="End date" value={formatDate(event.endDate)} />
        {event.timeRemaining && (
          <Row icon={<Tag className="h-4 w-4" />} label="Time remaining" value={event.timeRemaining} />
        )}
        <Row
          icon={<Hash className="h-4 w-4" />}
          label="Tx hash"
          value={
            <span className="font-mono text-xs truncate" title={event.txHash}>
              {event.txHash}
            </span>
          }
        />
      </dl>
    </article>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="flex min-w-[120px] shrink-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

export function CompareMarketsModal() {
  const { selectedIds, overlayOpen, closeOverlay, clear } = useCompareStore()
  const { events } = useEventsStore()

  const selected = selectedIds
    .map((id) => events.find((event) => event.id === id))
    .filter((event): event is Event => Boolean(event))

  React.useEffect(() => {
    if (!overlayOpen) return

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Backspace" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        clear()
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [overlayOpen, clear])

  return (
    <Dialog open={overlayOpen} onOpenChange={(open) => !open && closeOverlay()}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0",
          "sm:rounded-xl"
        )}
        aria-describedby="compare-markets-description"
      >
        <DialogHeader className="flex shrink-0 flex-row items-start justify-between border-b px-6 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold text-foreground">
              Compare Markets
            </DialogTitle>
            <DialogDescription id="compare-markets-description" className="mt-0.5 text-xs text-muted-foreground">
              Side-by-side comparison of selected prediction markets. Press{" "}
              <kbd className="inline-flex h-5 items-center rounded border px-1 text-[10px] font-mono">
                Esc
              </kbd>{" "}
              to close or{" "}
              <kbd className="inline-flex h-5 items-center rounded border px-1 text-[10px] font-mono">
                ⌘⌫
              </kbd>{" "}
              to clear.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clear}
            aria-label="Clear comparison and close"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          {selected.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No markets selected for comparison.
            </p>
          ) : (
            <div
              className={cn(
                "grid divide-y md:divide-y-0 md:divide-x",
                selected.length === 2 ? "md:grid-cols-2" : "grid-cols-1"
              )}
            >
              {selected.map((event) => (
                <MarketColumn key={event.id} event={event} />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
