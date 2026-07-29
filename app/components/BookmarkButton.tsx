"use client"

import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useBookmarksStore } from "@/app/state/bookmarks"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BookmarkButtonProps {
  /** Unique identifier for the market to bookmark. */
  marketId: string;
  /** Optional additional CSS classes for styling. */
  className?: string;
  /** Optional button size variant. Defaults to 'icon'. */
  size?: "default" | "sm" | "lg" | "icon";
  /** Optional callback fired after bookmark state changes. */
  onToggle?: (bookmarked: boolean) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BookmarkButton – Allows users to bookmark/unbookmark a market.
 *
 * Features:
 * - Persists bookmark state to localStorage via Zustand
 * - Accessible button with ARIA labels
 * - Tooltip showing current state
 * - Keyboard navigable
 * - Visual feedback on hover/focus
 * - Responsive icon fill state
 *
 * @example
 * ```tsx
 * <BookmarkButton marketId="market-123" />
 * ```
 */
export function BookmarkButton({
  marketId,
  className,
  size = "icon",
  onToggle,
}: BookmarkButtonProps) {
  const isBookmarked = useBookmarksStore((state) =>
    state.isBookmarked(marketId)
  )
  const toggle = useBookmarksStore((state) => state.toggle)

  const handleClick = () => {
    const newState = toggle(marketId)
    onToggle?.(newState)
  }

  const label = isBookmarked ? "Remove bookmark" : "Bookmark this market"
  const tooltipText = isBookmarked
    ? "Remove from bookmarks"
    : "Save to bookmarks"

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={handleClick}
            aria-label={label}
            aria-pressed={isBookmarked}
            className={cn(
              "transition-all duration-200 hover:scale-110",
              isBookmarked && "text-yellow-400 hover:text-yellow-500",
              !isBookmarked && "text-muted-foreground hover:text-foreground",
              className
            )}
            data-testid="bookmark-button"
          >
            <Bookmark
              className={cn(
                "h-5 w-5 transition-all",
                isBookmarked && "fill-yellow-400"
              )}
              aria-hidden="true"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
