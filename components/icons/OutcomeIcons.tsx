/*
 * OutcomeIcons
 *
 * Color-blind safe shape-based icons for prediction outcome tiles.
 * Shapes are distinguishable under Deuteranopia and Tritanopia simulations
 * because differentiation is based on geometry, not hue alone.
 *
 * Palette  Shape mapping (also documented in app/design-system/tokens.md):
 *   "positive" / "yes" / index 0    TriangleUp
 *   "negative" / "no"  / index 1  ¦  TriangleDown
 *   "neutral"  / third / index 2    Diamond
 *
 * Usage:
 *   <OutcomeIcon variant="positive" aria-hidden />
 *   <OutcomeIcon variant={getVariantByIndex(i)} className="text-chart-1" />
 *
 * Accessibility:
 *   - Shapes are the primary non-color differentiator (WCAG 1.4.1).
 *   - Icons are decorative by default and are hidden from assistive
 *     technology; include adjacent text for meaning.
 *   - For standalone icon usage, provide either a "title", "aria-label",
 *     or "aria-labelledby" to expose an accessible name.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type OutcomeVariant = 'positive' | 'yes' | 'negative' | 'no' | 'neutral' | 'third' | 0 | 1 | 2;

export function getVariantByIndex(index: number): OutcomeVariant {
  const variants: OutcomeVariant[] = ['positive', 'negative', 'neutral'];
  return variants[index] ?? 'neutral';
}

interface OutcomeIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'variant'> {
  variant: OutcomeVariant;
}

export function OutcomeIcon({ variant, className, ...props }: OutcomeIconProps): JSX.Element {
  let shape: JSX.Element;
  const normalized = variant.toString();

  if (normalized === 'positive' || normalized === 'yes' || normalized === '0') {
    shape = (
      <path
        d="M12 5l7 14H5l7-14z"
        fill="currentColor"
      />
    );
  } else if (normalized === 'negative' || normalized === 'no' || normalized === '1') {
    shape = (
      <path
        d="M12 19L6 5h14l-7 14z"
        fill="currentColor"
      />
    );
  } else {
    // neutral / third / 2
    shape = (
      <path
        d="M12 4l8 8-8 8-8-8 8-8z"
        fill="currentColor"
      />
    );
  }

  const hasAccessibleName = Boolean(props['aria-label'] || props['aria-labelledby'] || props.title);

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden={!hasAccessibleName}
      role={hasAccessibleName ? 'img' : undefined}
      className={cn('h-4 w-4', className)}
      {...props}
    >
      {shape}
    </svg>
  );
}