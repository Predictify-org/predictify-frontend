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
