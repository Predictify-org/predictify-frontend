"use client";

import { useEffect, useState } from "react";
import { BookmarkCheck, BookmarkPlus } from "lucide-react";

const STORAGE_KEY = "predictify-saved-markets";

interface SaveForLaterProps {
  marketId: string;
  marketTitle: string;
}

export function SaveForLater({ marketId, marketTitle }: SaveForLaterProps) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const savedIds = JSON.parse(raw) as string[];
      setIsSaved(savedIds.includes(marketId));
    } catch {
      // Ignore malformed storage payloads and fall back to the default state.
    }
  }, [marketId]);

  const handleToggle = () => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const savedIds = raw ? (JSON.parse(raw) as string[]) : [];

      const nextSavedIds = isSaved
        ? savedIds.filter((id) => id !== marketId)
        : [...new Set([...savedIds, marketId])];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSavedIds));
      setIsSaved(!isSaved);
    } catch {
      // Fail closed: keep the UI responsive even if storage is unavailable.
    }
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
