/**
 * @jest-environment jsdom
 *
 * Tests for components/icons/OutcomeIcons.tsx
 *
 * Coverage:
 *  - Individual icon components render correct SVG polygons
 *  - OutcomeIcon delegates to the correct icon per variant
 *  - getVariantByIndex maps indices correctly (including > 1 edge cases)
 *  - OUTCOME_COLOR_CLASS contains the expected chart-* token names
 *  - Accessibility: aria-hidden is applied; title renders for standalone use
 *  - Long outcome name resilience (text truncation — visual contract)
 *  - Three-way market support via getVariantByIndex(2) → "neutral"
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  OutcomeIcon,
  TriangleUpIcon,
  TriangleDownIcon,
  DiamondIcon,
  getVariantByIndex,
  OUTCOME_COLOR_CLASS,
} from '../OutcomeIcons';
import type { OutcomeVariant } from '../OutcomeIcons';

// ─── getVariantByIndex ────────────────────────────────────────────────────────

describe('getVariantByIndex', () => {
  it('maps index 0 to "positive"', () => {
    expect(getVariantByIndex(0)).toBe('positive');
  });

  it('maps index 1 to "negative"', () => {
    expect(getVariantByIndex(1)).toBe('negative');
  });

  it('maps index 2 to "neutral" (three-way market support)', () => {
    expect(getVariantByIndex(2)).toBe('neutral');
  });

  it('maps any index > 1 to "neutral"', () => {
    expect(getVariantByIndex(3)).toBe('neutral');
    expect(getVariantByIndex(99)).toBe('neutral');
  });
});

// ─── OUTCOME_COLOR_CLASS ──────────────────────────────────────────────────────

describe('OUTCOME_COLOR_CLASS', () => {
  it('uses chart-* token classes, not bare hue names', () => {
    const classes = Object.values(OUTCOME_COLOR_CLASS);
    classes.forEach((cls) => {
      expect(cls).toMatch(/^text-chart-\d+$/);
      // Must not use raw color names that would rely on hue alone
      expect(cls).not.toMatch(/text-(red|green|blue|yellow|rose|emerald)-/);
    });
  });

  it('has an entry for every OutcomeVariant', () => {
    const variants: OutcomeVariant[] = ['positive', 'negative', 'neutral'];
    variants.forEach((v) => {
      expect(OUTCOME_COLOR_CLASS[v]).toBeTruthy();
    });
  });
});

// ─── Individual icon shape correctness ───────────────────────────────────────

describe('TriangleUpIcon', () => {
  it('renders an SVG with a polygon element', () => {
    const { container } = render(<TriangleUpIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('is aria-hidden by default (no title)', () => {
    const { container } = render(<TriangleUpIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders an accessible title when provided', () => {
    render(<TriangleUpIcon title="Positive outcome" />);
    expect(screen.getByTitle('Positive outcome')).toBeInTheDocument();
  });

  it('accepts and applies a custom className', () => {
    const { container } = render(<TriangleUpIcon className="text-chart-1" />);
    expect(container.querySelector('svg')).toHaveClass('text-chart-1');
  });
});

describe('TriangleDownIcon', () => {
  it('renders an SVG with a polygon element', () => {
    const { container } = render(<TriangleDownIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('is aria-hidden by default', () => {
    const { container } = render(<TriangleDownIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('DiamondIcon', () => {
  it('renders an SVG with a polygon element', () => {
    const { container } = render(<DiamondIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });

  it('is aria-hidden by default', () => {
    const { container } = render(<DiamondIcon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

// ─── OutcomeIcon dispatch ─────────────────────────────────────────────────────

describe('OutcomeIcon', () => {
  it('renders a polygon (SVG shape) for every variant', () => {
    const variants: OutcomeVariant[] = ['positive', 'negative', 'neutral'];
    variants.forEach((variant) => {
      const { container, unmount } = render(<OutcomeIcon variant={variant} />);
      expect(container.querySelector('polygon')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders TriangleUp (upward polygon points) for "positive"', () => {
    const { container } = render(<OutcomeIcon variant="positive" />);
    const polygon = container.querySelector('polygon');
    // The TriangleUpIcon polygon has its apex at the top (y=2) and base at y=14
    expect(polygon?.getAttribute('points')).toBe('8,2 15,14 1,14');
  });

  it('renders TriangleDown (downward polygon points) for "negative"', () => {
    const { container } = render(<OutcomeIcon variant="negative" />);
    const polygon = container.querySelector('polygon');
    // The TriangleDownIcon polygon has its apex at the bottom (y=14) and base at y=2
    expect(polygon?.getAttribute('points')).toBe('8,14 15,2 1,2');
  });

  it('renders Diamond (4-point polygon) for "neutral"', () => {
    const { container } = render(<OutcomeIcon variant="neutral" />);
    const polygon = container.querySelector('polygon');
    expect(polygon?.getAttribute('points')).toBe('8,1 15,8 8,15 1,8');
  });

  it('forwards aria-hidden to the underlying SVG', () => {
    const { container } = render(<OutcomeIcon variant="positive" aria-hidden />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards custom className to the underlying SVG', () => {
    const { container } = render(<OutcomeIcon variant="negative" className="text-chart-2" />);
    expect(container.querySelector('svg')).toHaveClass('text-chart-2');
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('Accessibility', () => {
  it('icon is aria-hidden when used alongside a text label (default)', () => {
    const { container } = render(
      <span>
        <OutcomeIcon variant="positive" aria-hidden />
        Won
      </span>
    );
    // The adjacent text "Won" is the accessible name; the icon must be hidden.
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Won')).toBeInTheDocument();
  });

  it('renders with role="img" and visible title for standalone usage', () => {
    render(<OutcomeIcon variant="positive" title="Positive outcome" />);
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
    expect(screen.getByTitle('Positive outcome')).toBeInTheDocument();
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('does not throw when rendered without any props except variant', () => {
    expect(() => render(<OutcomeIcon variant="neutral" />)).not.toThrow();
  });

  it('renders correctly alongside a very long outcome label', () => {
    const longLabel = 'A'.repeat(200);
    render(
      <span>
        <OutcomeIcon variant="positive" aria-hidden />
        {longLabel}
      </span>
    );
    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });

  it('supports all three variants for three-way markets', () => {
    // Markets with three outcomes (index 0, 1, 2)
    const variants = [0, 1, 2].map(getVariantByIndex);
    expect(variants).toEqual(['positive', 'negative', 'neutral']);

    variants.forEach((variant, index) => {
      const { container, unmount } = render(<OutcomeIcon variant={variant} aria-hidden />);
      expect(container.querySelector('polygon')).toBeInTheDocument();
      unmount();
    });
  });
});
