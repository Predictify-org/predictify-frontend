"use client"

import { useState } from "react"
import { MarketsListSkeleton } from "@/components/skeletons/markets-skeleton"
import { EventDetailSkeleton } from "@/components/skeletons/event-detail-skeleton"
import { EventsTableSkeleton } from "@/components/events/events-table-skeleton"
import { ErrorBanner } from "@/components/ui/error-banner"
import { AsyncButton } from "@/components/ui/async-button"
import { Separator } from "@/components/ui/separator"

export default function LoadingPatternsPage() {
  const [btnLoading, setBtnLoading] = useState(false)

  function simulateAction() {
    setBtnLoading(true)
    setTimeout(() => setBtnLoading(false), 2000)
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-12">
      <div>
        <h1 className="text-2xl font-bold mb-1">Loading & Async State Patterns</h1>
        <p className="text-muted-foreground text-sm">Design reference for skeletons, inline loading, and error/retry states.</p>
      </div>

      <Separator />

      {/* Surface 1 – Markets list skeleton */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">1. Markets List Skeleton</h2>
        <p className="text-sm text-muted-foreground">Shown while the markets widget fetches data.</p>
        <div className="max-w-md">
          <MarketsListSkeleton count={3} />
        </div>
      </section>

      <Separator />

      {/* Surface 2 – Event detail skeleton */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">2. Event Detail Skeleton</h2>
        <p className="text-sm text-muted-foreground">Shown while the event detail page loads.</p>
        <EventDetailSkeleton />
      </section>

      <Separator />

      {/* Surface 3 – Events table skeleton */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">3. Events Table Skeleton</h2>
        <p className="text-sm text-muted-foreground">Shown via Next.js loading.tsx on the events list page.</p>
        <EventsTableSkeleton />
      </section>

      <Separator />

      {/* Inline loading button */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Inline Loading – AsyncButton</h2>
        <p className="text-sm text-muted-foreground">Spinner replaces icon; text changes to loading copy.</p>
        <div className="flex flex-wrap gap-3">
          <AsyncButton loading={btnLoading} loadingText="Placing Bet..." onClick={simulateAction}>
            Place Bet
          </AsyncButton>
          <AsyncButton loading={btnLoading} loadingText="Submitting..." variant="outline" onClick={simulateAction}>
            Submit Form
          </AsyncButton>
        </div>
      </section>

      <Separator />

      {/* Error + retry banner */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Error + Retry Banner</h2>
        <p className="text-sm text-muted-foreground">Inline banner with optional retry callback.</p>
        <ErrorBanner
          message="Failed to load events. Check your connection and try again."
          onRetry={() => alert("Retrying…")}
        />
        <ErrorBanner
          title="Bet submission failed"
          message="Your transaction could not be broadcast to the Stellar network."
        />
      </section>
    </div>
  )
}
