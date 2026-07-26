import { Skeleton } from "@/components/ui/skeleton"

export function EventsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-background xl:overflow-hidden xl:border xl:border-border" data-testid="events-table-skeleton">
        {/* Match the card-to-table breakpoints used by EventsTable. */}
        <div className="overflow-visible xl:overflow-x-auto">
          <div className="w-full xl:min-w-[980px]">
            {/* Table Header */}
            {/* MODIFIED: Updated grid to 7 columns to match new Participants & Actions columns */}
            <div className="hidden border-b border-border bg-muted px-6 py-4 xl:block">
              <div className="grid grid-cols-7 gap-4 items-center">
                <div className="min-w-[200px] sm:min-w-0">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="min-w-0 xl:min-w-[100px]">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="min-w-0 xl:min-w-[80px]">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="min-w-[180px] sm:min-w-0">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="min-w-[160px] sm:min-w-0">
                  <Skeleton className="h-4 w-24" />
                </div>
                {/* NEW: Participants column skeleton */}
                <div className="min-w-0 xl:min-w-[120px]">
                  <Skeleton className="h-4 w-20" />
                </div>
                {/* NEW: Actions column skeleton */}
                <div className="flex min-w-0 justify-end xl:min-w-[80px]">
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
            </div>

            {/* Table Rows */}
            {/* MODIFIED: Updated grid to 7 columns to match new Participants & Actions columns */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="mb-4 rounded-lg border border-border bg-card p-4 last:mb-0 xl:mb-0 xl:rounded-none xl:border-x-0 xl:border-t-0 xl:p-6"
              >
                <div className="grid grid-cols-2 items-center gap-4 xl:grid-cols-7">
                  {/* Event Title */}
                  <div className="col-span-2 min-w-0 space-y-2 xl:col-span-1 xl:min-w-[200px]">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>

                  {/* Category */}
                  <div className="min-w-0 xl:min-w-[100px]">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  {/* Odds */}
                  <div className="min-w-0 xl:min-w-[80px]">
                    <Skeleton className="h-4 w-8" />
                  </div>

                  {/* End Date */}
                  <div className="col-span-2 min-w-0 space-y-1 xl:col-span-1 xl:min-w-[180px]">
                    {/* Mobile: Stacked dates skeleton */}
                    <div className="xl:hidden">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    {/* Desktop: Single line skeleton */}
                    <div className="hidden xl:block">
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>

                  {/* Time Remaining */}
                  <div className="col-span-2 min-w-0 space-y-2 xl:col-span-1 xl:min-w-[160px]">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-2 w-full" />
                  </div>

                  {/* NEW: Participants skeleton */}
                  <div className="min-w-0 xl:min-w-[120px]">
                    <Skeleton className="h-4 w-16" />
                  </div>

                  {/* NEW: Actions skeleton */}
                  <div className="flex min-w-0 justify-end xl:min-w-[80px]">
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
