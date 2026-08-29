/*
 * OutcomeIcons
 *
 * Color-blind safe shape-based icons for prediction outcome tiles.
 * Shapes are distinguishable under Deuteranopia and Tritanopia simulations
 * because differentiation is based on geometry, not hue alone.
*
 * Palette ? Shape mapping (also documented in app/design-system/tokens.md):
 *   "positive" / "yes" / index 0  ?  TriangleUp
 *   "negative" / "no"  / index 1  ?  TriangleDown
 *   "neutral"  / third / index 2  ?  Diamond
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
 *     or "aria-labelledby" to expose an accessible name. When "title" is
 *     used, it is rendered as an SVG <title> child for reliable
 *     screen-reader support.
 *   - getVariantLabel(variant) returns a human-readable label that can be
 *     passed to aria-label for standalone icons.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type OutcomeVariant =
  | 'positive'
  | 'yes'
  | 'negative'
  | 'no'
  | 'neutral'
  | 'third'
  | 0
  | 1
  | 2;

type NormalizedVariant = 'positive' | 'negative' | 'neutral';

const VARIANT_MAP: Record<string, NormalizedVariant> = {
  positive: 'positive',
  yes: 'positive',
  '0': 'positive',
  negative: 'negative',
  no: 'negative',
  '1': 'negative',
  neutral: 'neutral',
  third: 'neutral',
  '2': 'neutral',
};

export function getVariantByIndex(index: number): OutcomeVariant {
  const variants: OutcomeVariant[] = ['positive', 'negative', 'neutral'];
  return variants[index] ?? 'neutral';
}

export function getVariantLabel(variant: OutcomeVariant): string {
  switch (normalizeVariant(variant)) {
    case 'positive':
      return 'Positive outcome';
    case 'negative':
      return 'Negative outcome';
    case 'neutral':
      return 'Neutral outcome';
    default:
      // normalizeVariant always returns a known variant; this satisfies
      // exhaustive checking.
      return 'Neutral outcome';
  }
}

function normalizeVariant(variant: OutcomeVariant): NormalizedVariant {
  const key = variant.toString();
  return VARIANT_MAP[key] ?? 'neutral';
}

interface OutcomeIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'variant'> {
  variant: OutcomeVariant;
}

export function OutcomeIcon({
  variant,
  className,
  ...props
}: OutcomeIconProps): JSX.Element {
  const { title, ...restProps } = props;
  const titleText = typeof title === 'string' && title.length > 0 ? title : undefined;
  const hasAccessibleName = Boolean(
    restProps['aria-label'] || restProps['aria-labelledby'] || titleText,
  );
  const normalized = normalizeVariant(variant);
  let shape: JSX.Element;

  switch (normalized) {
    case 'positive':
      shape = <path d="M12 5l7 14H5l7-14z" fill="currentColor" />;
      break;
    case 'negative':
      shape = <path d="M12 19L6 5h14l-7 14z" fill="currentColor" />;
      break;
    case 'neutral':
      shape = <path d="M12 4l8 8-8 8-8-8 8-8z" fill="currentColor" />;
      break;
  }

  return (
    <svg
      {...restProps}
      viewBox="0 0 24 24"
      aria-hidden={!hasAccessibleName}
      role={hasAccessibleName ? 'img' : undefined}
      className={cn('h-4 w-4', className)}
      focusable={restProps.focusable ?? false}
      data-variant={normalized}
    >
      {titleText && !restProps['aria-label'] && !restProps['aria-labelledby'] && (
        <title>{titleText}</title>
      )}
      {shape}
    </svg>
  );
}