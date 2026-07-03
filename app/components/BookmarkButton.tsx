"use client";

import { Bookmark } from "lucide-react";
import { useBookmarksStore } from "@/app/state/bookmarks";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  marketId: string;
  marketTitle: string;
  className?: string;
}

export function BookmarkButton({ marketId, marketTitle, className }: BookmarkButtonProps) {
  const isBookmarked = useBookmarksStore((state) => state.isBookmarked(marketId));
  const toggle = useBookmarksStore((state) => state.toggle);
  const label = isBookmarked
    ? `Remove ${marketTitle} from saved markets`
    : `Save ${marketTitle} for later`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isBookmarked}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300",
        isBookmarked && "border-purple-300/60 bg-purple-500/20 text-purple-200",
        className
      )}
      onClick={() => toggle(marketId)}
    >
      <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} aria-hidden="true" />
    </button>
  );
}
