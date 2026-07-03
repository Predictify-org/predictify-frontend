"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TooltipProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "content"> {
  /** Content announced and displayed inside the tooltip bubble. */
  content: React.ReactNode;
  /** Focusable or descriptive trigger content. */
  children: React.ReactNode;
  /** Delay before showing on hover, in milliseconds. */
  hoverDelay?: number;
  /** Delay before showing on touch or pen long-press, in milliseconds. */
  longPressDelay?: number;
  /** Optional id for the tooltip bubble. */
  tooltipId?: string;
  /** Extra classes for the tooltip bubble. */
  tooltipClassName?: string;
}

export function Tooltip({
  content,
  children,
  hoverDelay = 300,
  longPressDelay = 600,
  tooltipId,
  tooltipClassName,
  className,
  tabIndex,
  onBlur,
  onFocus,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  onPointerCancel,
  onPointerDown,
  onPointerLeave,
  onPointerUp,
  onTouchCancel,
  onTouchEnd,
  onTouchStart,
  "aria-describedby": ariaDescribedBy,
  ...triggerProps
}: TooltipProps) {
  const reactId = React.useId();
  const id = tooltipId ?? `tooltip-${reactId.replace(/:/g, "")}`;
  const [open, setOpen] = React.useState(false);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = React.useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const clearLongPressTimer = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const close = React.useCallback(() => {
    clearHoverTimer();
    clearLongPressTimer();
    setOpen(false);
  }, [clearHoverTimer, clearLongPressTimer]);

  React.useEffect(() => {
    return () => {
      clearHoverTimer();
      clearLongPressTimer();
    };
  }, [clearHoverTimer, clearLongPressTimer]);

  const describedBy = [ariaDescribedBy, open ? id : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <span
      {...triggerProps}
      tabIndex={tabIndex ?? 0}
      aria-describedby={describedBy}
      data-state={open ? "open" : "closed"}
      className={cn(
        "relative inline-flex cursor-help items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#201F37]",
        className,
      )}
      onBlur={(event) => {
        onBlur?.(event);
        close();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setOpen(true);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key === "Escape") {
          close();
        }
      }}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        clearHoverTimer();
        hoverTimer.current = setTimeout(() => setOpen(true), hoverDelay);
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        close();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        close();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.pointerType === "mouse" || event.button !== 0) return;
        clearLongPressTimer();
        longPressTimer.current = setTimeout(() => setOpen(true), longPressDelay);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        close();
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        clearLongPressTimer();
        if (event.pointerType !== "mouse") {
          setOpen(false);
        }
      }}
      onTouchCancel={(event) => {
        onTouchCancel?.(event);
        close();
      }}
      onTouchEnd={(event) => {
        onTouchEnd?.(event);
        close();
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        clearLongPressTimer();
        longPressTimer.current = setTimeout(() => setOpen(true), longPressDelay);
      }}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-max max-w-60 -translate-x-1/2 rounded-md border border-white/10 bg-[#111827] px-3 py-2 text-left text-xs leading-relaxed text-white shadow-xl shadow-black/30",
            "after:absolute after:left-1/2 after:top-full after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-b after:border-r after:border-white/10 after:bg-[#111827]",
            tooltipClassName,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
