"use client"

import Image from "next/image"
import { format, parseISO } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useWhatsNew, type ChangelogEntry } from "@/hooks/use-whats-new"

interface WhatsNewDrawerProps {
  className?: string
}

function formatEntryDate(date: string): string {
  try {
    return format(parseISO(date), "MMM d, yyyy")
  } catch {
    return date
  }
}

function ChangelogEntryCard({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="space-y-2 border-b border-border/50 pb-6 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
        <span className="shrink-0 text-xs text-muted-foreground">{formatEntryDate(entry.date)}</span>
      </div>
      <p className="text-sm text-muted-foreground">{entry.description}</p>
      {entry.highlights.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {entry.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      )}
      {entry.image && (
        <Image
          src={entry.image}
          alt={entry.imageAlt ?? ""}
          width={480}
          height={270}
          className="mt-2 w-full rounded-lg border border-border/50"
        />
      )}
    </article>
  )
}

export function WhatsNewDrawer({ className }: WhatsNewDrawerProps) {
  const { entries, hasUnseen, markSeen, dismissForever } = useWhatsNew()

  return (
    <Sheet onOpenChange={(open) => open && markSeen()}>
      <SheetTrigger
        className={cn(
          "relative flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
          className
        )}
        aria-label={hasUnseen ? "What's new: new updates available" : "What's new"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          campaign
        </span>
        {hasUnseen && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-slate-950"
          />
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What&apos;s new</SheetTitle>
          <SheetDescription>Recent updates and improvements to Predictify.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet — check back soon.</p>
          ) : (
            entries.map((entry) => <ChangelogEntryCard key={entry.id} entry={entry} />)
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-border/50 pt-4">
          <Checkbox
            id="whats-new-dont-show-again"
            onCheckedChange={(checked) => checked === true && dismissForever()}
          />
          <label htmlFor="whats-new-dont-show-again" className="text-sm text-muted-foreground">
            Don&apos;t show this indicator again
          </label>
        </div>
      </SheetContent>
    </Sheet>
  )
}
