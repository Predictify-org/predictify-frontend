"use client"

import * as React from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface BackToTopFabProps {
  /**
   * Scroll container ref to monitor and scroll
   */
  scrollContainerRef: React.RefObject<HTMLElement>
  /**
   * Threshold in viewport heights before showing button (default: 2)
   */
  threshold?: number
  /**
   * Callback when button is clicked (optional)
   */
  onScrollToTop?: () => void
  /**
   * Additional CSS classes
   */
  className?: string
}

export function BackToTopFab({
  scrollContainerRef,
  threshold = 2,
  onScrollToTop,
  className,
}: BackToTopFabProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const viewportHeight = window.innerHeight
      const thresholdPx = viewportHeight * threshold

      setIsVisible(scrollTop > thresholdPx)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Check initial state

    return () => {
      container.removeEventListener("scroll", handleScroll)
    }
  }, [scrollContainerRef, threshold])

  const handleClick = () => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    onScrollToTop?.()
  }

  if (!isVisible) return null

  return (
    <Button
      onClick={handleClick}
      aria-label="Back to top"
      className={cn(
        "fixed z-50 shadow-lg transition-all duration-100",
        "animate-in fade-in slide-in-from-bottom-2",
        // Desktop: bottom-right
        "hidden md:flex md:bottom-8 md:right-8",
        // Mobile: bottom-center, above tab bar
        "flex bottom-24 left-1/2 -translate-x-1/2",
        "md:translate-x-0",
        "gap-2 rounded-full px-4 py-2",
        "bg-[#540D8D] hover:bg-[#6B1DAB] text-white",
        className
      )}
    >
      <ArrowUp className="h-4 w-4" />
      <span className="text-sm font-medium">Back to top</span>
    </Button>
  )
}
