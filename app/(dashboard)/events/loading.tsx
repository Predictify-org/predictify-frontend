/**
 * MODIFIED: Added skeleton loading state for the events page.
 * Displays a shimmer skeleton matching the events table layout
 * while the page is loading via Next.js Suspense boundary.
 */
import { Skeleton } from "@/components/ui/skeleton"
import { EventsTableSkeleton } from "@/components/events/events-table-skeleton"

export default function Loading() {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Page header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-36" />
      </div>
      {/* Tabs skeleton */}
      <Skeleton className="h-12 w-80 rounded-full" />
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
      {/* Table skeleton */}
      <EventsTableSkeleton />
    </div>
  )
}
