"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CategoryPills, type CategoryPill } from "./CategoryPills"
import { useEventsStore } from "@/lib/events-store"

const DEFAULT_CATEGORIES: CategoryPill[] = [
  { value: "Football", label: "Football" },
  { value: "Politics", label: "Politics" },
  { value: "Crypto", label: "Crypto" },
  { value: "Stocks", label: "Stocks" },
]

export interface MarketFiltersProps {
  categories?: CategoryPill[]
  className?: string
}

export function MarketFilters({ categories = DEFAULT_CATEGORIES, className }: MarketFiltersProps) {
  const { filters, setFilters } = useEventsStore()

  const handleToggle = React.useCallback(
    (value: string) => {
      const current = filters.category
      const next = current.includes(value)
        ? current.filter((c) => c !== value)
        : [...current, value]
      setFilters({ category: next })
    },
    [filters.category, setFilters]
  )

  return (
    <div className={cn("w-full", className)}>
      <CategoryPills
        categories={categories}
        selected={filters.category}
        onToggle={handleToggle}
      />
    </div>
  )
}
