/**
 * OutcomeIcons
 *
 * Color-blind safe shape-based icons for prediction outcome tiles.
 * Shapes are distinguishable under Deuteranopia and Tritanopia simulations
 * because differentiation is based on geometry, not hue alone.
 *
 * Palette  →  Shape mapping (also documented in app/design-system/tokens.md):
 *   "positive" / "yes" / index 0  →  TriangleUp   (▲)
 *   "negative" / "no"  / index 1  →  TriangleDown (▽)
 *   "neutral"  / third / index 2  →  Diamond      (◇)
 *
 * Usage:
 *   <OutcomeIcon variant="positive" aria-hidden />
 *   <OutcomeIcon variant={getVariantByIndex(i)} className="text-chart-1" />
 *
 * Accessibility:
 *   - Always render with aria-hidden="true"; the adjacent text label is the
 *     primary accessible name (WCAG 2.1 AA 1.4.1 Use of Color).
 *   - Optionally supply a `title` for standalone icon usage.
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ─── Variant definitions ────────────────────────────────────────────────────

export type OutcomeVariant = 'positive' | 'negative' | 'neutral';

/**
 * Map a zero-based tally index to a semantic OutcomeVariant.
 * Index 0 → positive, 1 → negative, 2+ → neutral.
 */
export function getVariantByIndex(index: number): OutcomeVariant {
  if (index === 0) return 'positive';
  if (index === 1) return 'negative';
  return 'neutral';
}

// ─── Icon components ─────────────────────────────────────────────────────────

interface SVGIconProps extends React.SVGProps<SVGSVGElement> {
  /** Accessible title for standalone (non-aria-hidden) usage */
  title?: string;
  className?: string;
}

/**
 * TriangleUpIcon — represents a positive / "Yes" / first outcome.
 * Shape: solid upward-pointing triangle (▲).
 */
export function TriangleUpIcon({ title, className, ...props }: SVGIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('h-3.5 w-3.5 shrink-0', className)}
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      {/* Equilateral triangle pointing up */}
      <polygon points="8,2 15,14 1,14" />
    </svg>
  );
}

/**
 * TriangleDownIcon — represents a negative / "No" / second outcome.
 * Shape: solid downward-pointing triangle (▽).
 */
export function TriangleDownIcon({ title, className, ...props }: SVGIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('h-3.5 w-3.5 shrink-0', className)}
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      {/* Equilateral triangle pointing down */}
      <polygon points="8,14 15,2 1,2" />
    </svg>
  );
}

/**
 * DiamondIcon — represents a neutral / third outcome.
 * Shape: solid diamond / rhombus (◇).
 */
export function DiamondIcon({ title, className, ...props }: SVGIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn('h-3.5 w-3.5 shrink-0', className)}
      focusable="false"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      {/* Diamond / rhombus */}
      <polygon points="8,1 15,8 8,15 1,8" />
    </svg>
  );
}

// ─── Unified OutcomeIcon ──────────────────────────────────────────────────────

interface OutcomeIconProps extends SVGIconProps {
  /** Semantic outcome variant that determines the shape rendered */
  variant: OutcomeVariant;
}

/**
 * OutcomeIcon — a single component that renders the correct shape for a
 * given outcome variant. Prefer this over using TriangleUpIcon et al. directly
 * so variant-to-shape logic stays in one place.
 *
 * @example
 *   <OutcomeIcon variant="positive" aria-hidden className="text-chart-1" />
 *   <OutcomeIcon variant="negative" aria-hidden className="text-chart-2" />
 *   <OutcomeIcon variant="neutral"  aria-hidden className="text-chart-3" />
 */
export function OutcomeIcon({ variant, ...rest }: OutcomeIconProps) {
  switch (variant) {
    case 'positive':
      return <TriangleUpIcon {...rest} />;
    case 'negative':
      return <TriangleDownIcon {...rest} />;
    case 'neutral':
      return <DiamondIcon {...rest} />;
  }
}

// ─── Outcome variant helpers ──────────────────────────────────────────────────

/**
 * Tailwind color-token class for each outcome variant.
 * These reference chart-* tokens so colors are theme-aware and not bare
 * hue names, satisfying WCAG 2.1 AA 1.4.1 (Use of Color).
 */
export const OUTCOME_COLOR_CLASS: Record<OutcomeVariant, string> = {
  positive: 'text-chart-1',
  negative: 'text-chart-2',
  neutral: 'text-chart-3',
};
