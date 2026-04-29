"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingMoreIndicatorProps {
  /**
   * Whether the indicator is currently loading
   */
  isLoading: boolean
  /**
   * Custom loading text
   */
  text?: string
  /**
   * Additional CSS classes
   */
  className?: string
}

export function LoadingMoreIndicator({
  isLoading,
  text = "Loading more items...",
  className,
}: LoadingMoreIndicatorProps) {
  if (!isLoading) return null

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-6",
        "h-12", // Fixed height to prevent scroll jump
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{text}</span>
      </div>
    </div>
  )
}
