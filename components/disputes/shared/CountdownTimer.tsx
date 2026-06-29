'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  deadline: Date;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeLeft(deadline: Date): TimeLeft | null {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Build a screen-reader-friendly description of the remaining time.
 *
 * Pluralisation is correct, and zero-valued components are dropped so the
 * announcement stays short. We deliberately omit seconds when more than a
 * minute remains so the live region does not announce every tick.
 */
function buildAnnouncement(t: TimeLeft): string {
  const parts: string[] = [];
  if (t.days > 0) parts.push(`${t.days} day${t.days === 1 ? '' : 's'}`);
  if (t.hours > 0) parts.push(`${t.hours} hour${t.hours === 1 ? '' : 's'}`);

  // Only include minutes/seconds when the larger unit doesn't dominate.
  if (t.days === 0) {
    if (t.minutes > 0) parts.push(`${t.minutes} minute${t.minutes === 1 ? '' : 's'}`);
    // Seconds only when the deadline is under a minute away.
    if (t.hours === 0 && t.minutes === 0 && t.seconds > 0) {
      parts.push(`${t.seconds} second${t.seconds === 1 ? '' : 's'}`);
    }
  }

  if (parts.length === 0) return 'Less than one second remaining';
  return `${parts.join(', ')} remaining`;
}

/**
 * Decide the coarse "announce key" for a given time-left value. The aria-live
 * region only re-announces when this key changes, so screen readers are not
 * spammed every second.
 *
 *   > 1 day:   announce when days changes
 *   > 1 hour:  announce when hours changes
 *   > 1 min:   announce when minutes changes
 *   < 1 min:   announce every 10 seconds
 */
function getAnnounceKey(t: TimeLeft): string {
  if (t.days > 0) return `d:${t.days}`;
  if (t.hours > 0) return `h:${t.hours}`;
  if (t.minutes > 0) return `m:${t.minutes}`;
  // Bucket seconds in 10s so we announce at most every ~10s in the final minute.
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    getPrefersReducedMotion
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function CountdownTimer({ deadline, label }: CountdownTimerProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => {
    if (!isValidDate(deadline)) return null;
    return computeTimeLeft(deadline);
  });
  const [expired, setExpired] = useState<boolean>(() => {
    if (!isValidDate(deadline)) return false;
    return deadline.getTime() <= Date.now();
  });

  // The string the aria-live region currently shows. Updates only at coarse
  // intervals so screen readers do not announce every second.
  const [announcement, setAnnouncement] = useState<string>(() => {
    if (!isValidDate(deadline)) return '';
    if (deadline.getTime() <= Date.now()) return 'Deadline passed';
    const t = computeTimeLeft(deadline);
    return t ? buildAnnouncement(t) : '';
  });
  const lastAnnounceKey = useRef<string>('');

  useEffect(() => {
    if (!isValidDate(deadline)) return;

    const tick = () => {
      const remaining = computeTimeLeft(deadline);
      if (remaining === null) {
        setExpired(true);
        setTimeLeft(null);
        if (lastAnnounceKey.current !== 'expired') {
          lastAnnounceKey.current = 'expired';
          setAnnouncement('Deadline passed');
        }
        return;
      }

      setExpired(false);
      setTimeLeft(remaining);

      const nextKey = getAnnounceKey(remaining);
      if (nextKey !== lastAnnounceKey.current) {
        lastAnnounceKey.current = nextKey;
        setAnnouncement(buildAnnouncement(remaining));
      }
    };

    tick();
    if (prefersReducedMotion) return;

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, prefersReducedMotion]);

  if (!isValidDate(deadline)) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (expired) {
    return (
      <div className="flex flex-col gap-0.5" role="timer" aria-label="Deadline passed">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-sm font-medium text-muted-foreground">Deadline passed</span>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="flex flex-col gap-0.5" role="timer" aria-label="Deadline passed">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-sm font-medium text-muted-foreground">Deadline passed</span>
      </div>
    );
  }

  const totalHoursLeft = timeLeft.days * 24 + timeLeft.hours;
  const isUrgent = totalHoursLeft < 24;

  const accessibleLabel = label ? `${label}: ${announcement}` : announcement;
  const visibleLabel = prefersReducedMotion
    ? announcement
    : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;

  return (
    <div className="flex flex-col gap-0.5" role="timer" aria-label={accessibleLabel}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span
        className={cn(
          'text-sm font-medium',
          !prefersReducedMotion && 'tabular-nums',
          isUrgent && 'text-destructive',
          isUrgent && !prefersReducedMotion && 'animate-pulse'
        )}
        aria-hidden="true"
      >
        {visibleLabel}
      </span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
