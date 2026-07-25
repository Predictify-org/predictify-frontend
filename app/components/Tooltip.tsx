"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/**
 * Tooltip Component
 *
 * A reusable, accessible tooltip that displays supplementary information on hover,
 * focus, or long-press. Built on Radix UI's tooltip primitive with added hover delay
 * and touch support.
 *
 * ## Accessibility (WCAG 2.1 AA Compliant)
 *
 * - **Keyboard Navigation**: Trigger is focusable. Tooltip shows on focus and hides on blur.
 * - **Escape Key**: Dismisses the tooltip when open.
 * - **ARIA**: Follows WAI-ARIA tooltip pattern. Radix UI provides:
 *   - `role="tooltip"` on the tooltip container
 *   - `aria-describedby` linking trigger to tooltip
 *   - Proper show/hide semantics for assistive technology
 * - **Focus Management**: Focus never trapped. Tooltip dismisses cleanly without focus loss.
 * - **Touch Support**: Long-press (600ms) shows tooltip on touch devices for mobile users.
 * - **Color Contrast**: Uses design tokens with WCAG 2.1 AA compliant contrast (4.5:1) in both light and dark modes.
 *
 * ## Props
 *
 * @param content - The tooltip content to display (string or React node)
 * @param children - The trigger element that activates the tooltip
 * @param delay - Hover delay in milliseconds before showing the tooltip (default: 300ms)
 * @param placement - Tooltip position relative to trigger: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @param disabled - If true, prevents the tooltip from appearing (default: false)
 *
 * ## Usage
 *
 * ```tsx
 * <Tooltip content="This explains the feature">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 *
 * ## Security Note
 *
 * The `content` prop accepts React.ReactNode. If you need to pass user-generated HTML content,
 * you must sanitize it before passing to this component. This component does not perform
 * sanitization internally.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 */

export interface TooltipProps {
  /** Tooltip text or rich content */
  content: React.ReactNode;
  /** The trigger element */
  children: React.ReactElement;
  /** Hover delay in milliseconds (default: 300ms) */
  delay?: number;
  /** Tooltip placement (default: 'top') */
  placement?: "top" | "bottom" | "left" | "right";
  /** Suppress tooltip without removing trigger (default: false) */
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  delay = 300,
  placement = "top",
  disabled = false,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Don't render tooltip if disabled
  if (disabled) {
    return children;
  }

  /**
   * Hover delay handler: show tooltip after continuous hover
   */
  const handlePointerEnter = (event: React.PointerEvent) => {
    // Only apply hover delay for mouse events, not touch
    if (event.pointerType === "mouse") {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = setTimeout(() => {
        setOpen(true);
      }, delay);
    }
  };

  /**
   * Cancel hover delay if pointer leaves before delay fires
   */
  const handlePointerLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setOpen(false);
  };

  /**
   * Long-press handler for touch devices (600ms)
   */
  const handlePointerDown = (event: React.PointerEvent) => {
    // Only handle touch/pen events for long-press
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = setTimeout(() => {
        setOpen(true);
      }, 600); // Long-press duration: 600ms
    }
  };

  /**
   * Cancel long-press or hide tooltip on pointer up
   */
  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Hide tooltip after long-press completes
    setOpen(false);
  };

  /**
   * Show tooltip on focus (keyboard navigation)
   */
  const handleFocus = () => {
    setOpen(true);
  };

  /**
   * Hide tooltip on blur (keyboard navigation)
   */
  const handleBlur = () => {
    setOpen(false);
  };

  // Map placement prop to Radix UI's side prop
  const sideMap = {
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
  } as const;

  return (
    <TooltipPrimitive.Provider delayDuration={0} skipDelayDuration={0}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger
          asChild
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={sideMap[placement]}
            sideOffset={4}
            className={cn(
              "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
