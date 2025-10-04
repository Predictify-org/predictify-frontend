"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEventsStore } from "@/lib/events-store"

interface PaginationProps {
  className?: string
}

export function EventsPagination({ className }: PaginationProps) {
  const { pagination, setPagination, filteredEvents } = useEventsStore()

  const totalPages = Math.ceil(filteredEvents.length / pagination.pageSize)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const currentPage = pagination.page

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("...")
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("...")
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPagination({ page })
    }
  }

  const handlePrevious = () => {
    handlePageChange(pagination.page - 1)
  }

  const handleNext = () => {
    handlePageChange(pagination.page + 1)
  }

  if (filteredEvents.length === 0) {
    return null
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className={cn("flex items-center justify-center md:justify-end gap-2 py-4", className)}>
      {/* Previous Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevious}
        disabled={pagination.page === 1}
        className="gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500" aria-hidden="true">
                ...
              </span>
            )
          }

          const isCurrentPage = pageNum === pagination.page

          return (
            <Button
              key={pageNum}
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(pageNum as number)}
              className={cn(
                "min-w-[2.5rem] h-9 transition-all duration-200 rounded-lg",
                isCurrentPage
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
              )}
              aria-label={`Go to page ${pageNum}`}
              aria-current={isCurrentPage ? "page" : undefined}
            >
              {pageNum}
            </Button>
          )
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNext}
        disabled={pagination.page === totalPages}
        className="gap-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Go to next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
