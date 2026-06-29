'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ActiveBetCardProps } from '@/lib/types';
import { categoryColors } from '@/lib/mock-data';
import { useDensity } from '@/hooks/useDensity';
import { ProgressRing } from './progress-ring';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export const ActiveBetCard: React.FC<ActiveBetCardProps & { isLoading?: boolean }> = ({ bet, isLoading = false, className }) => {
  const { tokens: t } = useDensity();
  const reducedMotion = useReducedMotion();

  // Safe fallback properties
  const title = bet?.title || '';
  const progress = bet?.progress || 0;
  const timeRemaining = bet?.timeRemaining || '';
  const startDate = bet?.startDate || new Date();
  const endDate = bet?.endDate || new Date();
  const thumbnail = bet?.thumbnail || '';

  const categoryStyle = bet 
    ? categoryColors[bet.category.color] 
    : { bg: 'bg-muted/20', text: 'text-muted-foreground', border: 'border-muted/30', progress: 'bg-muted' };

  const formatTimeRemaining = (timeString: string) => {
    if (!timeString) return '';
    const parts = timeString.split(':');
    if (parts.length === 4) {
      const [days, hours, minutes, seconds] = parts;
      if (parseInt(days) > 0) {
        return `${days}d ${hours}h`;
      }
      return `${hours}:${minutes}:${seconds}`;
    }
    return timeString;
  };

  const ActiveBetCardSkeleton = () => (
    <div className={cn(
      "flex-shrink-0 bg-card/30 border border-border/30 rounded-xl animate-pulse",
      t.cardPadding,
      t.cardWidth
    )}>
      <div className={cn("relative mb-3", t.thumbnailHeight)}>
        <div className={cn("w-full rounded-lg bg-muted/50", t.thumbnailHeight)} />
        <div className={cn("absolute top-2 left-2 w-16 h-6 bg-muted/50 rounded-md")} />
      </div>
      <div className={cn("h-4 bg-muted/50 rounded mb-3", t.titleSize)} />
      {t.showDates && (
        <div className="space-y-1 mb-3">
          <div className="h-3 bg-muted/50 rounded w-3/4" />
          <div className="h-3 bg-muted/50 rounded w-2/3" />
        </div>
      )}
      <div className="space-y-2">
        <div className={cn("w-full bg-muted/50 rounded-full", t.progressHeight)} />
        <div className="h-3 bg-muted/50 rounded w-1/4 ml-auto" />
      </div>
    </div>
  );

  return (
    <div 
      className={cn("relative overflow-hidden rounded-xl", t.cardWidth)}
      data-state={isLoading ? "loading" : "loaded"}
    >
      {/* Skeleton Overlay */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-300 ease-in-out z-10 pointer-events-none bg-background",
          isLoading ? "opacity-100" : "opacity-0"
        )}
      >
        <ActiveBetCardSkeleton />
      </div>

      {/* Content Container */}
      <div
        className={cn(
          'flex-shrink-0 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl cursor-pointer group',
          'hover:bg-card/70 hover:border-border/70 hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          'transition-all duration-300 ease-out',
          reducedMotion ? "" : "transform",
          isLoading 
            ? "opacity-0 translate-y-1 pointer-events-none" 
            : "opacity-100 translate-y-0",
          t.cardPadding,
          t.cardWidth,
          className
        )}
        tabIndex={isLoading ? -1 : 0}
        role="button"
        aria-label={isLoading ? "Loading bet..." : `Active bet: ${title}`}
        data-density
      >
        {/* Thumbnail and Category */}
        <div className={cn("relative mb-3", t.thumbnailHeight)}>
          <div className={cn("relative w-full rounded-lg overflow-hidden bg-muted", t.thumbnailHeight)}>
            {thumbnail && (
              <Image
                src={thumbnail}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 640px) 280px, 320px"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
          
          {/* Category Chip */}
          {bet?.category?.name && (
            <div
              className={cn(
                'absolute top-2 left-2 rounded-md font-medium border backdrop-blur-sm',
                categoryStyle.bg,
                categoryStyle.text,
                categoryStyle.border,
                t.chipPadding,
                t.captionSize
              )}
            >
              {bet.category.name}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className={cn("font-semibold text-foreground leading-tight mb-3", t.titleSize)}>
          {title}
        </h3>

        {/* Start/End Dates — hidden in ultra */}
        {t.showDates && bet && (
          <div className={cn("space-y-1 mb-3", t.bodySize)}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Starts:</span>
              <span className="text-foreground font-medium">
                {startDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Ends:</span>
              <span className="text-foreground font-medium">
                {endDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        )}

        {/* Progress Bar and Time Remaining */}
        <div className="space-y-2">
          {/* Progress Bar */}
          <div className={cn("w-full bg-muted/50 rounded-full overflow-hidden", t.progressHeight)}>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                categoryStyle.progress
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Time Remaining */}
          <div className="flex justify-end items-center gap-2">
            {bet && (
              <ProgressRing 
                startDate={startDate} 
                endDate={endDate} 
                size={24} 
              />
            )}

            <span className={cn(
              'font-mono font-medium',
              t.captionSize,
              categoryStyle.text
            )}>
              {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
