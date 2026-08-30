import * as React from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton as UiSkeleton } from "@/components/ui/skeleton"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Market Detail"
      className={cn(
        "flex flex-col w-full p-6 sm:p-8",
        "rounded-2xl border border-dashed border-[#540D8D]/50 bg-[#540D8D]/5 backdrop-blur-sm",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row gap-6 mb-8 items-start w-full">
        <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-full bg-[#540D8D]/10 text-[#540D8D] dark:text-purple-400">
          <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 animate-pulse" aria-hidden="true" />
        </div>
        <div className="space-y-3 flex-1 w-full pt-2">
          <UiSkeleton className="h-8 sm:h-10 w-3/4 max-w-lg bg-[#540D8D]/20" />
          <UiSkeleton className="h-4 sm:h-5 w-full max-w-2xl bg-[#540D8D]/10" />
          <UiSkeleton className="h-4 sm:h-5 w-2/3 max-w-xl bg-[#540D8D]/10" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2 border-l-2 border-[#540D8D]/20 pl-4">
            <UiSkeleton className="h-3 sm:h-4 w-16 bg-[#540D8D]/10" />
            <UiSkeleton className="h-6 sm:h-8 w-20 sm:w-24 bg-[#540D8D]/20" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <UiSkeleton className="h-12 sm:h-14 w-full bg-[#540D8D]/15 rounded-xl" />
        <UiSkeleton className="h-12 sm:h-14 w-full bg-[#540D8D]/15 rounded-xl" />
      </div>
      <span className="sr-only">Loading market details...</span>
    </div>
  )
}

export function MarketCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "market-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow motion-reduce:transition-none motion-reduce:transform-none cursor-pointer bg-white dark:bg-gray-800",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading Market Card"
    >
      <div className="flex justify-between items-center mb-2">
        <UiSkeleton className="h-4 w-16" />
        <UiSkeleton className="h-6 w-16 rounded-full" />
      </div>

      <UiSkeleton className="h-7 w-3/4 mb-3" />

      <div className="flex justify-between items-center">
        <UiSkeleton className="h-5 w-24" />
        <UiSkeleton className="h-5 w-20" />
      </div>
      <span className="sr-only">Loading market card...</span>
    </div>
  )
}

export function ProfilePageSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Profile Page"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <UiSkeleton className="h-8 w-40" />
        <UiSkeleton className="h-9 w-28" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <div className="space-y-2 px-6 pb-4 pt-6">
            <UiSkeleton className="h-6 w-48" />
            <UiSkeleton className="h-4 w-64" />
          </div>

          <div className="space-y-6 px-6 pb-6">
            <div className="flex items-center gap-4">
              <UiSkeleton className="h-20 w-20 rounded-full" />
              <UiSkeleton className="h-9 w-32" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <UiSkeleton className="h-4 w-24" />
                <UiSkeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <UiSkeleton className="h-4 w-24" />
                <UiSkeleton className="h-10 w-full" />
              </div>
            </div>

            <div className="space-y-2">
              <UiSkeleton className="h-4 w-20" />
              <UiSkeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <UiSkeleton className="h-4 w-24" />
              <UiSkeleton className="h-10 w-full" />
            </div>

            <UiSkeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="space-y-2 px-6 pb-4 pt-6">
            <UiSkeleton className="h-6 w-24" />
            <UiSkeleton className="h-4 w-72" />
          </div>

          <div className="space-y-6 px-6 pb-6">
            <div className="space-y-2">
              <UiSkeleton className="h-4 w-36" />
              <UiSkeleton className="h-10 w-full" />
            </div>

            <UiSkeleton className="h-px w-full" />

            <div className="space-y-2">
              <UiSkeleton className="h-4 w-28" />
              <UiSkeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <UiSkeleton className="h-4 w-36" />
              <UiSkeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <UiSkeleton className="h-4 w-44" />
              <UiSkeleton className="h-3 w-48" />
              <UiSkeleton className="h-3 w-52" />
              <UiSkeleton className="h-3 w-40" />
            </div>

            <UiSkeleton className="h-10 w-36" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card px-6 py-6">
        <div className="space-y-2 pb-4">
          <UiSkeleton className="h-6 w-40" />
          <UiSkeleton className="h-4 w-72" />
        </div>

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0">
              <div className="space-y-2">
                <UiSkeleton className="h-5 w-40" />
                <UiSkeleton className="h-4 w-64" />
              </div>
              {i === 0 ? <UiSkeleton className="h-6 w-28 rounded-full" /> : null}
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Loading profile page...</span>
    </div>
  )
}
