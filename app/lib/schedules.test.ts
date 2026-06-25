import { getNextPayoutAt, calculateAccrual, type StreamSchedule } from './schedules';

describe('Schedule Engine', () => {
  describe('getNextPayoutAt', () => {
    it('calculates next second correctly', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        interval: 'second',
        rate: 1,
      };
      const now = new Date('2026-01-01T00:00:00.500Z');
      const next = getNextPayoutAt(schedule, now);
      expect(next?.toISOString()).toBe('2026-01-01T00:00:01.500Z');
    });

    it('calculates next day correctly', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2026-01-01T12:00:00Z'),
        interval: 'day',
        rate: 10,
      };
      const now = new Date('2026-01-01T13:00:00Z');
      const next = getNextPayoutAt(schedule, now);
      expect(next?.toISOString()).toBe('2026-01-02T12:00:00.000Z');
    });

    it('handles month-end correctly (Jan 31 to Feb)', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2026-01-31T10:00:00Z'),
        interval: 'month',
        rate: 100,
      };
      const now = new Date('2026-01-31T11:00:00Z');
      const next = getNextPayoutAt(schedule, now);
      // Feb only has 28 days in 2026
      expect(next?.toISOString()).toBe('2026-02-28T10:00:00.000Z');
    });

    it('handles leap year correctly', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2024-01-29T10:00:00Z'),
        interval: 'month',
        rate: 100,
      };
      const now = new Date('2024-01-29T11:00:00Z');
      const next = getNextPayoutAt(schedule, now);
      // 2024 is leap year, has Feb 29
      expect(next?.toISOString()).toBe('2024-02-29T10:00:00.000Z');
    });

    it('respects endDate', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-01-01T12:00:00Z'),
        interval: 'day',
        rate: 10,
      };
      const now = new Date('2026-01-01T06:00:00Z');
      const next = getNextPayoutAt(schedule, now);
      expect(next?.toISOString()).toBe('2026-01-01T12:00:00.000Z');
    });
  });

  describe('calculateAccrual', () => {
    it('calculates second-based accrual', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        interval: 'second',
        rate: 1,
      };
      const now = new Date('2026-01-01T00:00:05.500Z');
      const accrual = calculateAccrual(schedule, now);
      expect(accrual).toBe(5.5);
    });

    it('truncates to precision (default 7)', () => {
      const schedule: StreamSchedule = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        interval: 'hour',
        rate: 10,
      };
      // 1.5 hours + a tiny bit
      const now = new Date('2026-01-01T01:30:00.0000001Z');
      const accrual = calculateAccrual(schedule, now);
      // (1.5 * 10) = 15
      expect(accrual).toBe(15);
    });

    it('handles very small rates and high precision', () => {
       const schedule: StreamSchedule = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        interval: 'day',
        rate: 0.0000001, // 1 stroop per day
        precision: 7
      };
      const now = new Date('2026-01-01T12:00:00Z'); // half day
      const accrual = calculateAccrual(schedule, now);
      expect(accrual).toBe(0); // 0.00000005 truncated to 7 decimals is 0
    });
  });

  describe('formatNextPayout', () => {
    it('formats near-future payout correctly', () => {
      const now = new Date();
      const next = new Date(now.getTime() + 5 * 60 * 1000 + 1000); // 5 mins and 1 sec
      const { formatNextPayout } = require('./schedules');
      expect(formatNextPayout(next)).toContain('5 minutes');
    });

    it('formats distant future payout correctly', () => {
      const next = new Date('2099-01-01T10:00:00Z');
      const { formatNextPayout } = require('./schedules');
      const result = formatNextPayout(next);
      expect(result).toMatch(/Jan/i);
      expect(result).toMatch(/1/);
    });

    it('handles ended streams', () => {
      const { formatNextPayout } = require('./schedules');
      expect(formatNextPayout(null)).toBe('Stream ended');
    });
  });
});
