import { render, screen } from '@testing-library/react';
import { TallyBar } from '../TallyBar';
import { TallySide } from '@/types/disputes';

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
});
