"use client";

import * as React from "react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

/**
 * PreviewCard — A hover-triggered preview card for OutcomeChip.
 *
 * Uses Radix HoverCard under the hood for accessible, keyboard-friendly
 * hover interactions. The preview displays outcome details (label, variant
 * color, badge, selection state) so users can quickly inspect an outcome
 * without committing to a selection.
 *
 * ## Accessibility
 * - Radix HoverCard provides full keyboard support (Tab to focus, then
 *   hover card opens on focus and closes on blur).
 * - `openDelay` (300ms) prevents accidental triggers during fast mouse
 *   movement; `closeDelay` (150ms) prevents flicker.
 * - The preview card content is rendered with polite `aria-live` via
 *   Radix's built-in tooltip semantics.
 * - Respects `prefers-reduced-motion`: the card's fade-in animation is
 *   disabled automatically via the `motion-safe:` prefix on the shadcn
 *   HoverCardContent classes.
 *
 * @example
 * ```tsx
 * <PreviewCard label="Yes" variant="yes" badge="62%" selected={false}>
 *   <OutcomeChip label="Yes" variant="yes" badge="62%" />
 * </PreviewCard>
 * ```
 */
export interface PreviewCardProps {
  /** The outcome label shown in the preview header */
  label: string;
  /** Visual variant driving the color indicator dot */
  variant: "yes" | "no" | "neutral";
  /** Optional badge/odds text shown in the preview */
  badge?: string;
  /** Whether the outcome is currently selected */
  selected?: boolean;
  /** The trigger element (typically an OutcomeChip) */
  children: React.ReactNode;
}

const variantColorMap: Record<string, string> = {
  yes: "bg-green-500",
  no: "bg-red-500",
  neutral: "bg-muted-foreground",
};

export function PreviewCard({ label, variant, badge, selected, children }: PreviewCardProps) {
  return (
    <HoverCard openDelay={300} closeDelay={150}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        className="w-72"
      >
        <div className="space-y-3">
          {/* ── Header: label + variant indicator ──────── */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug text-foreground">
              {label}
            </p>
            <span
              className={cn(
                "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                variantColorMap[variant],
              )}
              aria-hidden="true"
            />
          </div>

          {/* ── Details row: variant name + badge ──────── */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider">Type</span>
              <span className="font-medium capitalize">{variant}</span>
            </span>
            {badge && (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider">Odds</span>
                <span className="font-medium tabular-nums">{badge}</span>
              </span>
            )}
          </div>

          {/* ── Selection status ───────────────────────── */}
          {selected && (
            <p className="text-xs font-medium text-primary">
              Currently selected
            </p>
          )}

          {/* ── Keyboard hint ──────────────────────────── */}
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Use Tab to focus, then hover or press Enter to preview.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export default PreviewCard;