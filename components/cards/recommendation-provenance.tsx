"use client"

import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type RecommendationSignalKey =
  | "category_match"
  | "similar_markets"
  | "trending"
  | (string & {})

type SignalCopy = {
  title: string
  explanation: string
}

const DEFAULT_SIGNAL_COPY: SignalCopy = {
  title: "Recommendation signal",
  explanation:
    "We are showing this because it may be relevant based on recent market activity.",
}

export const RECOMMENDATION_SIGNAL_COPY: Record<string, SignalCopy> = {
  category_match: {
    title: "Category match",
    explanation:
      "You have viewed or predicted on markets in this category before, so this one may be relevant.",
  },
  similar_markets: {
    title: "Similar markets",
    explanation:
      "This market is close to other markets you have recently opened or followed.",
  },
  trending: {
    title: "Trending now",
    explanation:
      "This market is getting more attention from Predictify users right now.",
  },
}

export function getRecommendationSignalCopy(
  signalKey?: RecommendationSignalKey,
  fallbackExplanation?: string
): SignalCopy {
  const mappedCopy = signalKey ? RECOMMENDATION_SIGNAL_COPY[signalKey] : undefined
  const trimmedFallback = fallbackExplanation?.trim()

  if (mappedCopy) {
    return trimmedFallback
      ? { ...mappedCopy, explanation: trimmedFallback }
      : mappedCopy
  }

  return {
    title: DEFAULT_SIGNAL_COPY.title,
    explanation: trimmedFallback || DEFAULT_SIGNAL_COPY.explanation,
  }
}

interface RecommendationProvenanceProps {
  signalKey?: RecommendationSignalKey
  fallbackExplanation?: string
  marketTitle?: string
  onStopRecommending?: () => void
  className?: string
}

export function RecommendationProvenance({
  signalKey,
  fallbackExplanation,
  marketTitle,
  onStopRecommending,
  className,
}: RecommendationProvenanceProps) {
  const signalCopy = getRecommendationSignalCopy(signalKey, fallbackExplanation)
  const stopLabel = marketTitle
    ? `Stop recommending ${marketTitle}`
    : "Stop recommending this"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 px-2 text-xs text-muted-foreground", className)}
          aria-label={
            marketTitle
              ? `Why am I seeing ${marketTitle}?`
              : "Why am I seeing this?"
          }
        >
          <Info className="h-4 w-4" aria-hidden="true" />
          <span>Why?</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] space-y-3 p-4"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Why am I seeing this?
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {signalCopy.title}
          </p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {signalCopy.explanation}
        </p>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-sm"
          aria-label={stopLabel}
          onClick={onStopRecommending}
        >
          Stop recommending this
        </Button>
      </PopoverContent>
    </Popover>
  )
}
