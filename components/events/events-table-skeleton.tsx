import { Skeleton } from "@/components/ui/skeleton"

export function EventsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-black">
        {/* Responsive table container with horizontal scroll */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px] sm:min-w-full">
            {/* Table Header */}
            {/* MODIFIED: Updated grid to 7 columns to match new Participants & Actions columns */}
            <div className="bg-black px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="grid grid-cols-7 gap-4 items-center">
                <div className="min-w-[200px] sm:min-w-0">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="min-w-[100px] sm:min-w-0">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="min-w-[80px] sm:min-w-0">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="min-w-[180px] sm:min-w-0">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="min-w-[160px] sm:min-w-0">
                  <Skeleton className="h-4 w-24" />
                </div>
                {/* NEW: Participants column skeleton */}
                <div className="min-w-[120px] sm:min-w-0">
                  <Skeleton className="h-4 w-20" />
                </div>
                {/* NEW: Actions column skeleton */}
                <div className="min-w-[80px] sm:min-w-0 flex justify-end">
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
            </div>

            {/* Table Rows */}
            {/* MODIFIED: Updated grid to 7 columns to match new Participants & Actions columns */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="px-4 md:px-6 py-3 md:py-4 bg-black border-b border-gray-100 last:border-b-0"
              >
                <div className="grid grid-cols-7 gap-4 bg-black items-center">
                  {/* Event Title */}
                  <div className="min-w-[200px] sm:min-w-0 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>

                  {/* Category */}
                  <div className="min-w-[100px] sm:min-w-0">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  {/* Odds */}
                  <div className="min-w-[80px] sm:min-w-0">
                    <Skeleton className="h-4 w-8" />
                  </div>

                  {/* End Date */}
                  <div className="min-w-[180px] sm:min-w-0 space-y-1">
                    {/* Mobile: Stacked dates skeleton */}
                    <div className="sm:hidden">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    {/* Desktop: Single line skeleton */}
                    <div className="hidden sm:block">
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>

                  {/* Time Remaining */}
                  <div className="min-w-[160px] sm:min-w-0 space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-2 w-full" />
                  </div>

                  {/* NEW: Participants skeleton */}
                  <div className="min-w-[120px] sm:min-w-0">
                    <Skeleton className="h-4 w-16" />
                  </div>

                  {/* NEW: Actions skeleton */}
                  <div className="min-w-[80px] sm:min-w-0 flex justify-end">
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
