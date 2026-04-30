"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface EndOfListProps {
  /**
   * Whether to show the end-of-list message
   */
  show: boolean
  /**
   * Custom message text
   */
  text?: string
  /**
   * Additional CSS classes
   */
  className?: string
}

export function EndOfList({
  show,
  text = "You've reached the end",
  className,
}: EndOfListProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 py-8",
        className
      )}
      role="status"
      aria-label={text}
    >
      <div className="h-px flex-1 bg-border" />
      <span className="text-sm text-muted-foreground">{text}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
