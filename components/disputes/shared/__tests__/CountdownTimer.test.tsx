import { render, screen, act } from '@testing-library/react';
import { CountdownTimer } from '../CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('valid future deadline', () => {
    it('displays days, hours, minutes, seconds in "Xd Xh Xm Xs" format', () => {
      // 2 days, 3 hours, 4 minutes, 5 seconds from now
      const deadline = new Date(Date.now() + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
      render(<CountdownTimer deadline={deadline} />);
      expect(screen.getByText('2d 3h 4m 5s')).toBeInTheDocument();
    });

    it('renders the label above the countdown when provided', () => {
      const deadline = new Date(Date.now() + 48 * 3600 * 1000);
      render(<CountdownTimer deadline={deadline} label="Staking deadline" />);
      expect(screen.getByText('Staking deadline')).toBeInTheDocument();
    });

    it('does not render label when not provided', () => {
      const deadline = new Date(Date.now() + 48 * 3600 * 1000);
      const { container } = render(<CountdownTimer deadline={deadline} />);
      // Only one element: the countdown span
      const spans = container.querySelectorAll('span');
      expect(spans).toHaveLength(1);
    });
  });

  describe('urgency styling (< 24h remaining)', () => {
    it('applies text-destructive and animate-pulse when less than 24h remain', () => {
      // 23 hours, 59 minutes, 59 seconds from now
      const deadline = new Date(Date.now() + (23 * 3600 + 59 * 60 + 59) * 1000);
      render(<CountdownTimer deadline={deadline} />);
      const countdownEl = screen.getByText(/\d+d \d+h \d+m \d+s/);
      expect(countdownEl).toHaveClass('text-destructive');
      expect(countdownEl).toHaveClass('animate-pulse');
    });

    it('does NOT apply urgency classes when 24h or more remain', () => {
      // Exactly 24 hours from now
      const deadline = new Date(Date.now() + 24 * 3600 * 1000);
      render(<CountdownTimer deadline={deadline} />);
      const countdownEl = screen.getByText(/\d+d \d+h \d+m \d+s/);
      expect(countdownEl).not.toHaveClass('text-destructive');
      expect(countdownEl).not.toHaveClass('animate-pulse');
    });

    it('applies urgency classes at exactly 1 second remaining', () => {
      const deadline = new Date(Date.now() + 1000);
      render(<CountdownTimer deadline={deadline} />);
      const countdownEl = screen.getByText(/\d+d \d+h \d+m \d+s/);
      expect(countdownEl).toHaveClass('text-destructive');
    });
  });

  describe('expired deadline', () => {
    it('renders "Deadline passed" when deadline is in the past', () => {
      const deadline = new Date(Date.now() - 1000);
      render(<CountdownTimer deadline={deadline} />);
      expect(screen.getByText('Deadline passed')).toBeInTheDocument();
    });

    it('does not render a numeric countdown when expired', () => {
      const deadline = new Date(Date.now() - 5000);
      render(<CountdownTimer deadline={deadline} />);
      expect(screen.queryByText(/\d+d \d+h \d+m \d+s/)).not.toBeInTheDocument();
    });

    it('transitions to "Deadline passed" when the timer runs out', () => {
      const deadline = new Date(Date.now() + 1500);
      render(<CountdownTimer deadline={deadline} />);
      expect(screen.getByText(/\d+d \d+h \d+m \d+s/)).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Deadline passed')).toBeInTheDocument();
      expect(screen.queryByText(/\d+d \d+h \d+m \d+s/)).not.toBeInTheDocument();
    });
  });

  describe('invalid Date', () => {
    it('renders "—" for an invalid Date object', () => {
      const invalid = new Date('not-a-date');
      render(<CountdownTimer deadline={invalid} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('does not crash when given an invalid Date', () => {
      const invalid = new Date('garbage');
      expect(() => render(<CountdownTimer deadline={invalid} />)).not.toThrow();
    });
  });

  describe('timer updates', () => {
    it('counts down each second', () => {
      const deadline = new Date(Date.now() + 5000);
      render(<CountdownTimer deadline={deadline} />);
      expect(screen.getByText('0d 0h 0m 5s')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('0d 0h 0m 4s')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByText('0d 0h 0m 3s')).toBeInTheDocument();
    });
  });
});
