"use client"

import * as React from "react"
import { Search, Filter, ArrowUpDown, ChevronDown } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useEventsStore } from "@/lib/events-store"
import type { EventSort } from "@/types/events"

interface EventsToolbarProps {
  className?: string
}

export function EventsToolbar({ className }: EventsToolbarProps) {
  const { filters, sort, setSearch, setFilters, setSort, setDateRange } = useEventsStore()

  // Handle search input with debouncing
  const [searchValue, setSearchValue] = React.useState(filters.search)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, setSearch])

  // Handle date range changes
  const handleDateRangeChange = (dateRange: DateRange | undefined) => {
    setDateRange(dateRange?.from || null, dateRange?.to || null)
  }

  // Handle category filter changes
  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked ? [...filters.category, category] : filters.category.filter((c) => c !== category)

    setFilters({ category: newCategories })
  }

  // Handle sort changes
  const handleSortChange = (field: EventSort["field"]) => {
    const newDirection = sort.field === field && sort.direction === "asc" ? "desc" : "asc"
    setSort({ field, direction: newDirection })
  }

  // Get active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (filters.category.length > 0) count++
    if (filters.oddsRange[0] > 0 || filters.oddsRange[1] < 10) count++
    return count
  }, [filters])

  const categories = ["Football", "Politics", "Crypto", "Stocks"]
  const sortOptions = [
    { field: "title" as const, label: "Event Title" },
    { field: "category" as const, label: "Category" },
    { field: "odds" as const, label: "Odds" },
    { field: "endDate" as const, label: "End Date" },
    { field: "timeRemaining" as const, label: "Time Remaining" },
  ]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mobile Layout */}
      <div className="flex flex-col gap-4 md:hidden">
        {/* Date Range Picker - Mobile */}
        <DateRangePicker
          date={{
            from: filters.dateRange.from || undefined,
            to: filters.dateRange.to || undefined,
          }}
          onDateChange={handleDateRangeChange}
          placeholder="29-03-2025 To 29-12-2025"
        />

        {/* Search, Filter, Sort Row - Mobile */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={filters.category.includes(category)}
                  onCheckedChange={(checked) => handleCategoryChange(category, checked)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={`${sort.field}-${sort.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split("-") as [EventSort["field"], "asc" | "desc"]
                  setSort({ field, direction })
                }}
              >
                {sortOptions.map((option) => (
                  <React.Fragment key={option.field}>
                    <DropdownMenuRadioItem value={`${option.field}-asc`}>{option.label} (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={`${option.field}-desc`}>{option.label} (Z-A)</DropdownMenuRadioItem>
                  </React.Fragment>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex md:items-center md:justify-between md:gap-4">
        {/* Left side - Search, Filter, Sort */}
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={filters.category.includes(category)}
                  onCheckedChange={(checked) => handleCategoryChange(category, checked)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 bg-transparent">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={`${sort.field}-${sort.direction}`}
                onValueChange={(value) => {
                  const [field, direction] = value.split("-") as [EventSort["field"], "asc" | "desc"]
                  setSort({ field, direction })
                }}
              >
                {sortOptions.map((option) => (
                  <React.Fragment key={option.field}>
                    <DropdownMenuRadioItem value={`${option.field}-asc`}>{option.label} (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value={`${option.field}-desc`}>{option.label} (Z-A)</DropdownMenuRadioItem>
                  </React.Fragment>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - Date Range Picker */}
        <DateRangePicker
          date={{
            from: filters.dateRange.from || undefined,
            to: filters.dateRange.to || undefined,
          }}
          onDateChange={handleDateRangeChange}
          placeholder="29-03-2025 To 29-12-2025"
          className="w-auto"
        />
      </div>
    </div>
  )
}
