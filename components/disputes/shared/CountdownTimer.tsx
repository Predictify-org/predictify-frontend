'use client';

import { useEffect, useState } from 'react';
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

export function CountdownTimer({ deadline, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => {
    if (!isValidDate(deadline)) return null;
    return computeTimeLeft(deadline);
  });
  const [expired, setExpired] = useState<boolean>(() => {
    if (!isValidDate(deadline)) return false;
    return deadline.getTime() <= Date.now();
  });

  useEffect(() => {
    if (!isValidDate(deadline)) return;

    const tick = () => {
      const remaining = computeTimeLeft(deadline);
      if (remaining === null) {
        setExpired(true);
        setTimeLeft(null);
      } else {
        setExpired(false);
        setTimeLeft(remaining);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!isValidDate(deadline)) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (expired) {
    return (
      <div className="flex flex-col gap-0.5">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-sm font-medium text-muted-foreground">Deadline passed</span>
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="flex flex-col gap-0.5">
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <span className="text-sm font-medium text-muted-foreground">Deadline passed</span>
      </div>
    );
  }

  const totalHoursLeft = timeLeft.days * 24 + timeLeft.hours;
  const isUrgent = totalHoursLeft < 24;

  return (
    <div className="flex flex-col gap-0.5">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span
        className={cn(
          'text-sm font-medium tabular-nums',
          isUrgent && 'text-destructive animate-pulse'
        )}
      >
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
}
