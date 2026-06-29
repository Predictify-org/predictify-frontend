import { render, screen, waitFor } from '@testing-library/react';
import { TallyBar } from '../TallyBar';
import { TallySide } from '@/types/disputes';

const matchMediaMock = jest.fn();

beforeEach(() => {
  matchMediaMock.mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  window.matchMedia = matchMediaMock as typeof window.matchMedia;
});

const makeSide = (label: string, amount: number, percentage: number): TallySide => ({
  label,
  amount,
  percentage,
});

describe('TallyBar', () => {
  describe('normal rendering', () => {
    it('renders both side labels', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      render(<TallyBar tally={tally} />);
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('renders percentage labels', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      render(<TallyBar tally={tally} />);
      expect(screen.getByText('60.0%')).toBeInTheDocument();
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });

    it('sets correct flex widths on bar segments', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 70), makeSide('No', 214, 30)];
      const { container } = render(<TallyBar tally={tally} />);
      const segments = container.querySelectorAll('[style]');
      expect((segments[0] as HTMLElement).style.width).toBe('70%');
      expect((segments[1] as HTMLElement).style.width).toBe('30%');
    });
  });

  describe('normalisation', () => {
    it('normalises when percentages sum > 100', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 600, 80), makeSide('No', 400, 60)];
      render(<TallyBar tally={tally} />);
      expect(screen.getByText('57.1%')).toBeInTheDocument();
      expect(screen.getByText('42.9%')).toBeInTheDocument();
    });

    it('normalises when percentages sum < 100', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 300, 30), makeSide('No', 200, 20)];
      render(<TallyBar tally={tally} />);
      expect(screen.getByText('60.0%')).toBeInTheDocument();
      expect(screen.getByText('40.0%')).toBeInTheDocument();
    });

    it('splits 50/50 when both percentages are 0', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 0, 0), makeSide('No', 0, 0)];
      render(<TallyBar tally={tally} />);
      expect(screen.getAllByText('50.0%')).toHaveLength(2);
    });

    it('normalised segments sum to 100', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 100, 33), makeSide('No', 67, 67)];
      const { container } = render(<TallyBar tally={tally} />);
      const segments = container.querySelectorAll('[style]');
      const left = parseFloat((segments[0] as HTMLElement).style.width);
      const right = parseFloat((segments[1] as HTMLElement).style.width);
      expect(left + right).toBeCloseTo(100, 5);
    });
  });

  describe('showAmounts prop', () => {
    it('hides token amounts by default', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 1234, 60), makeSide('No', 822, 40)];
      render(<TallyBar tally={tally} />);
      expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
    });

    it('shows token amounts when showAmounts is true', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 1234, 60), makeSide('No', 822, 40)];
      render(<TallyBar tally={tally} showAmounts />);
      expect(screen.getByText('1,234 tokens')).toBeInTheDocument();
      expect(screen.getByText('822 tokens')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('exposes the bar with role="img" and an aria-label describing both sides', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      render(<TallyBar tally={tally} />);
      const bar = screen.getByRole('img');
      const label = bar.getAttribute('aria-label') ?? '';
      expect(label).toMatch(/Yes/);
      expect(label).toMatch(/60\.0/);
      expect(label).toMatch(/No/);
      expect(label).toMatch(/40\.0/);
    });

    it('renders a polite live region that announces the final tally (not animated intermediates)', async () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      const { rerender } = render(<TallyBar tally={tally} showAmounts />);

      // LiveRegion has a 50 ms dedup delay before the message appears.
      await waitFor(() => {
        const liveRegion = screen.getByText(/Yes: 60\.0 percent, 500 tokens/);
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveAttribute('role', 'status');
      });

      rerender(<TallyBar tally={[makeSide('Yes', 700, 70), makeSide('No', 300, 30)]} showAmounts />);

      await waitFor(() => {
        const liveRegion = screen.getByText(/Yes: 70\.0 percent, 700 tokens/);
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('announces final values on mount, not mid-animation values', async () => {
      // Even with a large delta that would animate, the aria-live region
      // should announce the target values right away using final prop data.
      const tally: [TallySide, TallySide] = [makeSide('Yes', 9999, 85), makeSide('No', 1765, 15)];
      render(<TallyBar tally={tally} showAmounts />);

      await waitFor(() => {
        // The live region should contain the final target values even
        // while the visual numbers are still counting up.
        const liveRegion = screen.getByText(/Yes: 85\.0 percent, 9,999 tokens/);
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('count-up animation settles at target values within the animation duration', async () => {
      // The visual labels animate from 0 to the target, settling at
      // the final value after the 400 ms animation completes.
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      render(<TallyBar tally={tally} />);

      await waitFor(
        () => {
          expect(screen.getByText('60.0%')).toBeInTheDocument();
          expect(screen.getByText('40.0%')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('uses the finalized values immediately when reduced motion is preferred', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      render(<TallyBar tally={tally} showAmounts />);

      expect(screen.getByText('60.0%')).toBeInTheDocument();
      expect(screen.getByText('500 tokens')).toBeInTheDocument();
    });

    it('supports negative deltas without breaking the bar', async () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      const { rerender } = render(<TallyBar tally={tally} showAmounts />);

      rerender(<TallyBar tally={[makeSide('Yes', 300, 30), makeSide('No', 700, 70)]} showAmounts />);

      await waitFor(() => {
        expect(screen.getByText('30.0%')).toBeInTheDocument();
        expect(screen.getByText('70.0%')).toBeInTheDocument();
      });
    });

    it('handles a zero baseline by rendering a stable 50/50 split', async () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 0, 0), makeSide('No', 0, 0)];
      const { rerender } = render(<TallyBar tally={tally} showAmounts />);

      rerender(<TallyBar tally={[makeSide('Yes', 0, 0), makeSide('No', 0, 0)]} showAmounts />);

      await waitFor(() => {
        expect(screen.getAllByText('50.0%')).toHaveLength(2);
      });
    });

    it('includes token amounts in the aria-label when showAmounts is true', () => {
      const tally: [TallySide, TallySide] = [
        makeSide('Yes', 1234, 60),
        makeSide('No', 822, 40),
      ];
      render(<TallyBar tally={tally} showAmounts />);
      const bar = screen.getByRole('img');
      const label = bar.getAttribute('aria-label') ?? '';
      expect(label).toMatch(/1,234 tokens/);
      expect(label).toMatch(/822 tokens/);
    });

    it('uses colorblind-safe chart-* token classes, not bare red/green colors', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 60), makeSide('No', 333, 40)];
      const { container } = render(<TallyBar tally={tally} />);
      const segments = container.querySelectorAll('[style]');
      // Both segments should use chart-* tokens; neither should rely on bare red/green.
      expect((segments[0] as HTMLElement).className).toMatch(/bg-chart-1/);
      expect((segments[1] as HTMLElement).className).toMatch(/bg-chart-2/);
      expect((segments[0] as HTMLElement).className).not.toMatch(/bg-(red|green|rose|emerald)-/);
      expect((segments[1] as HTMLElement).className).not.toMatch(/bg-(red|green|rose|emerald)-/);
    });
  });

  describe('tie tallies', () => {
    it('renders 50/50 widths when both sides have equal nonzero amounts', () => {
      const tally: [TallySide, TallySide] = [makeSide('Yes', 500, 50), makeSide('No', 500, 50)];
      const { container } = render(<TallyBar tally={tally} />);
      const segments = container.querySelectorAll('[style]');
      expect((segments[0] as HTMLElement).style.width).toBe('50%');
      expect((segments[1] as HTMLElement).style.width).toBe('50%');
      expect(screen.getAllByText('50.0%')).toHaveLength(2);
    });
  });
});
