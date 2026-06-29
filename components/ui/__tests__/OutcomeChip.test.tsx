import React from 'react';
import { render, screen } from '@testing-library/react';
import { OutcomeChip } from '../OutcomeChip';
import '@testing-library/jest-dom';

describe('OutcomeChip', () => {
  describe('rendering', () => {
    it('renders the children text', () => {
      render(<OutcomeChip>Yes</OutcomeChip>);
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('renders with complex children', () => {
      render(<OutcomeChip><span>No</span></OutcomeChip>);
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  describe('variant mapping', () => {
    it('applies bg-chart-1 and pattern-diagonal for positive variant', () => {
      const { container } = render(<OutcomeChip variant="positive">Won</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-1/);
      expect(chip.className).toMatch(/pattern-diagonal/);
    });

    it('applies bg-chart-2 and pattern-dots for negative variant', () => {
      const { container } = render(<OutcomeChip variant="negative">Lost</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-2/);
      expect(chip.className).toMatch(/pattern-dots/);
    });

    it('applies bg-chart-3 and pattern-crosshatch for neutral variant', () => {
      const { container } = render(<OutcomeChip variant="neutral">Pending</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-3/);
      expect(chip.className).toMatch(/pattern-crosshatch/);
    });

    it('applies bg-chart-4 and pattern-horizontal for tie variant', () => {
      const { container } = render(<OutcomeChip variant="tie">Tied</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-4/);
      expect(chip.className).toMatch(/pattern-horizontal/);
    });

    it('applies bg-chart-5 and pattern-vertical for dispute variant', () => {
      const { container } = render(<OutcomeChip variant="dispute">Disputed</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-5/);
      expect(chip.className).toMatch(/pattern-vertical/);
    });

    it('defaults to neutral variant when no variant is given', () => {
      const { container } = render(<OutcomeChip>Default</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-3/);
      expect(chip.className).toMatch(/pattern-crosshatch/);
    });
  });

  describe('custom overrides', () => {
    it('uses chartClass override instead of variant default', () => {
      const { container } = render(
        <OutcomeChip variant="positive" chartClass="bg-chart-4">Custom</OutcomeChip>,
      );
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/bg-chart-4/);
      expect(chip.className).not.toMatch(/bg-chart-1/);
    });

    it('uses patternClass override instead of variant default', () => {
      const { container } = render(
        <OutcomeChip variant="positive" patternClass="pattern-dots">Custom</OutcomeChip>,
      );
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/pattern-dots/);
      expect(chip.className).not.toMatch(/pattern-diagonal/);
    });
  });

  describe('color-blind safety', () => {
    it('does not use bare red/green color classes', () => {
      const variants = ['positive', 'negative', 'neutral', 'tie', 'dispute'] as const;
      for (const variant of variants) {
        const { container } = render(<OutcomeChip variant={variant}>{variant}</OutcomeChip>);
        const chip = container.firstChild as HTMLElement;
        expect(chip.className).not.toMatch(/bg-(red|green|rose|emerald)-/);
      }
    });

    it('has a chart token class on every variant', () => {
      const variants = ['positive', 'negative', 'neutral', 'tie', 'dispute'] as const;
      for (const variant of variants) {
        const { container } = render(<OutcomeChip variant={variant}>{variant}</OutcomeChip>);
        const chip = container.firstChild as HTMLElement;
        expect(chip.className).toMatch(/bg-chart-/);
      }
    });

    it('has a pattern class on every variant', () => {
      const variants = ['positive', 'negative', 'neutral', 'tie', 'dispute'] as const;
      for (const variant of variants) {
        const { container } = render(<OutcomeChip variant={variant}>{variant}</OutcomeChip>);
        const chip = container.firstChild as HTMLElement;
        expect(chip.className).toMatch(/pattern-/);
      }
    });
  });

  describe('accessibility', () => {
    it('sets aria-label to children text by default', () => {
      render(<OutcomeChip>Yes</OutcomeChip>);
      expect(screen.getByLabelText('Yes')).toBeInTheDocument();
    });

    it('uses the provided ariaLabel prop', () => {
      render(<OutcomeChip ariaLabel="Outcome: Yes">Yes</OutcomeChip>);
      expect(screen.getByLabelText('Outcome: Yes')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies additional className', () => {
      const { container } = render(
        <OutcomeChip className="extra-class">Styled</OutcomeChip>,
      );
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/extra-class/);
    });

    it('always has text-white class for contrast', () => {
      const { container } = render(<OutcomeChip>Contrast</OutcomeChip>);
      const chip = container.firstChild as HTMLElement;
      expect(chip.className).toMatch(/text-white/);
    });
  });

  describe('WCAG-AA contrast', () => {
    it('has font-semibold to boost effective contrast for small badge text', () => {
      const variants = ['positive', 'negative', 'neutral', 'tie', 'dispute'] as const;
      for (const variant of variants) {
        const { container } = render(<OutcomeChip variant={variant}>{variant}</OutcomeChip>);
        const chip = container.firstChild as HTMLElement;
        // font-semibold is required alongside darkened chart tokens to ensure
        // ≥4.5:1 contrast ratio for normal-weight text (WCAG 2.1 AA SC 1.4.3)
        expect(chip.className).toMatch(/font-semibold/);
      }
    });

    it('exposes role="img" so screen readers announce the chip as an image with label', () => {
      render(<OutcomeChip variant="positive" ariaLabel="Outcome: Won">Won</OutcomeChip>);
      expect(screen.getByRole('img', { name: 'Outcome: Won' })).toBeInTheDocument();
    });

    it('falls back aria-label to string children when ariaLabel is omitted', () => {
      render(<OutcomeChip variant="negative">Lost</OutcomeChip>);
      expect(screen.getByRole('img', { name: 'Lost' })).toBeInTheDocument();
    });

    it('does not rely on color alone — every variant carries a pattern class', () => {
      // Verifies SC 1.4.1 (Use of Color) by asserting a non-color differentiator exists
      const variants = ['positive', 'negative', 'neutral', 'tie', 'dispute'] as const;
      for (const variant of variants) {
        const { container } = render(<OutcomeChip variant={variant}>{variant}</OutcomeChip>);
        const chip = container.firstChild as HTMLElement;
        expect(chip.className).toMatch(/pattern-/);
      }
    });
  });
});
