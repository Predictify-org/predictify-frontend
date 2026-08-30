import {
  render,
  screen,
  act,
} from '@testing-library/react';
import { CountdownTimer } from '../CountdownTimer';

const setReducedMotion = (
  matches: boolean
) => {
  window.matchMedia = jest
    .fn()
    .mockImplementation((query: string) => ({
      matches:
        query ===
        '(prefers-reduced-motion: reduce)'
          ? matches
          : false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
};

describe('CountdownTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('valid future deadline', () => {
    it('displays days, hours, minutes, seconds in "Xd Xh Xm Xs" format', () => {
      const deadline = new Date(
        Date.now() +
          (2 * 86400 +
            3 * 3600 +
            4 * 60 +
            5) *
            1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getByText('2d 3h 4m 5s')
      ).toBeInTheDocument();
    });

    it('renders the label when provided', () => {
      const deadline = new Date(
        Date.now() + 48 * 3600 * 1000
      );

      render(
        <CountdownTimer
          deadline={deadline}
          label="Staking deadline"
        />
      );

      expect(
        screen.getByText('Staking deadline')
      ).toBeInTheDocument();
    });

    it('does not render label when not provided', () => {
      const deadline = new Date(
        Date.now() + 48 * 3600 * 1000
      );

      const { container } = render(
        <CountdownTimer deadline={deadline} />
      );

      const visibleSpans =
        container.querySelectorAll(
          'span:not(.sr-only)'
        );

      expect(visibleSpans).toHaveLength(1);
    });
  });

  describe('ledger time', () => {
    it('uses ledger time instead of browser time', () => {
      const browserNow = Date.now();

      const ledgerTime = new Date(
        browserNow - 120_000
      );

      const deadline = new Date(
        browserNow - 60_000
      );

      render(
        <CountdownTimer
          deadline={deadline}
          currentTime={ledgerTime}
        />
      );

      expect(
        screen.getByText('0d 0h 1m 0s')
      ).toBeInTheDocument();

      expect(
        screen.queryByText(
          'Deadline passed'
        )
      ).not.toBeInTheDocument();
    });

    it('treats exact ledger deadline equality as passed', () => {
      const deadline = new Date(
        '2026-08-30T12:00:00.000Z'
      );

      const ledgerTime = new Date(
        '2026-08-30T12:00:00.000Z'
      );

      render(
        <CountdownTimer
          deadline={deadline}
          currentTime={ledgerTime}
        />
      );

      expect(
        screen.getAllByText(
          'Deadline passed'
        ).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('keeps the deadline open one second before the ledger boundary', () => {
      const deadline = new Date(
        '2026-08-30T12:00:00.000Z'
      );

      const ledgerTime = new Date(
        '2026-08-30T11:59:59.000Z'
      );

      render(
        <CountdownTimer
          deadline={deadline}
          currentTime={ledgerTime}
        />
      );

      expect(
        screen.getByText('0d 0h 0m 1s')
      ).toBeInTheDocument();
    });

    it('shows a loading state when ledger time is unavailable', () => {
      const deadline = new Date(
        Date.now() + 60_000
      );

      render(
        <CountdownTimer
          deadline={deadline}
          currentTime={null}
          label="Voting deadline"
        />
      );

      expect(
        screen.getByText(
          'Checking ledger time…'
        )
      ).toBeInTheDocument();

      expect(
        screen.getByRole('timer')
      ).toHaveAccessibleName(
        'Voting deadline: Checking ledger time'
      );
    });
  });

  describe('urgency styling', () => {
    it('applies urgency styling when less than 24h remain', () => {
      const deadline = new Date(
        Date.now() +
          (23 * 3600 +
            59 * 60 +
            59) *
            1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      const countdownEl =
        screen.getByText(
          /\d+d \d+h \d+m \d+s/
        );

      expect(countdownEl).toHaveClass(
        'text-destructive'
      );

      expect(countdownEl).toHaveClass(
        'animate-pulse'
      );
    });

    it('does not apply urgency styling at exactly 24h', () => {
      const deadline = new Date(
        Date.now() + 24 * 3600 * 1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      const countdownEl =
        screen.getByText(
          /\d+d \d+h \d+m \d+s/
        );

      expect(countdownEl).not.toHaveClass(
        'text-destructive'
      );

      expect(countdownEl).not.toHaveClass(
        'animate-pulse'
      );
    });

    it('applies urgency styling at exactly one second remaining', () => {
      const deadline = new Date(
        Date.now() + 1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getByText(
          /\d+d \d+h \d+m \d+s/
        )
      ).toHaveClass('text-destructive');
    });
  });

  describe('expired deadline', () => {
    it('renders Deadline passed when deadline is in the past', () => {
      const deadline = new Date(
        Date.now() - 1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getAllByText(
          'Deadline passed'
        ).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('does not render a numeric countdown when expired', () => {
      const deadline = new Date(
        Date.now() - 5000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.queryByText(
          /\d+d \d+h \d+m \d+s/
        )
      ).not.toBeInTheDocument();
    });

    it('transitions to Deadline passed when browser-time fallback runs out', () => {
      const deadline = new Date(
        Date.now() + 1500
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getByText(
          /\d+d \d+h \d+m \d+s/
        )
      ).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(
        screen.getAllByText(
          'Deadline passed'
        ).length
      ).toBeGreaterThanOrEqual(1);

      expect(
        screen.queryByText(
          /\d+d \d+h \d+m \d+s/
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('invalid Date', () => {
    it('renders — for an invalid deadline', () => {
      render(
        <CountdownTimer
          deadline={
            new Date('not-a-date')
          }
        />
      );

      expect(
        screen.getByText('—')
      ).toBeInTheDocument();
    });

    it('does not crash for an invalid deadline', () => {
      expect(() =>
        render(
          <CountdownTimer
            deadline={
              new Date('garbage')
            }
          />
        )
      ).not.toThrow();
    });
  });

  describe('timer updates', () => {
    it('counts down browser-time fallback each second', () => {
      const deadline = new Date(
        Date.now() + 5000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getByText('0d 0h 0m 5s')
      ).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(
        screen.getByText('0d 0h 0m 4s')
      ).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(
        screen.getByText('0d 0h 0m 3s')
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('exposes remaining time using role timer', () => {
      const deadline = new Date(
        Date.now() +
          (2 * 86400 +
            3 * 3600) *
            1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      const timer =
        screen.getByRole('timer');

      expect(timer).toBeInTheDocument();

      expect(
        timer.getAttribute('aria-label')
      ).toMatch(/2 days/);
    });

    it('includes the supplied label in its accessible name', () => {
      const deadline = new Date(
        Date.now() +
          90 * 60 * 1000
      );

      render(
        <CountdownTimer
          deadline={deadline}
          label="Voting closes in"
        />
      );

      const timer =
        screen.getByRole('timer');

      expect(
        timer.getAttribute('aria-label')
      ).toMatch(/Voting closes in/);

      expect(
        timer.getAttribute('aria-label')
      ).toMatch(/1 hour/);
    });

    it('marks visible countdown aria-hidden', () => {
      const deadline = new Date(
        Date.now() + 5 * 60 * 1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getByText(
          /\d+d \d+h \d+m \d+s/
        )
      ).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    });

    it('does not update live announcement every second when more than a minute remains', () => {
      const deadline = new Date(
        Date.now() +
          (5 * 60 + 30) * 1000
      );

      const { container } = render(
        <CountdownTimer deadline={deadline} />
      );

      const liveRegion =
        container.querySelector(
          '[aria-live="polite"]'
        );

      const initial =
        liveRegion?.textContent ?? '';

      expect(initial).toMatch(
        /5 minutes/
      );

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(
        liveRegion?.textContent
      ).toBe(initial);
    });

    it('updates live announcement at the minute boundary', () => {
      const deadline = new Date(
        Date.now() +
          (5 * 60 + 1) * 1000
      );

      const { container } = render(
        <CountdownTimer deadline={deadline} />
      );

      const liveRegion =
        container.querySelector(
          '[aria-live="polite"]'
        );

      expect(
        liveRegion?.textContent
      ).toMatch(/5 minutes/);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(
        liveRegion?.textContent
      ).toMatch(/4 minutes/);
    });

    it('announces Deadline passed when deadline elapses', () => {
      const deadline = new Date(
        Date.now() + 1500
      );

      const { container } = render(
        <CountdownTimer deadline={deadline} />
      );

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      const liveRegion =
        container.querySelector(
          '[aria-live="polite"]'
        );

      expect(
        liveRegion?.textContent
      ).toBe('Deadline passed');
    });
  });

  describe('reduced motion', () => {
    it('renders static remaining-time text', () => {
      setReducedMotion(true);

      const deadline = new Date(
        Date.now() +
          (2 * 86400 +
            3 * 3600) *
            1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      expect(
        screen.getAllByText(
          '2 days, 3 hours remaining'
        ).length
      ).toBeGreaterThanOrEqual(1);

      expect(
        screen.queryByText(
          /\d+d \d+h \d+m \d+s/
        )
      ).not.toBeInTheDocument();
    });

    it('does not pulse when reduced motion is preferred', () => {
      setReducedMotion(true);

      const deadline = new Date(
        Date.now() + 30 * 1000
      );

      render(
        <CountdownTimer deadline={deadline} />
      );

      const countdownEls =
        screen.getAllByText(
          /seconds remaining/
        );

      expect(
        countdownEls[0]
      ).toHaveClass('text-destructive');

      expect(
        countdownEls[0]
      ).not.toHaveClass('animate-pulse');
    });
  });
});