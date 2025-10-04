import { Skeleton } from "@/components/ui/skeleton"

export function EventsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
        {/* Responsive table container with horizontal scroll */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px] sm:min-w-full">
            {/* Table Header */}
            <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="grid grid-cols-5 gap-4 items-center">
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
              </div>
            </div>

            {/* Table Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 last:border-b-0"
              >
                <div className="grid grid-cols-5 gap-4 items-center">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}