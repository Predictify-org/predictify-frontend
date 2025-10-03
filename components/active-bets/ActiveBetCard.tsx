'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ActiveBetCardProps } from '@/lib/types';
import { categoryColors } from '@/lib/mock-data';

export const ActiveBetCard: React.FC<ActiveBetCardProps> = ({ bet, className }) => {
  const categoryStyle = categoryColors[bet.category.color];
  
  // Format time remaining to show in a more readable format
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
        // Base styles
        'flex-shrink-0 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3 sm:p-4 cursor-pointer group',
        // Responsive width - show 1.2 cards on mobile, 2.5 on tablet, 3+ on desktop
        'w-[calc(100vw-3rem)] max-w-[280px] sm:w-[280px] md:w-[300px] lg:w-[320px]',
        // Interactive states
        'hover:bg-card/70 hover:border-border/70 hover:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
        'transition-all duration-200',
        className
      )}
      tabIndex={0}
      role="button"
      aria-label={`Active bet: ${bet.title}`}
    >
      {/* Thumbnail and Category */}
      <div className="relative mb-3">
        <div className="relative w-full h-20 rounded-lg overflow-hidden bg-muted">
          <Image
            src={bet.thumbnail}
            alt={bet.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 640px) 280px, 320px"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        
        {/* Category Chip */}
        <div
          className={cn(
            'absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium border backdrop-blur-sm',
            categoryStyle.bg,
            categoryStyle.text,
            categoryStyle.border
          )}
        >
          {bet.category.name}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground mb-3 text-sm leading-tight">
        {bet.title}
      </h3>

      {/* Start/End Dates */}
      <div className="space-y-1 mb-3 text-xs">
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

      {/* Progress Bar and Time Remaining */}
      <div className="space-y-2">
        {/* Progress Bar */}
        <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
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
            'text-xs font-mono font-medium',
            categoryStyle.text
          )}>
            {formatTimeRemaining(bet.timeRemaining)}
          </span>
        </div>
      </div>
    </div>
  );
};
