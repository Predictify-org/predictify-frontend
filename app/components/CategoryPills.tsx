"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface CategoryPill {
  value: string
  label: string
}

export interface CategoryPillsProps {
  categories: CategoryPill[]
  selected: string[]
  onToggle: (value: string) => void
  className?: string
}

export function CategoryPills({ categories, selected, onToggle, className }: CategoryPillsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const updateScrollState = React.useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  React.useEffect(() => {
    updateScrollState()
    const el = containerRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    return () => el.removeEventListener("scroll", updateScrollState)
  }, [updateScrollState])

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const el = containerRef.current
    if (!el) return

    if (e.key === "ArrowRight") {
      e.preventDefault()
      const nextIndex = (index + 1) % categories.length
      const nextButton = el.querySelector<HTMLButtonElement>(`[data-index="${nextIndex}"]`)
      nextButton?.focus()
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const prevIndex = (index - 1 + categories.length) % categories.length
      const prevButton = el.querySelector<HTMLButtonElement>(`[data-index="${prevIndex}"]`)
      prevButton?.focus()
    }
  }

  return (
    <div className={cn("relative", className)}>
      {canScrollLeft && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent"
          aria-hidden="true"
        />
      )}
      {canScrollRight && (
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent"
          aria-hidden="true"
        />
      )}

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
        role="group"
        aria-label="Filter by category"
      >
        {categories.map((category, index) => {
          const isActive = selected.includes(category.value)
          return (
            <button
              key={category.value}
              data-index={index}
              type="button"
              role="checkbox"
              aria-checked={isActive}
              aria-label={`${category.label}${isActive ? " (active filter)" : ""}`}
              onClick={() => onToggle(category.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {category.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
