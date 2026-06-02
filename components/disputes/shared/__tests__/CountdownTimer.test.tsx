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
      // The component now renders two spans: the visible countdown and a
      // visually-hidden aria-live region for accessible announcements.
      // The visible (non-sr-only) span is the countdown itself.
      const visibleSpans = container.querySelectorAll('span:not(.sr-only)');
      expect(visibleSpans).toHaveLength(1);
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
      // Both the visible label and the aria-live region say "Deadline passed".
      const matches = screen.getAllByText('Deadline passed');
      expect(matches.length).toBeGreaterThanOrEqual(1);
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

      const passedMatches = screen.getAllByText('Deadline passed');
      expect(passedMatches.length).toBeGreaterThanOrEqual(1);
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

  describe('accessibility', () => {
    it('exposes the remaining time via role="timer" and an accessible label', () => {
      const deadline = new Date(Date.now() + (2 * 86400 + 3 * 3600) * 1000);
      render(<CountdownTimer deadline={deadline} />);
      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
      expect(timer.getAttribute('aria-label')).toMatch(/2 days/);
    });

    it('exposes the label as part of the timer\'s accessible name', () => {
      const deadline = new Date(Date.now() + 90 * 60 * 1000); // 1h 30m
      render(<CountdownTimer deadline={deadline} label="Voting closes in" />);
      const timer = screen.getByRole('timer');
      expect(timer.getAttribute('aria-label')).toMatch(/Voting closes in/);
      expect(timer.getAttribute('aria-label')).toMatch(/1 hour/);
    });

    it('marks the visible numeric countdown as aria-hidden so it is not double-announced', () => {
      const deadline = new Date(Date.now() + 5 * 60 * 1000);
      render(<CountdownTimer deadline={deadline} />);
      const visibleCountdown = screen.getByText(/\d+d \d+h \d+m \d+s/);
      expect(visibleCountdown).toHaveAttribute('aria-hidden', 'true');
    });

    it('does not update the aria-live announcement every second when more than a minute remains', () => {
      // Start at 5 minutes 30 seconds. aria-live should sit on "5 minutes" and
      // not refresh on second-ticks within the same minute bucket.
      const deadline = new Date(Date.now() + (5 * 60 + 30) * 1000);
      const { container } = render(<CountdownTimer deadline={deadline} />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      const initial = liveRegion?.textContent ?? '';
      expect(initial).toMatch(/5 minutes/);

      // Advance 3 seconds (still inside the "5 minutes" bucket).
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(liveRegion?.textContent).toBe(initial);
    });

    it('updates the aria-live announcement when the minute boundary crosses', () => {
      const deadline = new Date(Date.now() + (5 * 60 + 1) * 1000); // 5m 1s
      const { container } = render(<CountdownTimer deadline={deadline} />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/5 minutes/);

      // Advance 2 seconds — we should drop into the "4 minutes" bucket and
      // the aria-live region should re-announce.
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(liveRegion?.textContent).toMatch(/4 minutes/);
    });

    it('announces "Deadline passed" once when the deadline elapses', () => {
      const deadline = new Date(Date.now() + 1500);
      const { container } = render(<CountdownTimer deadline={deadline} />);
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toBe('Deadline passed');
    });
  });
});
