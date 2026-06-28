/**
 * Tests for ICS (iCalendar) file generation utilities.
 */

import {
  escapeIcsText,
  formatIcsDate,
  generateEventUid,
  parseRate,
  calculateVestingDates,
  generateIcsFile,
  generateIcsFilename,
} from './ics';

describe('ICS Utilities', () => {
  describe('escapeIcsText', () => {
    it('should escape backslashes', () => {
      expect(escapeIcsText('test\\value')).toBe('test\\\\value');
    });

    it('should escape semicolons', () => {
      expect(escapeIcsText('test;value')).toBe('test\\;value');
    });

    it('should escape commas', () => {
      expect(escapeIcsText('test,value')).toBe('test\\,value');
    });

    it('should escape newlines', () => {
      expect(escapeIcsText('test\nvalue')).toBe('test\\nvalue');
    });

    it('should escape multiple special characters', () => {
      expect(escapeIcsText('test;value\\,with\nnewlines')).toBe('test\\;value\\\\\\,with\\nnewlines');
    });

    it('should handle empty strings', () => {
      expect(escapeIcsText('')).toBe('');
    });

    it('should handle strings without special characters', () => {
      expect(escapeIcsText('normal text')).toBe('normal text');
    });
  });

  describe('formatIcsDate', () => {
    it('should format date to ICS datetime format', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatIcsDate(date)).toBe('20240115T103000Z');
    });

    it('should handle dates with milliseconds', () => {
      const date = new Date('2024-12-31T23:59:59.999Z');
      expect(formatIcsDate(date)).toBe('20241231T235959Z');
    });
  });

  describe('generateEventUid', () => {
    it('should generate unique UID with stream ID and timestamp', () => {
      const streamId = 'stream-123';
      const timestamp = new Date('2024-01-15T10:30:00.000Z');
      const uid = generateEventUid(streamId, timestamp);
      
      expect(uid).toContain(streamId);
      expect(uid).toContain('@streampay.io');
      expect(uid).toMatch(/^\w+-\d+@streampay\.io$/);
    });

    it('should generate different UIDs for different timestamps', () => {
      const streamId = 'stream-123';
      const timestamp1 = new Date('2024-01-15T10:30:00.000Z');
      const timestamp2 = new Date('2024-01-15T11:30:00.000Z');
      
      expect(generateEventUid(streamId, timestamp1)).not.toBe(generateEventUid(streamId, timestamp2));
    });
  });

  describe('parseRate', () => {
    it('should parse daily rate', () => {
      expect(parseRate('18 XLM / day')).toEqual({ amount: '18', period: 'day' });
    });

    it('should parse weekly rate', () => {
      expect(parseRate('32 XLM / week')).toEqual({ amount: '32', period: 'week' });
    });

    it('should parse monthly rate', () => {
      expect(parseRate('120 XLM / month')).toEqual({ amount: '120', period: 'month' });
    });

    it('should handle decimal amounts', () => {
      expect(parseRate('12.5 XLM / day')).toEqual({ amount: '12.5', period: 'day' });
    });

    it('should handle different spacing', () => {
      expect(parseRate('120 XLM/month')).toEqual({ amount: '120', period: 'month' });
      expect(parseRate('120XLM/month')).toEqual({ amount: '120', period: 'month' });
    });

    it('should return null for invalid format', () => {
      expect(parseRate('invalid')).toBeNull();
      expect(parseRate('XLM / day')).toBeNull();
      expect(parseRate('120 XLM')).toBeNull();
    });
  });

  describe('calculateVestingDates', () => {
    it('should calculate vesting dates for daily rate', () => {
      const events = calculateVestingDates('stream-123', '10 XLM / day', '2024-01-01T00:00:00.000Z', 'active');
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toMatchObject({
        streamId: 'stream-123',
        amount: '10',
        token: 'XLM',
      });
    });

    it('should calculate vesting dates for weekly rate', () => {
      const events = calculateVestingDates('stream-123', '50 XLM / week', '2024-01-01T00:00:00.000Z', 'active');
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toMatchObject({
        streamId: 'stream-123',
        amount: '50',
        token: 'XLM',
      });
    });

    it('should calculate vesting dates for monthly rate', () => {
      const events = calculateVestingDates('stream-123', '200 XLM / month', '2024-01-01T00:00:00.000Z', 'active');
      
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toMatchObject({
        streamId: 'stream-123',
        amount: '200',
        token: 'XLM',
      });
    });

    it('should skip past events', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      const events = calculateVestingDates(
        'stream-123',
        '10 XLM / day',
        pastDate.toISOString(),
        'active'
      );
      
      // All events should be in the future
      events.forEach(event => {
        expect(event.start.getTime()).toBeGreaterThanOrEqual(Date.now());
      });
    });

    it('should not generate future events for ended streams', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const events = calculateVestingDates(
        'stream-123',
        '10 XLM / day',
        futureDate.toISOString(),
        'ended'
      );
      
      expect(events.length).toBe(0);
    });

    it('should not generate future events for cancelled streams', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const events = calculateVestingDates(
        'stream-123',
        '10 XLM / day',
        futureDate.toISOString(),
        'cancelled'
      );
      
      expect(events.length).toBe(0);
    });

    it('should return empty array for invalid rate format', () => {
      const events = calculateVestingDates('stream-123', 'invalid', '2024-01-01T00:00:00.000Z', 'active');
      
      expect(events.length).toBe(0);
    });

    it('should respect maxEvents parameter', () => {
      const events = calculateVestingDates(
        'stream-123',
        '10 XLM / day',
        '2024-01-01T00:00:00.000Z',
        'active',
        'XLM',
        5
      );
      
      expect(events.length).toBeLessThanOrEqual(5);
    });

    it('should use custom token', () => {
      const events = calculateVestingDates('stream-123', '10 USDC / day', '2024-01-01T00:00:00.000Z', 'active', 'USDC');
      
      expect(events[0].token).toBe('USDC');
    });
  });

  describe('generateIcsFile', () => {
    it('should generate valid ICS file structure', () => {
      const events = [
        {
          uid: 'test-uid@streampay.io',
          summary: 'Test Event',
          description: 'Test Description',
          start: new Date('2024-01-15T10:00:00.000Z'),
          end: new Date('2024-01-15T11:00:00.000Z'),
          streamId: 'stream-123',
        },
      ];
      
      const icsContent = generateIcsFile(events, 'Test Calendar');
      
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID:-//StreamPay//Vesting Calendar//EN');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('END:VCALENDAR');
    });

    it('should include calendar name', () => {
      const events = [];
      const icsContent = generateIcsFile(events, 'My Calendar');
      
      expect(icsContent).toContain('X-WR-CALNAME:My Calendar');
    });

    it('should escape special characters in summary and description', () => {
      const events = [
        {
          uid: 'test-uid@streampay.io',
          summary: 'Test; Event',
          description: 'Test\nDescription',
          start: new Date('2024-01-15T10:00:00.000Z'),
          end: new Date('2024-01-15T11:00:00.000Z'),
          streamId: 'stream-123',
        },
      ];
      
      const icsContent = generateIcsFile(events);
      
      expect(icsContent).toContain('SUMMARY:Test\\; Event');
      expect(icsContent).toContain('DESCRIPTION:Test\\nDescription');
    });

    it('should include location if provided', () => {
      const events = [
        {
          uid: 'test-uid@streampay.io',
          summary: 'Test Event',
          description: 'Test Description',
          start: new Date('2024-01-15T10:00:00.000Z'),
          end: new Date('2024-01-15T11:00:00.000Z'),
          location: 'Online',
          streamId: 'stream-123',
        },
      ];
      
      const icsContent = generateIcsFile(events);
      
      expect(icsContent).toContain('LOCATION:Online');
    });

    it('should handle multiple events', () => {
      const events = [
        {
          uid: 'event-1@streampay.io',
          summary: 'Event 1',
          description: 'Description 1',
          start: new Date('2024-01-15T10:00:00.000Z'),
          end: new Date('2024-01-15T11:00:00.000Z'),
          streamId: 'stream-123',
        },
        {
          uid: 'event-2@streampay.io',
          summary: 'Event 2',
          description: 'Description 2',
          start: new Date('2024-01-16T10:00:00.000Z'),
          end: new Date('2024-01-16T11:00:00.000Z'),
          streamId: 'stream-123',
        },
      ];
      
      const icsContent = generateIcsFile(events);
      
      expect(icsContent.match(/BEGIN:VEVENT/g)).toHaveLength(2);
      expect(icsContent.match(/END:VEVENT/g)).toHaveLength(2);
    });
  });

  describe('generateIcsFilename', () => {
    it('should generate filename with stream ID', () => {
      const filename = generateIcsFilename('stream-123');
      expect(filename).toBe('streampay-vesting-stream-123.ics');
    });

    it('should include label in filename when provided', () => {
      const filename = generateIcsFilename('stream-123', 'My Stream');
      expect(filename).toBe('streampay-vesting-My-Stream.ics');
    });

    it('should sanitize label by replacing special characters', () => {
      const filename = generateIcsFilename('stream-123', 'My Stream@#$');
      expect(filename).toBe('streampay-vesting-My-Stream---.ics');
    });

    it('should handle spaces in label', () => {
      const filename = generateIcsFilename('stream-123', 'Ada Creative Studio');
      expect(filename).toBe('streampay-vesting-Ada-Creative-Studio.ics');
    });
  });

  describe('Integration: calculateVestingDates and generateIcsFile', () => {
    it('should generate complete ICS file from stream data', () => {
      const events = calculateVestingDates(
        'stream-ada',
        '120 XLM / month',
        '2024-11-01T09:00:00.000Z',
        'active',
        'XLM'
      );
      
      const icsContent = generateIcsFile(events, 'StreamPay: Ada Creative Studio');
      
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('SUMMARY:Vesting: 120 XLM');
      expect(icsContent).toContain('stream-ada');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('END:VCALENDAR');
    });

    it('should handle weekly stream with proper event spacing', () => {
      const events = calculateVestingDates(
        'stream-weekly',
        '50 XLM / week',
        '2024-01-01T00:00:00.000Z',
        'active',
        'XLM',
        4
      );
      
      expect(events.length).toBe(4);
      
      // Check that events are approximately 7 days apart
      const dayInMs = 24 * 60 * 60 * 1000;
      for (let i = 1; i < events.length; i++) {
        const diff = events[i].start.getTime() - events[i - 1].start.getTime();
        expect(Math.abs(diff - 7 * dayInMs)).toBeLessThan(1000); // Allow 1 second tolerance
      }
    });
  });
});
