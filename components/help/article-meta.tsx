"use client"
import React, { useMemo } from 'react';
import { Clock, BadgeCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ArticleMetaProps {
  content?: string;
  wordCount?: number;
  lastReviewed?: string; // ISO date string or similar
}

export function ArticleMeta({ content, wordCount, lastReviewed }: ArticleMetaProps) {
  const readingTime = useMemo(() => {
    let count = 0;
    if (wordCount !== undefined) {
      count = wordCount;
    } else if (content) {
      count = content.trim().split(/\s+/).length;
    }
    // Calculate reading time (avg 200 wpm), minimum 1 min
    const time = Math.max(1, Math.ceil(count / 200));
    return time;
  }, [content, wordCount]);

  const formattedDate = useMemo(() => {
    if (!lastReviewed) return 'Recently';
    try {
      const date = new Date(lastReviewed);
      if (isNaN(date.getTime())) return 'Recently';
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch {
      return 'Recently';
    }
  }, [lastReviewed]);

  const isoDate = useMemo(() => {
    if (!lastReviewed) return undefined;
    try {
      const date = new Date(lastReviewed);
      if (isNaN(date.getTime())) return undefined;
      return date.toISOString();
    } catch {
      return undefined;
    }
  }, [lastReviewed]);

  return (
    <div className="flex items-center gap-6 px-6 py-3 bg-gray-50 border-b border-gray-100">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <time>{readingTime} min read</time>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Estimated reading time based on {wordCount || (content ? content.trim().split(/\s+/).length : 0)} words (200 wpm)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <BadgeCheck className="w-4 h-4 text-green-600" aria-hidden="true" />
            <time dateTime={isoDate}>
              Reviewed {formattedDate}
            </time>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Last verified by our support team</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
