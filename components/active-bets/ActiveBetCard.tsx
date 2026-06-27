'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ActiveBetCardProps } from '@/lib/types';
import { categoryColors } from '@/lib/mock-data';
import { useDensity } from '@/hooks/useDensity';

export const ActiveBetCard: React.FC<ActiveBetCardProps> = ({ bet, className }) => {
  const { tokens: t } = useDensity();
  const categoryStyle = categoryColors[bet.category.color];
  
  const formatTimeRemaining = (timeString: string) => {
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

  return (
    <div
      className={cn(
        'flex-shrink-0 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl cursor-pointer group',
        'hover:bg-card/70 hover:border-border/70 hover:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
        'transition-all duration-200',
        t.cardPadding,
        t.cardWidth,
        className
      )}
      tabIndex={0}
      role="button"
      aria-label={`Active bet: ${bet.title}`}
      data-density
    >
      {/* Thumbnail and Category */}
      <div className={cn("relative mb-3", t.thumbnailHeight)}>
        <div className={cn("relative w-full rounded-lg overflow-hidden bg-muted", t.thumbnailHeight)}>
          <Image
            src={bet.thumbnail}
            alt={bet.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 640px) 280px, 320px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        
        {/* Category Chip */}
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
      </div>

      {/* Title */}
      <h3 className={cn("font-semibold text-foreground leading-tight mb-3", t.titleSize)}>
        {bet.title}
      </h3>

      {/* Start/End Dates — hidden in ultra */}
      {t.showDates && (
        <div className={cn("space-y-1 mb-3", t.bodySize)}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Starts:</span>
            <span className="text-foreground font-medium">
              {bet.startDate.toLocaleDateString('en-US', { 
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
              {bet.endDate.toLocaleDateString('en-US', { 
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
            style={{ width: `${bet.progress}%` }}
          />
        </div>
        
        {/* Time Remaining */}
        <div className="flex justify-end">
          <span className={cn(
            'font-mono font-medium',
            t.captionSize,
            categoryStyle.text
          )}>
            {formatTimeRemaining(bet.timeRemaining)}
          </span>
        </div>
      </div>
    </div>
  );
};