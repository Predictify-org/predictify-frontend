/**
 * Fail-Fast Configuration Validation
 * 
 * This module validates all required environment variables at application boot.
 * If any required configuration is missing or invalid, the application will refuse to start.
 * 
 * SECURITY: No silent fallbacks. No defaults that could route to production.
 * SECURITY: Explicit network selection required. No implicit guessing.
 */

import { 
  getNetworkProfile, 
  getSupportedNetworks, 
  validatePassphraseForNetwork,
  validateHorizonUrlForNetwork,
  StellarNetwork,
  StellarNetworkProfile 
} from './stellar';

/**
 * Configuration validation error
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Required environment variables
 */
interface RequiredEnvVars {
  /** Stellar network: testnet or mainnet */
  STELLAR_NETWORK: StellarNetwork;
  /** JWT secret for authentication tokens */
  JWT_SECRET: string;
  /** Service name for logging */
  SERVICE_NAME?: string;
  /** Node environment */
  NODE_ENV: string;
}

/**
 * Optional environment variables with defaults
 */
interface OptionalEnvVars {
  /** Internal auth token for service-to-service communication */
  INTERNAL_AUTH_TOKEN?: string;
  /** Anomaly detection threshold for stream creation burst */
  ANOMALY_CREATION_THRESHOLD?: string;
  /** Anomaly detection threshold for settlement rate spike */
  ANOMALY_SETTLE_THRESHOLD?: string;
}

/**
 * Validated configuration
 */
export interface ValidatedConfig {
  network: StellarNetworkProfile;
  jwtSecret: string;
  serviceName: string;
  environment: string;
  internalAuthToken?: string;
  anomalyThresholds: {
    creationBurstLimit: number;
    settleRateLimit: number;
  };
}

/**
 * Secret patterns that should never be logged
 */
const SECRET_PATTERNS = [
  /secret/i,
  /private[_\s]?key/i,
  /api[_\s]?key/i,
  /password/i,
  /token/i,
  /auth/i,
  /seed/i,
  /mnemonic/i,
  /signing[_\s]?key/i,
  /access[_\s]?key/i,
];

/**
 * Patterns that are explicitly NOT secrets (public information)
 */
const NOT_SECRET_PATTERNS = [
  /public/i,
  /pubkey/i,
  /public[_\s]?key/i,
];

/**
 * Check if a value looks like a secret
 */
export function isSecret(key: string, value: string): boolean {
  const keyLower = key.toLowerCase();
  
  // First check if it's explicitly NOT a secret (public keys, etc.)
  if (NOT_SECRET_PATTERNS.some(pattern => pattern.test(keyLower))) {
    return false;
  }
  
  // Check if it matches secret patterns
  return SECRET_PATTERNS.some(pattern => pattern.test(keyLower)) || 
         (keyLower.includes('jwt') && value.length > 20);
}

/**
 * Redact secret values for logging
 */
export function redactSecrets(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && isSecret(key, value)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

/**
 * Validate that CI is not using production credentials
 */
function validateCIEnvironment(env: string, network: StellarNetwork): void {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (isCI && network === 'mainnet') {
    throw new ConfigValidationError(
      'CI environment detected with mainnet network configuration. ' +
      'CI must use testnet only to prevent accidental production usage.'
    );
  }
  
  if (isCI && process.env.JWT_SECRET && process.env.JWT_SECRET !== 'streampay-dev-secret-do-not-use-in-prod') {
    throw new ConfigValidationError(
      'CI environment detected with production JWT_SECRET. ' +
      'CI must use test/dev secrets only.'
    );
  }
}

/**
 * Validate Stellar network configuration
 */
function validateStellarNetwork(network: StellarNetwork): StellarNetworkProfile {
  const supportedNetworks = getSupportedNetworks();
  
  if (!network) {
    throw new ConfigValidationError(
      `STELLAR_NETWORK environment variable is required. ` +
      `Supported networks: ${supportedNetworks.join(', ')}`
    );
  }
  
  if (!supportedNetworks.includes(network)) {
    throw new ConfigValidationError(
      `Invalid STELLAR_NETWORK: ${network}. ` +
      `Supported networks: ${supportedNetworks.join(', ')}`
    );
  }
  
  return getNetworkProfile(network);
}

/**
 * Validate JWT secret
 */
function validateJwtSecret(secret: string | undefined): string {
  if (!secret) {
    throw new ConfigValidationError(
      'JWT_SECRET environment variable is required'
    );
  }
  
  if (secret === 'streampay-dev-secret-do-not-use-in-prod' && process.env.NODE_ENV === 'production') {
    throw new ConfigValidationError(
      'Production environment cannot use default JWT_SECRET. ' +
      'Set a secure JWT_SECRET environment variable.'
    );
  }
  
  if (secret.length < 32) {
    throw new ConfigValidationError(
      'JWT_SECRET must be at least 32 characters for security'
    );
  }
  
  return secret;
}

/**
 * Validate anomaly detection thresholds
 */
function validateAnomalyThresholds(
  creationThreshold?: string,
  settleThreshold?: string
): { creationBurstLimit: number; settleRateLimit: number } {
  const creationBurstLimit = creationThreshold ? Number(creationThreshold) : 50;
  const settleRateLimit = settleThreshold ? Number(settleThreshold) : 20;
  
  if (isNaN(creationBurstLimit) || creationBurstLimit <= 0) {
    throw new ConfigValidationError(
      'ANOMALY_CREATION_THRESHOLD must be a positive number'
    );
  }
  
  if (isNaN(settleRateLimit) || settleRateLimit <= 0) {
    throw new ConfigValidationError(
      'ANOMALY_SETTLE_THRESHOLD must be a positive number'
    );
  }
  
  return { creationBurstLimit, settleRateLimit };
}

/**
 * Main configuration validation function
 * Call this at application boot to fail-fast on invalid configuration
 * 
 * @throws ConfigValidationError if configuration is invalid
 */
export function validateConfig(): ValidatedConfig {
  const env = process.env as RequiredEnvVars & OptionalEnvVars;
  
  // Validate network
  const networkProfile = validateStellarNetwork(env.STELLAR_NETWORK);
  
  // Validate JWT secret
  const jwtSecret = validateJwtSecret(env.JWT_SECRET);
  
  // Validate CI environment
  validateCIEnvironment(env.NODE_ENV || 'development', networkProfile.name);
  
  // Validate anomaly thresholds
  const anomalyThresholds = validateAnomalyThresholds(
    env.ANOMALY_CREATION_THRESHOLD,
    env.ANOMALY_SETTLE_THRESHOLD
  );
  
  const config: ValidatedConfig = {
    network: networkProfile,
    jwtSecret,
    serviceName: env.SERVICE_NAME || 'streampay-frontend',
    environment: env.NODE_ENV || 'development',
    internalAuthToken: env.INTERNAL_AUTH_TOKEN,
    anomalyThresholds,
  };
  
  return config;
}

/**
 * Get validated configuration (cached after first call)
 */
let cachedConfig: ValidatedConfig | null = null;

export function getConfig(): ValidatedConfig {
  if (!cachedConfig) {
    cachedConfig = validateConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
