import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/** Skeleton for a single market card (used in the marketing widget and dashboard) */
export function MarketCardSkeleton() {
  return (
    <Card className="border-white/10 bg-[#201F3780] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        {/* Odds */}
        <div className="space-y-1 text-right shrink-0">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
      {/* Progress bar */}
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="mt-2 flex justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </Card>
  )
}

/** Skeleton for the full markets list (3 cards) */
export function MarketsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  )
}
