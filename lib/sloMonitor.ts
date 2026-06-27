import { logger, getCorrelationContext, type CorrelationContext } from '../app/lib/logger';

/**
 * SLO configuration for an endpoint
 */
export interface SloConfig {
  /** Endpoint path or name */
  endpoint: string;
  /** P95 latency threshold in milliseconds */
  p95ThresholdMs: number;
  /** Duration to monitor for SLO breach before alerting (milliseconds) */
  burnDurationMs?: number;
}

/**
 * Observation data point
 */
interface LatencyObservation {
  timestamp: number;
  latencyMs: number;
  endpoint: string;
}

/**
 * SLO burn window tracking
 */
interface BurnWindow {
  startTime: number;
  breachCount: number;
  totalObservations: number;
  p95Observed: number;
}

/**
 * SLO burn alert event
 */
export interface SloBurnAlert {
  type: 'SLO_BURN_DETECTED';
  endpoint: string;
  p95ThresholdMs: number;
  p95ObservedMs: number;
  burnDurationSeconds: number;
  breachPercentage: number;
  timestamp: string;
  correlationId?: string;
}

/**
 * Standardized error response
 */
export interface SloMonitorError {
  type: 'VALIDATION_ERROR' | 'MONITORING_ERROR' | 'STATE_ERROR';
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Monitor metrics snapshot
 */
export interface SloMonitorMetrics {
  endpoint: string;
  p95ThresholdMs: number;
  totalObservations: number;
  p95ObservedMs: number | null;
  isInBurn: boolean;
  burnDurationSeconds: number | null;
}

/**
 * Configuration validation
 */
function validateSloConfig(config: SloConfig): SloMonitorError | null {
  // Validate endpoint
  if (!config.endpoint || typeof config.endpoint !== 'string' || config.endpoint.trim().length === 0) {
    return {
      type: 'VALIDATION_ERROR',
      code: 'INVALID_ENDPOINT',
      message: 'Endpoint must be a non-empty string',
      details: { endpoint: config.endpoint },
    };
  }

  // Validate p95 threshold
  if (typeof config.p95ThresholdMs !== 'number' || config.p95ThresholdMs <= 0 || !Number.isFinite(config.p95ThresholdMs)) {
    return {
      type: 'VALIDATION_ERROR',
      code: 'INVALID_THRESHOLD',
      message: 'P95 threshold must be a positive number',
      details: { p95ThresholdMs: config.p95ThresholdMs },
    };
  }

  // Validate burn duration (optional)
  if (config.burnDurationMs !== undefined) {
    if (typeof config.burnDurationMs !== 'number' || config.burnDurationMs <= 0 || !Number.isFinite(config.burnDurationMs)) {
      return {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_BURN_DURATION',
        message: 'Burn duration must be a positive number',
        details: { burnDurationMs: config.burnDurationMs },
      };
    }
  }

  return null;
}

/**
 * Validate latency observation
 */
function validateLatency(latencyMs: unknown): SloMonitorError | null {
  if (typeof latencyMs !== 'number' || latencyMs < 0 || !Number.isFinite(latencyMs)) {
    return {
      type: 'VALIDATION_ERROR',
      code: 'INVALID_LATENCY',
      message: 'Latency must be a non-negative number',
      details: { latencyMs },
    };
  }
  return null;
}

/**
 * Calculate 95th percentile (p95) from sorted array
 * @param sortedValues - Array of values sorted in ascending order
 * @returns P95 value
 */
function calculateP95(sortedValues: number[]): number | null {
  if (sortedValues.length === 0) {
    return null;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  // P95 index: (95/100) * (n + 1) - 1
  // Using inclusive method for consistency
  const p95Index = (95 / 100) * (sortedValues.length - 1);
  const lower = Math.floor(p95Index);
  const upper = Math.ceil(p95Index);
  const weight = p95Index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  // Linear interpolation between lower and upper values
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * SLO Monitor - tracks p95 latency per endpoint and detects SLO burns
 */
export class SloMonitor {
  private configs: Map<string, SloConfig>;
  private observations: LatencyObservation[];
  private burnWindows: Map<string, BurnWindow>;
  private burnAlertCallbacks: ((alert: SloBurnAlert) => void)[];
  private maxObservations: number;
  private cleanupIntervalMs: number;
  private cleanupInterval: NodeJS.Timeout | null;

  /**
   * Initialize SLO Monitor
   * @param maxObservations - Maximum observations to keep in memory (default: 10000)
   * @param cleanupIntervalMs - How often to clean old observations (default: 60000ms)
   */
  constructor(maxObservations: number = 10000, cleanupIntervalMs: number = 60000) {
    this.configs = new Map();
    this.observations = [];
    this.burnWindows = new Map();
    this.burnAlertCallbacks = [];
    this.maxObservations = maxObservations;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.cleanupInterval = null;

    // Structured logging on initialization
    logger.info('SLO Monitor initialized', {
      service: 'slo-monitor',
      maxObservations,
      cleanupIntervalMs,
    });
  }

  /**
   * Register an SLO configuration for an endpoint
   */
  registerEndpoint(config: SloConfig): void {
    const validationError = validateSloConfig(config);
    if (validationError) {
      logger.error('SLO endpoint registration failed - validation error', {
        service: 'slo-monitor',
        type: validationError.type,
        code: validationError.code,
        message: validationError.message,
        details: validationError.details,
      });
      throw new Error(`SLO configuration validation failed: ${validationError.message}`);
    }

    const finalConfig: SloConfig = {
      ...config,
      burnDurationMs: config.burnDurationMs ?? 300000, // Default: 5 minutes
    };

    this.configs.set(config.endpoint, finalConfig);

    logger.info('SLO endpoint registered', {
      service: 'slo-monitor',
      endpoint: config.endpoint,
      p95ThresholdMs: config.p95ThresholdMs,
      burnDurationMs: finalConfig.burnDurationMs,
    });
  }

  /**
   * Record a latency observation for an endpoint
   */
  recordLatency(endpoint: string, latencyMs: number): void {
    // Validate input
    const latencyError = validateLatency(latencyMs);
    if (latencyError) {
      logger.warn('SLO latency observation rejected - invalid input', {
        service: 'slo-monitor',
        endpoint,
        ...latencyError.details,
      });
      throw new Error(`Invalid latency value: ${latencyError.message}`);
    }

    // Check endpoint is registered
    if (!this.configs.has(endpoint)) {
      logger.warn('SLO latency observation for unregistered endpoint', {
        service: 'slo-monitor',
        endpoint,
      });
      return;
    }

    const observation: LatencyObservation = {
      timestamp: Date.now(),
      latencyMs,
      endpoint,
    };

    this.observations.push(observation);

    // Trim observations if exceeding max
    if (this.observations.length > this.maxObservations) {
      const removed = this.observations.splice(0, this.observations.length - this.maxObservations);
      logger.debug('SLO observations trimmed', {
        service: 'slo-monitor',
        trimmedCount: removed.length,
        currentCount: this.observations.length,
      });
    }

    // Check for SLO burn
    this.checkSloStatus(endpoint);
  }

  /**
   * Check SLO status for an endpoint
   * @private
   */
  private checkSloStatus(endpoint: string): void {
    const config = this.configs.get(endpoint);
    if (!config || !config.burnDurationMs) {
      return;
    }

    const now = Date.now();
    const windowStart = now - config.burnDurationMs;

    // Get observations within the burn window
    const recentObservations = this.observations.filter(
      (obs) => obs.endpoint === endpoint && obs.timestamp >= windowStart,
    );

    if (recentObservations.length === 0) {
      // Clear burn window if no observations
      this.burnWindows.delete(endpoint);
      return;
    }

    // Calculate p95
    const sortedLatencies = recentObservations.map((obs) => obs.latencyMs).sort((a, b) => a - b);
    const p95 = calculateP95(sortedLatencies);

    if (p95 === null) {
      return;
    }

    const isBreach = p95 > config.p95ThresholdMs;
    const currentBurnWindow = this.burnWindows.get(endpoint);

    if (isBreach) {
      if (!currentBurnWindow) {
        // Start new burn window
        this.burnWindows.set(endpoint, {
          startTime: now,
          breachCount: 1,
          totalObservations: recentObservations.length,
          p95Observed: p95,
        });
      } else {
        // Update existing burn window
        currentBurnWindow.breachCount += 1;
        currentBurnWindow.totalObservations = recentObservations.length;
        currentBurnWindow.p95Observed = p95;

        // Check if burn threshold exceeded
        const burnDurationSecs = (now - currentBurnWindow.startTime) / 1000;
        if (burnDurationSecs >= (config.burnDurationMs || 300000) / 1000) {
          this.emitBurnAlert(endpoint, config, p95, recentObservations.length);
          // Reset burn window after alert
          this.burnWindows.delete(endpoint);
        }
      }
    } else {
      // SLO is met, clear burn window
      if (currentBurnWindow) {
        logger.info('SLO breach resolved', {
          service: 'slo-monitor',
          endpoint,
          p95ObservedMs: p95,
          p95ThresholdMs: config.p95ThresholdMs,
          burnDurationSecs: (now - currentBurnWindow.startTime) / 1000,
        });
        this.burnWindows.delete(endpoint);
      }
    }
  }

  /**
   * Emit a burn alert
   * @private
   */
  private emitBurnAlert(endpoint: string, config: SloConfig, p95: number, totalObservations: number): void {
    const now = Date.now();
    const correlationContext = getCorrelationContext();

    const alert: SloBurnAlert = {
      type: 'SLO_BURN_DETECTED',
      endpoint,
      p95ThresholdMs: config.p95ThresholdMs,
      p95ObservedMs: Math.round(p95 * 100) / 100, // Round to 2 decimals
      burnDurationSeconds: Math.round((config.burnDurationMs || 300000) / 1000),
      breachPercentage: Math.round(((p95 - config.p95ThresholdMs) / config.p95ThresholdMs) * 100),
      timestamp: new Date(now).toISOString(),
      correlationId: correlationContext?.correlation_id,
    };

    // Structured logging with correlation ID
    logger.warn('SLO burn detected', {
      service: 'slo-monitor',
      alertType: alert.type,
      endpoint: alert.endpoint,
      p95ThresholdMs: alert.p95ThresholdMs,
      p95ObservedMs: alert.p95ObservedMs,
      burnDurationSeconds: alert.burnDurationSeconds,
      breachPercentage: alert.breachPercentage,
      totalObservations,
      ...correlationContext,
    });

    // Execute registered callbacks
    this.burnAlertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('SLO burn alert callback failed', {
          service: 'slo-monitor',
          endpoint,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Register a callback for SLO burn alerts
   */
  onBurnAlert(callback: (alert: SloBurnAlert) => void): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.burnAlertCallbacks.push(callback);
  }

  /**
   * Get metrics for an endpoint
   */
  getMetrics(endpoint: string): SloMonitorMetrics | null {
    const config = this.configs.get(endpoint);
    if (!config) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - (config.burnDurationMs || 300000);

    const recentObservations = this.observations.filter(
      (obs) => obs.endpoint === endpoint && obs.timestamp >= windowStart,
    );

    const sortedLatencies = recentObservations.map((obs) => obs.latencyMs).sort((a, b) => a - b);
    const p95 = calculateP95(sortedLatencies);

    const burnWindow = this.burnWindows.get(endpoint);

    return {
      endpoint,
      p95ThresholdMs: config.p95ThresholdMs,
      totalObservations: recentObservations.length,
      p95ObservedMs: p95,
      isInBurn: !!burnWindow,
      burnDurationSeconds: burnWindow ? (now - burnWindow.startTime) / 1000 : null,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): SloMonitorMetrics[] {
    return Array.from(this.configs.keys())
      .map((endpoint) => this.getMetrics(endpoint))
      .filter((metric): metric is SloMonitorMetrics => metric !== null);
  }

  /**
   * Reset all state (useful for testing)
   */
  reset(): void {
    this.configs.clear();
    this.observations = [];
    this.burnWindows.clear();
    this.burnAlertCallbacks = [];

    logger.debug('SLO Monitor state reset', {
      service: 'slo-monitor',
    });
  }

  /**
   * Cleanup old observations
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = Math.max(...Array.from(this.configs.values()).map((c) => c.burnDurationMs || 300000)) * 2;

    const initialCount = this.observations.length;
    this.observations = this.observations.filter((obs) => now - obs.timestamp <= maxAge);

    if (this.observations.length < initialCount) {
      logger.debug('SLO observations cleaned', {
        service: 'slo-monitor',
        removedCount: initialCount - this.observations.length,
        remainingCount: this.observations.length,
      });
    }
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanup(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    logger.debug('SLO Monitor cleanup interval started', {
      service: 'slo-monitor',
      intervalMs: this.cleanupIntervalMs,
    });
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;

      logger.debug('SLO Monitor cleanup interval stopped', {
        service: 'slo-monitor',
      });
    }
  }

  /**
   * Get total observation count
   */
  getObservationCount(): number {
    return this.observations.length;
  }

  /**
   * Check if monitoring is active for an endpoint
   */
  isMonitoring(endpoint: string): boolean {
    return this.configs.has(endpoint);
  }
}

// Singleton instance
let instance: SloMonitor | null = null;

/**
 * Get or create the global SLO Monitor instance
 */
export function getSloMonitor(): SloMonitor {
  if (!instance) {
    instance = new SloMonitor();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetSloMonitor(): void {
  if (instance) {
    instance.stopCleanup();
    instance.reset();
    instance = null;
  }
}
