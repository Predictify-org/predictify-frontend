/**
 * Schedule Engine for StreamPay
 * Handles per-second, hourly, and monthly payout calculations.
 * Aligned with UTC storage and local display requirements.
 */

export type PayoutInterval = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

export interface StreamSchedule {
  startDate: Date; // UTC
  endDate?: Date; // UTC
  interval: PayoutInterval;
  rate: number; // Amount per interval
  precision?: number; // Decimal places for rounding (default 7 for XLM)
}

/**
 * Calculates the next payout time based on the current time and stream schedule.
 * All calculations are done in UTC.
 */
export function getNextPayoutAt(schedule: StreamSchedule, now: Date = new Date()): Date | null {
  const { startDate, endDate, interval } = schedule;
  
  if (now < startDate) {
    return new Date(startDate);
  }
  
  if (endDate && now >= endDate) {
    return null;
  }

  const next = new Date(startDate);
  
  switch (interval) {
    case 'second':
      next.setTime(now.getTime() + 1000);
      break;
    case 'minute':
      next.setTime(now.getTime() - (now.getTime() % 60000) + 60000);
      break;
    case 'hour':
      next.setTime(now.getTime() - (now.getTime() % 3600000) + 3600000);
      break;
    case 'day':
      next.setUTCDate(next.getUTCDate() + Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1);
      break;
    case 'week':
      const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / 86400000);
      next.setUTCDate(next.getUTCDate() + (Math.floor(daysSinceStart / 7) + 1) * 7);
      break;
    case 'month':
      let months = (now.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (now.getUTCMonth() - startDate.getUTCMonth());
      if (now.getUTCDate() >= startDate.getUTCDate()) {
        months += 1;
      }
      next.setUTCMonth(startDate.getUTCMonth() + months);
      // Handle month-end overflow (e.g. Jan 31 -> Feb 28)
      if (next.getUTCDate() !== startDate.getUTCDate()) {
        next.setUTCDate(0);
      }
      break;
    case 'year':
      let years = now.getUTCFullYear() - startDate.getUTCFullYear();
      if (now.getUTCMonth() > startDate.getUTCMonth() || (now.getUTCMonth() === startDate.getUTCMonth() && now.getUTCDate() >= startDate.getUTCDate())) {
        years += 1;
      }
      next.setUTCFullYear(startDate.getUTCFullYear() + years);
      break;
  }

  if (endDate && next > endDate) {
    return new Date(endDate);
  }

  return next;
}

/**
 * Calculates accrued amount based on time elapsed and rate.
 * Uses banker's rounding (round half to even) or truncation based on project standards.
 * For StreamPay, we use truncation for safety in financial calculations, or fixed precision.
 */
export function calculateAccrual(schedule: StreamSchedule, now: Date = new Date()): number {
  const { startDate, endDate, interval, rate, precision = 7 } = schedule;
  
  if (now <= startDate) return 0;
  
  const effectiveEnd = endDate && now > endDate ? endDate : now;
  const elapsedMs = effectiveEnd.getTime() - startDate.getTime();
  
  let intervalMs: number;
  switch (interval) {
    case 'second': intervalMs = 1000; break;
    case 'minute': intervalMs = 60000; break;
    case 'hour': intervalMs = 3600000; break;
    case 'day': intervalMs = 86400000; break;
    case 'week': intervalMs = 604800000; break;
    case 'month':
      // For accrual, we use average month length or specific interval math
      // The requirement asks for per-second/hourly math
      intervalMs = 30.44 * 24 * 60 * 60 * 1000; // Approx month
      break;
    case 'year':
      intervalMs = 365.25 * 24 * 60 * 60 * 1000; // Approx year
      break;
    default:
      intervalMs = 86400000;
  }

  const amount = (elapsedMs / intervalMs) * rate;
  const factor = Math.pow(10, precision);
  return Math.floor(amount * factor) / factor; // Truncate to precision
}

/**
 * Formats a summary of the schedule for display.
 */
export function formatScheduleSummary(schedule: StreamSchedule): string {
  const { interval, rate } = schedule;
  const period = interval === 'day' ? 'daily' : interval === 'week' ? 'weekly' : interval === 'month' ? 'monthly' : `every ${interval}`;
  return `${rate} XLM ${period}`;
}

/**
 * Formats the "next payout" time for the UI.
 * Handles UTC to Local display implicitly by using browser locale if needed,
 * but here we follow the project's requirement to store UTC and display clearly.
 */
export function formatNextPayout(nextPayout: Date | null): string {
  if (!nextPayout) return 'Stream ended';
  
  const now = new Date();
  const diffMs = nextPayout.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Processing...';
  if (diffMs < 60000) return 'In less than a minute';
  if (diffMs < 3600000) return `In ${Math.floor(diffMs / 60000)} minutes`;
  if (diffMs < 86400000) return `In ${Math.floor(diffMs / 3600000)} hours`;
  
  return nextPayout.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
