"use client"

import { useReducedMotion } from "@/hooks/useReducedMotion"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface DashboardSkeletonProps {
  className?: string
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div
      className={cn("flex flex-col gap-4", className)}
      role="status"
      aria-live="polite"
      aria-label="Dashboard is loading"
      data-testid="dashboard-skeleton"
    >
      <span className="sr-only">Dashboard is loading</span>

      {/* Header skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-72 rounded-full" />

      {/* Stat cards grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl border border-cyan-500/10 bg-slate-900/40 p-6 sm:p-8",
              !reducedMotion && "animate-pulse",
            )}
            data-testid={`skeleton-stat-${i}`}
          >
            <Skeleton className="mb-2 h-10 w-24 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Recently viewed rail skeleton */}
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="flex gap-3 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-64 shrink-0 rounded-xl" />
        ))}
      </div>

      {/* Active bets skeleton */}
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-32 w-full rounded-xl" />

      {/* Recommendations skeleton */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-7 w-52 rounded-md" />
          <Skeleton className="mt-1 h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="mt-2 h-9 w-32 rounded-lg sm:mt-0" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-full flex-col gap-4 rounded-xl border border-cyan-500/10 bg-slate-900/40 p-4",
              !reducedMotion && "animate-pulse",
            )}
            data-testid={`skeleton-rec-${i}`}
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <div className="mt-auto flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Activity section skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div
          className={cn(
            "col-span-4 rounded-xl border border-cyan-500/10 bg-slate-900/40 p-4",
            !reducedMotion && "animate-pulse",
          )}
        >
          <Skeleton className="mb-1 h-6 w-40 rounded-md" />
          <Skeleton className="mb-4 h-4 w-56 rounded-md" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div
          className={cn(
            "col-span-3 rounded-xl border border-cyan-500/10 bg-slate-900/40 p-4",
            !reducedMotion && "animate-pulse",
          )}
        >
          <Skeleton className="mb-1 h-6 w-36 rounded-md" />
          <Skeleton className="mb-4 h-4 w-48 rounded-md" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-2/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
