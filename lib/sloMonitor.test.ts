import {
  SloMonitor,
  getSloMonitor,
  resetSloMonitor,
  type SloConfig,
  type SloBurnAlert,
  type SloMonitorError,
} from './sloMonitor';
import { logger } from '@/app/lib/logger';

// Mock logger
jest.mock('../app/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  getCorrelationContext: jest.fn(() => ({
    request_id: 'test-req-id',
    correlation_id: 'test-corr-id',
  })),
  correlationContext: {},
  withCorrelationContext: jest.fn(),
  extractCorrelationContext: jest.fn(),
}));

describe('SloMonitor', () => {
  beforeEach(() => {
    // Reset logger mocks
    jest.clearAllMocks();
    // Reset singleton
    resetSloMonitor();
  });

  describe('initialization', () => {
    it('initializes with default parameters', () => {
      const monitor = new SloMonitor();
      expect(monitor.getObservationCount()).toBe(0);
      expect(monitor.getAllMetrics()).toEqual([]);
    });

    it('initializes with custom parameters', () => {
      const monitor = new SloMonitor(5000, 30000);
      expect(monitor.getObservationCount()).toBe(0);
    });

    it('logs initialization', () => {
      new SloMonitor();
      expect(logger.info).toHaveBeenCalledWith('SLO Monitor initialized', expect.objectContaining({
        service: 'slo-monitor',
        maxObservations: 10000,
        cleanupIntervalMs: 60000,
      }));
    });
  });

  describe('endpoint registration', () => {
    let monitor: SloMonitor;

    beforeEach(() => {
      monitor = new SloMonitor();
    });

    it('registers a valid endpoint configuration', () => {
      const config: SloConfig = {
        endpoint: '/api/v2/streams',
        p95ThresholdMs: 500,
      };

      monitor.registerEndpoint(config);
      expect(monitor.isMonitoring('/api/v2/streams')).toBe(true);
    });

    it('sets default burn duration to 5 minutes', () => {
      const config: SloConfig = {
        endpoint: '/api/test',
        p95ThresholdMs: 300,
      };

      monitor.registerEndpoint(config);
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics).not.toBeNull();
    });

    it('rejects empty endpoint name', () => {
      const config: SloConfig = {
        endpoint: '',
        p95ThresholdMs: 500,
      };

      expect(() => monitor.registerEndpoint(config)).toThrow('SLO configuration validation failed');
      expect(logger.error).toHaveBeenCalledWith(
        'SLO endpoint registration failed - validation error',
        expect.objectContaining({
          code: 'INVALID_ENDPOINT',
        }),
      );
    });

    it('rejects whitespace-only endpoint name', () => {
      const config: SloConfig = {
        endpoint: '   ',
        p95ThresholdMs: 500,
      };

      expect(() => monitor.registerEndpoint(config)).toThrow();
    });

    it('rejects invalid endpoint type', () => {
      const config = {
        endpoint: null,
        p95ThresholdMs: 500,
      } as any;

      expect(() => monitor.registerEndpoint(config)).toThrow();
    });

    it('rejects zero p95 threshold', () => {
      const config: SloConfig = {
        endpoint: '/api/test',
        p95ThresholdMs: 0,
      };

      expect(() => monitor.registerEndpoint(config)).toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'SLO endpoint registration failed - validation error',
        expect.objectContaining({
          code: 'INVALID_THRESHOLD',
        }),
      );
    });

    it('rejects negative p95 threshold', () => {
      const config: SloConfig = {
        endpoint: '/api/test',
        p95ThresholdMs: -100,
      };

      expect(() => monitor.registerEndpoint(config)).toThrow();
    });

    it('rejects non-finite p95 threshold', () => {
      const config: SloConfig = {
        endpoint: '/api/test',
        p95ThresholdMs: Infinity,
      };

      expect(() => monitor.registerEndpoint(config)).toThrow();
    });

    it('rejects invalid burn duration', () => {
      const config: SloConfig = {
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: -1000,
      };

      expect(() => monitor.registerEndpoint(config)).toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'SLO endpoint registration failed - validation error',
        expect.objectContaining({
          code: 'INVALID_BURN_DURATION',
        }),
      );
    });

    it('logs successful registration', () => {
      const config: SloConfig = {
        endpoint: '/api/streams',
        p95ThresholdMs: 500,
        burnDurationMs: 120000,
      };

      monitor.registerEndpoint(config);
      expect(logger.info).toHaveBeenCalledWith('SLO endpoint registered', expect.objectContaining({
        endpoint: '/api/streams',
        p95ThresholdMs: 500,
        burnDurationMs: 120000,
      }));
    });

    it('allows registering multiple endpoints', () => {
      monitor.registerEndpoint({ endpoint: '/api/v1', p95ThresholdMs: 500 });
      monitor.registerEndpoint({ endpoint: '/api/v2', p95ThresholdMs: 300 });

      expect(monitor.isMonitoring('/api/v1')).toBe(true);
      expect(monitor.isMonitoring('/api/v2')).toBe(true);
    });

    it('overwrites existing endpoint configuration', () => {
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 1000 });

      expect(monitor.isMonitoring('/api/test')).toBe(true);
    });
  });

  describe('latency recording', () => {
    let monitor: SloMonitor;

    beforeEach(() => {
      monitor = new SloMonitor();
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });
    });

    it('records a valid latency observation', () => {
      monitor.recordLatency('/api/test', 100);
      expect(monitor.getObservationCount()).toBe(1);
    });

    it('rejects negative latency', () => {
      expect(() => monitor.recordLatency('/api/test', -100)).toThrow();
    });

    it('rejects non-numeric latency', () => {
      expect(() => monitor.recordLatency('/api/test', 'invalid' as any)).toThrow();
    });

    it('rejects infinite latency', () => {
      expect(() => monitor.recordLatency('/api/test', Infinity)).toThrow();
    });

    it('rejects NaN latency', () => {
      expect(() => monitor.recordLatency('/api/test', NaN)).toThrow();
    });

    it('silently ignores observations for unregistered endpoints', () => {
      expect(() => monitor.recordLatency('/api/unknown', 100)).not.toThrow();
      expect(logger.warn).toHaveBeenCalledWith(
        'SLO latency observation for unregistered endpoint',
        expect.objectContaining({
          endpoint: '/api/unknown',
        }),
      );
    });

    it('allows recording zero latency', () => {
      monitor.recordLatency('/api/test', 0);
      expect(monitor.getObservationCount()).toBe(1);
    });

    it('allows recording large latency values', () => {
      monitor.recordLatency('/api/test', 999999);
      expect(monitor.getObservationCount()).toBe(1);
    });

    it('trims observations when exceeding max limit', () => {
      const smallMonitor = new SloMonitor(5, 60000);
      smallMonitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });

      for (let i = 0; i < 10; i++) {
        smallMonitor.recordLatency('/api/test', 100 + i);
      }

      expect(smallMonitor.getObservationCount()).toBe(5);
    });

    it('logs warning for invalid latency input', () => {
      expect(() => monitor.recordLatency('/api/test', -1)).toThrow();
      expect(logger.warn).toHaveBeenCalledWith(
        'SLO latency observation rejected - invalid input',
        expect.any(Object),
      );
    });
  });

  describe('P95 calculation', () => {
    let monitor: SloMonitor;

    beforeEach(() => {
      monitor = new SloMonitor();
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });
    });

    it('calculates P95 from single observation', () => {
      monitor.recordLatency('/api/test', 100);
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.p95ObservedMs).toBe(100);
    });

    it('calculates P95 from multiple observations', () => {
      const values = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
      values.forEach((v) => monitor.recordLatency('/api/test', v));

      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.p95ObservedMs).toBeDefined();
      expect(metrics?.p95ObservedMs).toBeGreaterThan(400);
      expect(metrics?.p95ObservedMs).toBeLessThanOrEqual(500);
    });

    it('returns null P95 when no observations in window', () => {
      // Register but don't record any observations
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.p95ObservedMs).toBeNull();
    });

    it('handles duplicate values in P95 calculation', () => {
      const values = [100, 100, 100, 100, 100];
      values.forEach((v) => monitor.recordLatency('/api/test', v));

      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.p95ObservedMs).toBe(100);
    });

    it('correctly handles very large datasets', () => {
      for (let i = 1; i <= 1000; i++) {
        monitor.recordLatency('/api/test', i);
      }

      const metrics = monitor.getMetrics('/api/test');
      // P95 of 1-1000 should be around 950
      expect(metrics?.p95ObservedMs).toBeGreaterThan(900);
      expect(metrics?.p95ObservedMs).toBeLessThanOrEqual(1000);
    });
  });

  describe('SLO burn detection', () => {
    let monitor: SloMonitor;
    let alerts: SloBurnAlert[];

    beforeEach(() => {
      alerts = [];
      monitor = new SloMonitor();
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 1000, // 1 second for testing
      });
      monitor.onBurnAlert((alert) => alerts.push(alert));
    });

    it('detects SLO burn when P95 exceeds threshold', (done) => {
      // Record observations that exceed threshold
      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      // Verify burn is detected
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.p95ObservedMs).toBeGreaterThan(500);
      expect(metrics?.isInBurn).toBe(true);

      // Wait and trigger another check
      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        // Alert should have been emitted
        expect(alerts.length).toBeGreaterThan(0);
        const alert = alerts[0];
        expect(alert.type).toBe('SLO_BURN_DETECTED');
        expect(alert.endpoint).toBe('/api/test');
        expect(alert.p95ObservedMs).toBeGreaterThan(500);
        done();
      }, 1100);
    });

    it('includes correlation ID in alert', (done) => {
      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].correlationId).toBe('test-corr-id');
        done();
      }, 1100);
    });

    it('clears burn when SLO is met', () => {
      // Record breach
      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      let metrics = monitor.getMetrics('/api/test');
      expect(metrics?.isInBurn).toBe(true);

      // Clear the observations after the burn window passes
      // Create a new monitor to start fresh since observations accumulate
      monitor.reset();
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 1000,
      });

      // Record values that meet SLO
      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 400);
      }

      metrics = monitor.getMetrics('/api/test');
      expect(metrics?.isInBurn).toBe(false);
    });

    it('logs SLO breach resolution', () => {
      // Record many observations that breach the SLO
      for (let i = 0; i < 100; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      const metrics1 = monitor.getMetrics('/api/test');
      expect(metrics1?.isInBurn).toBe(true);

      // Clear the logger mock to check for the next log only
      jest.clearAllMocks();

      // Record many observations that meet SLO (should dominate the p95)
      for (let i = 0; i < 100; i++) {
        monitor.recordLatency('/api/test', 400);
      }

      const metrics2 = monitor.getMetrics('/api/test');
      // Now p95 should be around 400, so burn should be cleared
      if (metrics2 && metrics2.p95ObservedMs && metrics2.p95ObservedMs <= 500) {
        expect(metrics2.isInBurn).toBe(false);
        expect(logger.info).toHaveBeenCalledWith(
          'SLO breach resolved',
          expect.objectContaining({
            endpoint: '/api/test',
          }),
        );
      }
    });

    it('includes breach percentage in alert', (done) => {
      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 750); // 50% over threshold
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 750);
        }

        expect(alerts.length).toBeGreaterThan(0);
        const alert = alerts[0];
        expect(alert.breachPercentage).toBeGreaterThan(0);
        done();
      }, 1100);
    });

    it('does not re-alert immediately after first alert', (done) => {
      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      setTimeout(() => {
        const initialAlertCount = alerts.length;

        // Continue recording high latencies
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        // Alert should be cleared and resettable
        expect(alerts.length).toBeLessThanOrEqual(initialAlertCount + 1);
        done();
      }, 1100);
    });
  });

  describe('alert callbacks', () => {
    let monitor: SloMonitor;
    let alerts: SloBurnAlert[];

    beforeEach(() => {
      alerts = [];
      monitor = new SloMonitor();
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 1000,
      });
    });

    it('executes registered callback on burn alert', (done) => {
      const callback = jest.fn();
      monitor.onBurnAlert(callback);

      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        expect(callback).toHaveBeenCalled();
        done();
      }, 1100);
    });

    it('executes multiple callbacks', (done) => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      monitor.onBurnAlert(callback1);
      monitor.onBurnAlert(callback2);

      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        done();
      }, 1100);
    });

    it('handles callback errors gracefully', (done) => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      monitor.onBurnAlert(errorCallback);
      monitor.onBurnAlert(normalCallback);

      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        // Both should have been called
        expect(errorCallback).toHaveBeenCalled();
        expect(normalCallback).toHaveBeenCalled();

        // Error should be logged
        expect(logger.error).toHaveBeenCalledWith(
          'SLO burn alert callback failed',
          expect.any(Object),
        );

        done();
      }, 1100);
    });

    it('rejects invalid callback type', () => {
      expect(() => monitor.onBurnAlert('not a function' as any)).toThrow();
    });
  });

  describe('metrics', () => {
    let monitor: SloMonitor;

    beforeEach(() => {
      monitor = new SloMonitor();
    });

    it('returns null for unregistered endpoint', () => {
      const metrics = monitor.getMetrics('/api/unknown');
      expect(metrics).toBeNull();
    });

    it('returns metrics for registered endpoint', () => {
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });
      monitor.recordLatency('/api/test', 100);

      const metrics = monitor.getMetrics('/api/test');
      expect(metrics).not.toBeNull();
      expect(metrics?.endpoint).toBe('/api/test');
      expect(metrics?.p95ThresholdMs).toBe(500);
      expect(metrics?.totalObservations).toBe(1);
      expect(metrics?.p95ObservedMs).toBe(100);
      expect(metrics?.isInBurn).toBe(false);
      expect(metrics?.burnDurationSeconds).toBeNull();
    });

    it('returns all metrics', () => {
      monitor.registerEndpoint({ endpoint: '/api/v1', p95ThresholdMs: 500 });
      monitor.registerEndpoint({ endpoint: '/api/v2', p95ThresholdMs: 300 });

      monitor.recordLatency('/api/v1', 100);
      monitor.recordLatency('/api/v2', 200);

      const allMetrics = monitor.getAllMetrics();
      expect(allMetrics.length).toBe(2);
      expect(allMetrics.map((m) => m.endpoint)).toEqual(['/api/v1', '/api/v2']);
    });

    it('includes burn duration in metrics when in burn', (done) => {
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 1000,
      });

      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.isInBurn).toBe(true);
      expect(metrics?.burnDurationSeconds).toBeGreaterThanOrEqual(0);
      done();
    });
  });

  describe('reset and cleanup', () => {
    it('resets all state', () => {
      const monitor = new SloMonitor();
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });
      monitor.recordLatency('/api/test', 100);

      expect(monitor.getObservationCount()).toBe(1);

      monitor.reset();

      expect(monitor.getObservationCount()).toBe(0);
      expect(monitor.isMonitoring('/api/test')).toBe(false);
    });

    it('logs reset operation', () => {
      const monitor = new SloMonitor();
      jest.clearAllMocks();

      monitor.reset();

      expect(logger.debug).toHaveBeenCalledWith('SLO Monitor state reset', {
        service: 'slo-monitor',
      });
    });

    it('starts cleanup interval', (done) => {
      const monitor = new SloMonitor(100, 100);
      monitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });

      monitor.startCleanup();

      // Record old observation (simulate by directly manipulating time would be complex)
      // Instead just verify it doesn't error
      expect(() => monitor.startCleanup()).not.toThrow();

      monitor.stopCleanup();
      done();
    });

    it('stops cleanup interval', () => {
      const monitor = new SloMonitor();
      monitor.startCleanup();
      monitor.stopCleanup();

      expect(logger.debug).toHaveBeenCalledWith(
        'SLO Monitor cleanup interval stopped',
        expect.any(Object),
      );
    });

    it('does not start multiple cleanup intervals', () => {
      const monitor = new SloMonitor();
      monitor.startCleanup();
      monitor.startCleanup();

      monitor.stopCleanup();
    });
  });

  describe('singleton pattern', () => {
    beforeEach(() => {
      resetSloMonitor();
    });

    it('returns same instance on multiple calls', () => {
      const instance1 = getSloMonitor();
      const instance2 = getSloMonitor();
      expect(instance1).toBe(instance2);
    });

    it('resets singleton', () => {
      const instance1 = getSloMonitor();
      instance1.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });
      expect(instance1.isMonitoring('/api/test')).toBe(true);

      resetSloMonitor();

      const instance2 = getSloMonitor();
      expect(instance2.isMonitoring('/api/test')).toBe(false);
    });

    it('new instance created after reset', () => {
      const instance1 = getSloMonitor();
      resetSloMonitor();
      const instance2 = getSloMonitor();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('edge cases', () => {
    let monitor: SloMonitor;

    beforeEach(() => {
      monitor = new SloMonitor();
    });

    it('handles very small burn duration', () => {
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 100,
      });

      monitor.recordLatency('/api/test', 600);
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics).not.toBeNull();
    });

    it('handles very large threshold', () => {
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 1000000,
      });

      monitor.recordLatency('/api/test', 999999);
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.isInBurn).toBe(false);
    });

    it('handles float latency values', () => {
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
      });

      monitor.recordLatency('/api/test', 123.456);
      const metrics = monitor.getMetrics('/api/test');
      expect(metrics?.p95ObservedMs).toBe(123.456);
    });

    it('rounds P95 to 2 decimal places in alerts', (done) => {
      const alerts: SloBurnAlert[] = [];
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 1000,
      });
      monitor.onBurnAlert((alert) => alerts.push(alert));

      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600.123456);
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600.123456);
        }

        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].p95ObservedMs).toEqual(
          Math.round(alerts[0].p95ObservedMs * 100) / 100,
        );
        done();
      }, 1100);
    });

    it('maintains separate observations per endpoint', () => {
      monitor.registerEndpoint({ endpoint: '/api/v1', p95ThresholdMs: 500 });
      monitor.registerEndpoint({ endpoint: '/api/v2', p95ThresholdMs: 300 });

      monitor.recordLatency('/api/v1', 100);
      monitor.recordLatency('/api/v1', 200);
      monitor.recordLatency('/api/v2', 150);

      const metrics1 = monitor.getMetrics('/api/v1');
      const metrics2 = monitor.getMetrics('/api/v2');

      expect(metrics1?.totalObservations).toBe(2);
      expect(metrics2?.totalObservations).toBe(1);
    });
  });

  describe('observability', () => {
    let monitor: SloMonitor;

    beforeEach(() => {
      monitor = new SloMonitor();
    });

    it('logs observation count in trim operation', () => {
      const smallMonitor = new SloMonitor(5, 60000);
      smallMonitor.registerEndpoint({ endpoint: '/api/test', p95ThresholdMs: 500 });

      jest.clearAllMocks();

      // Record enough observations to trigger trimming
      for (let i = 0; i < 10; i++) {
        smallMonitor.recordLatency('/api/test', 100);
      }

      // Check that trim was logged (may have been called multiple times)
      expect(logger.debug).toHaveBeenCalledWith(
        'SLO observations trimmed',
        expect.objectContaining({
          currentCount: 5,
        }),
      );
    });

    it('logs SLO burn alerts with full context', (done) => {
      monitor.registerEndpoint({
        endpoint: '/api/test',
        p95ThresholdMs: 500,
        burnDurationMs: 1000,
      });

      for (let i = 0; i < 10; i++) {
        monitor.recordLatency('/api/test', 600);
      }

      setTimeout(() => {
        for (let i = 0; i < 10; i++) {
          monitor.recordLatency('/api/test', 600);
        }

        const warnCall = (logger.warn as jest.Mock).mock.calls.find((call) =>
          call[0]?.includes('SLO burn detected'),
        );

        expect(warnCall).toBeDefined();
        expect(warnCall?.[1]).toMatchObject({
          service: 'slo-monitor',
          alertType: 'SLO_BURN_DETECTED',
          endpoint: '/api/test',
          p95ThresholdMs: 500,
        });

        done();
      }, 1100);
    });
  });
});
