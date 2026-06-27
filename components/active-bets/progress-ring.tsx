"use client";

import React, { useMemo } from "react";
import { useCountdownTick } from "@/hooks/use-countdown-tick";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  startDate: Date;
  endDate: Date;
  size?: number;
  className?: string;
}

/**
 * Inline Progress Ring for countdowns.
 * Driven by a shared rAF loop for performance.
 * Shfits color from Blue to Amber as the deadline approaches.
 */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  startDate,
  endDate,
  size = 24,
  className,
}) => {
  const now = useCountdownTick();
  
  // Detect reduced motion preference
  const isReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const { progress, color } = useMemo(() => {
    const total = endDate.getTime() - startDate.getTime();
    if (total <= 0) return { progress: 1, color: "text-amber-500" };

    const elapsed = now - startDate.getTime();
    const rawProgress = Math.max(0, Math.min(1, elapsed / total));
    
    // Invert progress if we want the ring to EMPTY or FILL. 
    // Usually, count-down rings EMPTY.
    const remainingProgress = 1 - rawProgress;

    // Halfway color shift (Blue -> Amber)
    // Blue (blue-500) until 50% remaining, then transitions to Amber (amber-500)
    // Or just simple switch for performance and clarity.
    const isClose = remainingProgress < 0.5;
    const colorClass = isClose ? "text-amber-500" : "text-blue-500";

    return { 
      progress: remainingProgress, 
      color: colorClass 
    };
  }, [now, startDate, endDate]);

  // SVG parameters
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isReducedMotion 
    ? circumference * 0.75 // Static segment for reduced motion
    : circumference * (1 - progress);

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="rotate-[-90deg] transition-colors duration-500"
        aria-hidden="true"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ 
            strokeDashoffset,
            transition: isReducedMotion ? "none" : "stroke-dashoffset 0.1s linear, stroke 0.5s ease" 
          }}
          strokeLinecap="round"
          className={cn(color)}
        />
      </svg>
    </div>
  );
};
