'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  deadline: Date;
  label?: string;

  /**
   * Authoritative time used for deadline calculation.
   *
   * undefined preserves backwards compatibility for callers that intentionally
   * use browser time.
   *
   * null means authoritative time is still unavailable.
   */
  currentTime?: Date | null;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function getReferenceTime(
  currentTime: Date | null | undefined
): number | null {
  if (currentTime === null) {
    return null;
  }

  if (currentTime === undefined) {
    return Date.now();
  }

  if (!isValidDate(currentTime)) {
    return null;
  }

  return currentTime.getTime();
}

function computeTimeLeft(
  deadline: Date,
  referenceTime: number
): TimeLeft | null {
  const diff = deadline.getTime() - referenceTime;

  if (diff <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
  };
}

function buildAnnouncement(t: TimeLeft): string {
  const parts: string[] = [];

  if (t.days > 0) {
    parts.push(`${t.days} day${t.days === 1 ? '' : 's'}`);
  }

  if (t.hours > 0) {
    parts.push(`${t.hours} hour${t.hours === 1 ? '' : 's'}`);
  }

  if (t.days === 0) {
    if (t.minutes > 0) {
      parts.push(
        `${t.minutes} minute${t.minutes === 1 ? '' : 's'}`
      );
    }

    if (
      t.hours === 0 &&
      t.minutes === 0 &&
      t.seconds > 0
    ) {
      parts.push(
        `${t.seconds} second${t.seconds === 1 ? '' : 's'}`
      );
    }
  }

  if (parts.length === 0) {
    return 'Less than one second remaining';
  }

  return `${parts.join(', ')} remaining`;
}

function getAnnounceKey(t: TimeLeft): string {
  if (t.days > 0) {
    return `d:${t.days}`;
  }

  if (t.hours > 0) {
    return `h:${t.hours}`;
  }

  if (t.minutes > 0) {
    return `m:${t.minutes}`;
  }

  return `s:${Math.floor(t.seconds / 10) * 10}`;
}

function getPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState(getPrefersReducedMotion);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);

      return () => {
        mediaQuery.removeEventListener(
          'change',
          updatePreference
        );
      };
    }

    mediaQuery.addListener(updatePreference);

    return () => {
      mediaQuery.removeListener(updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

export function CountdownTimer({
  deadline,
  label,
  currentTime,
}: CountdownTimerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const initialReferenceTime = getReferenceTime(currentTime);

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(
    () => {
      if (
        !isValidDate(deadline) ||
        initialReferenceTime === null
      ) {
        return null;
      }

      return computeTimeLeft(
        deadline,
        initialReferenceTime
      );
    }
  );

  const [expired, setExpired] = useState<boolean>(() => {
    if (
      !isValidDate(deadline) ||
      initialReferenceTime === null
    ) {
      return false;
    }

    return deadline.getTime() <= initialReferenceTime;
  });

  const [announcement, setAnnouncement] =
    useState<string>(() => {
      if (!isValidDate(deadline)) {
        return '';
      }

      if (initialReferenceTime === null) {
        return 'Checking ledger time';
      }

      if (deadline.getTime() <= initialReferenceTime) {
        return 'Deadline passed';
      }

      const remaining = computeTimeLeft(
        deadline,
        initialReferenceTime
      );

      return remaining
        ? buildAnnouncement(remaining)
        : 'Deadline passed';
    });

  const lastAnnounceKey = useRef<string>('');

  useEffect(() => {
    if (!isValidDate(deadline)) {
      return;
    }

    const tick = () => {
      const referenceTime = getReferenceTime(currentTime);

      if (referenceTime === null) {
        setExpired(false);
        setTimeLeft(null);

        if (
          lastAnnounceKey.current !== 'ledger-loading'
        ) {
          lastAnnounceKey.current = 'ledger-loading';
          setAnnouncement('Checking ledger time');
        }

        return;
      }

      const remaining = computeTimeLeft(
        deadline,
        referenceTime
      );

      if (remaining === null) {
        setExpired(true);
        setTimeLeft(null);

        if (
          lastAnnounceKey.current !== 'expired'
        ) {
          lastAnnounceKey.current = 'expired';
          setAnnouncement('Deadline passed');
        }

        return;
      }

      setExpired(false);
      setTimeLeft(remaining);

      const nextKey = getAnnounceKey(remaining);

      if (
        nextKey !== lastAnnounceKey.current
      ) {
        lastAnnounceKey.current = nextKey;
        setAnnouncement(
          buildAnnouncement(remaining)
        );
      }
    };

    tick();

    /*
     * When authoritative ledger time is supplied, the timer changes only when
     * that ledger snapshot changes. This prevents the browser clock from
     * independently crossing the authoritative deadline boundary.
     */
    if (currentTime !== undefined) {
      return;
    }

    if (prefersReducedMotion) {
      return;
    }

    const id = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [
    deadline,
    currentTime,
    prefersReducedMotion,
  ]);

  if (!isValidDate(deadline)) {
    return (
      <span className="text-muted-foreground">
        —
      </span>
    );
  }

  if (currentTime === null) {
    const accessibleLabel = label
      ? `${label}: Checking ledger time`
      : 'Checking ledger time';

    return (
      <div
        className="flex flex-col gap-0.5"
        role="timer"
        aria-label={accessibleLabel}
      >
        {label && (
          <span className="text-xs text-muted-foreground">
            {label}
          </span>
        )}

        <span className="text-sm font-medium text-muted-foreground">
          Checking ledger time…
        </span>
      </div>
    );
  }

  if (expired) {
    return (
      <div
        className="flex flex-col gap-0.5"
        role="timer"
        aria-label="Deadline passed"
      >
        {label && (
          <span className="text-xs text-muted-foreground">
            {label}
          </span>
        )}

        <span className="text-sm font-medium text-muted-foreground">
          Deadline passed
        </span>

        <span
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </span>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div
        className="flex flex-col gap-0.5"
        role="timer"
        aria-label="Deadline passed"
      >
        {label && (
          <span className="text-xs text-muted-foreground">
            {label}
          </span>
        )}

        <span className="text-sm font-medium text-muted-foreground">
          Deadline passed
        </span>
      </div>
    );
  }

  const totalHoursLeft =
    timeLeft.days * 24 + timeLeft.hours;

  const isUrgent = totalHoursLeft < 24;

  const accessibleLabel = label
    ? `${label}: ${announcement}`
    : announcement;

  const visibleLabel = prefersReducedMotion
    ? announcement
    : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;

  return (
    <div
      className="flex flex-col gap-0.5"
      role="timer"
      aria-label={accessibleLabel}
    >
      {label && (
        <span className="text-xs text-muted-foreground">
          {label}
        </span>
      )}

      <span
        className={cn(
          'text-sm font-medium',
          !prefersReducedMotion && 'tabular-nums',
          isUrgent && 'text-destructive',
          isUrgent &&
            !prefersReducedMotion &&
            'animate-pulse'
        )}
        aria-hidden="true"
      >
        {visibleLabel}
      </span>

      {!prefersReducedMotion && (
        <span
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </span>
      )}
    </div>
  );
}