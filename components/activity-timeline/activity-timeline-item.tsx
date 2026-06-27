"use client";

import React from "react";
import { ActivityEvent, ACTIVITY_EVENT_ICONS } from "@/types/activity";
import {
  formatActivityTimestamp,
  formatActivityTime,
} from "@/lib/activity-timeline";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { MarketStatusBadge } from "@/components/moderation/MarketStatusBadge";
import { cn } from "@/lib/utils";

interface ActivityTimelineItemProps {
  event: ActivityEvent;
  isFirst?: boolean;
  groupColor?: string;
  className?: string;
}

/**
 * ActivityTimelineItem Component
 *
 * Displays a single activity event in the timeline.
 * Features:
 * - Timeline connector (dot and line)
 * - Event icon with color coding
 * - Timestamp (relative and exact time)
 * - Event title and description
 * - Amount display for transactions
 * - Hover effects and transitions
 *
 * Visual Elements:
 * - Colored dot indicator
 * - Vertical connecting line
 * - Card-like appearance on hover
 * - Responsive layout (stacked on mobile)
 */
export function ActivityTimelineItem({
  event,
  isFirst = false,
  groupColor = "#8B5CF6",
  className,
}: ActivityTimelineItemProps) {
  return (
    <HoverCard openDelay={350} closeDelay={150}>
        <HoverCardTrigger asChild>
          <div className={cn("px-4 py-4 md:px-6 md:py-4 hover:bg-gray-50 transition-colors", className)}>
            <div className="flex gap-3 sm:gap-4">
              {/* Timeline Connector */}
              <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                {/* Timeline Dot */}
                <div
                  className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white z-10 relative"
                  style={{ backgroundColor: groupColor }}
                />

                {/* Vertical Line (not shown for last item) */}
                <div
                  className="w-0.5 h-12 mt-0.5"
                  style={{ backgroundColor: groupColor, opacity: 0.3 }}
                />
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0 pb-2">
                {/* Header: Title and Time */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 mb-1">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                      {event.title}
                    </h4>
                    {event.description && (
                      <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Time Display */}
                  <div className="flex flex-col items-start sm:items-end flex-shrink-0 text-xs sm:text-sm">
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {formatActivityTime(new Date(event.timestamp))}
                    </span>
                    <span className="text-gray-500" title={new Date(event.timestamp).toISOString()}>
                      {formatActivityTimestamp(new Date(event.timestamp))}
                    </span>
                  </div>
                </div>

                {/* Amount Display (for transactions) */}
                {event.amount && event.currency && (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={cn(
                        "text-sm sm:text-base font-semibold",
                        event.eventType.includes("withdrawal")
                          ? "text-red-600"
                          : "text-green-600"
                      )}
                    >
                      {event.eventType.includes("withdrawal") ? "−" : "+"}
                      {event.amount.toLocaleString()} {event.currency}
                    </span>
                    {event.relatedEventId && (
                      <span className="text-xs text-gray-500">
                        (#{event.relatedEventId})
                      </span>
                    )}
                  </div>
                )}

                {/* Metadata Tags (if any) */}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          {/* Preview Card */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">{event.title}</h4>
            {event.description && <p className="text-sm text-gray-600">{event.description}</p>}
            {/* Placeholder MarketStatusBadge – using a default state */}
            <MarketStatusBadge state="under_review" />
          </div>
        </HoverCardContent>
      </HoverCard>
  );
}

/**
 * Highlight variant for important/recent events
 */
export function ActivityTimelineItemHighlight({
  event,
  groupColor = "#8B5CF6",
}: Omit<ActivityTimelineItemProps, "isFirst"> & { groupColor?: string }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-purple-500 p-4 rounded">
      <ActivityTimelineItem event={event} groupColor={groupColor} />
    </div>
  );
}
