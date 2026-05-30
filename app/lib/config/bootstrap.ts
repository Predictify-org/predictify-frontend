/**
 * Application Bootstrap
 * 
 * This module initializes the application with fail-fast configuration validation.
 * Call this at the earliest possible point in the application lifecycle.
 * 
 * SECURITY: Configuration validation must happen before any network calls or wallet operations.
 */

import { validateConfig, getConfig, ValidatedConfig } from './index';
import { logger } from '../logger';

let isBootstrapped = false;

/**
 * Bootstrap the application with configuration validation
 * Call this once at application startup
 * 
 * @throws ConfigValidationError if configuration is invalid
 */
export function bootstrapApplication(): ValidatedConfig {
  if (isBootstrapped) {
    return getConfig();
  }

  try {
    const config = validateConfig();
    
    // Store config globally for access in modules that can't import directly
    (globalThis as any).streampayConfig = config;
    
    isBootstrapped = true;
    
    logger.info('Application bootstrapped successfully', {
      network: config.network.name,
      environment: config.environment,
      is_production: config.network.isProduction,
    });
    
    return config;
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Application bootstrap failed - configuration invalid', {
        error: error.message,
      });
      console.error('\n=== CONFIGURATION ERROR ===');
      console.error(error.message);
      console.error('=============================\n');
    }
    throw error;
  }
}

/**
 * Check if application has been bootstrapped
 */
export function isApplicationBootstrapped(): boolean {
  return isBootstrapped;
}

/**
 * Reset bootstrap state (useful for testing)
 */
export function resetBootstrap(): void {
  isBootstrapped = false;
  delete (globalThis as any).streampayConfig;
}
