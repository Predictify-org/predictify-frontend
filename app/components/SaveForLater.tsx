"use client";

import { useSavedMarketsStore } from "@/app/state/saved-markets";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";

interface SaveForLaterProps {
  marketId: string;
  marketTitle: string;
}

export function SaveForLater({ marketId, marketTitle }: SaveForLaterProps) {
  const isSaved = useSavedMarketsStore((state) => state.isSaved(marketId));

  const handleToggle = () => {
    useSavedMarketsStore.getState().toggle(marketId);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isSaved}
      aria-label={
        isSaved
          ? `Remove ${marketTitle} from saved items`
          : `Save ${marketTitle} for later`
      }
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#201F37] ${
        isSaved
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
          : "border-white/10 bg-white/5 text-white/80 hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-white"
      }`}
    >
      {isSaved ? (
        <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{isSaved ? "Saved" : "Save"}</span>
    </button>
  );
}
