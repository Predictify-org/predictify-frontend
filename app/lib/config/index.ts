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
  /** Comma-separated browser origin allowlist for public API requests */
  ALLOWED_ORIGINS: string;
}

/**
 * Optional environment variables with defaults
 */
interface OptionalEnvVars {
  /** Deprecated shared token for service-to-service communication */
  INTERNAL_AUTH_TOKEN?: string;
  /** JSON object map of HMAC key IDs to shared secrets */
  INTERNAL_SERVICE_HMAC_KEYS?: string;
  /** Active key ID used by workers when signing requests */
  INTERNAL_SERVICE_CURRENT_KEY_ID?: string;
  /** Allowed request freshness window in seconds */
  INTERNAL_SERVICE_CLOCK_SKEW_SECONDS?: string;
  /** Anomaly detection threshold for stream creation burst */
  ANOMALY_CREATION_THRESHOLD?: string;
  /** Anomaly detection threshold for settlement rate spike */
  ANOMALY_SETTLE_THRESHOLD?: string;
  /** Anomaly detection threshold for stream cancel burst */
  ANOMALY_CANCEL_THRESHOLD?: string;
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
  allowedOrigins: string[];
  anomalyThresholds: {
    creationBurstLimit: number;
    settleRateLimit: number;
    cancelBurstLimit: number;
  };
  internalServiceAuth?: {
    currentKeyId: string;
    keys: Record<string, string>;
    allowedClockSkewSeconds: number;
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
  /api[_\s]?key/i,
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

function validateAllowedOrigins(rawValue: string | undefined, environment: string): string[] {
  if (!rawValue) {
    throw new ConfigValidationError(
      'ALLOWED_ORIGINS environment variable is required and must be a comma-separated list of origins.'
    );
  }

  const values = rawValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new ConfigValidationError(
      'ALLOWED_ORIGINS must contain at least one origin.'
    );
  }

  if (environment === 'production' && values.includes('*')) {
    throw new ConfigValidationError(
      'Production environment cannot use wildcard ALLOWED_ORIGINS. ' +
      'Specify explicit origins instead.'
    );
  }

  const normalizedOrigins = values.map((origin) => {
    if (origin === '*') {
      return origin;
    }

    try {
      const url = new URL(origin);
      return url.origin;
    } catch {
      throw new ConfigValidationError(
        `ALLOWED_ORIGINS must be a comma-separated list of valid origins. Invalid origin: ${origin}`
      );
    }
  });

  return Array.from(new Set(normalizedOrigins));
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
 *
 * Security hardening (issue #223):
 * - Outside development/test: missing or short secret throws immediately
 *   (fail-fast at boot — no silent fallback to a hardcoded placeholder).
 * - The dev placeholder is only tolerated in NODE_ENV=development|test.
 */
function validateJwtSecret(secret: string | undefined): string {
  if (!secret) {
    throw new ConfigValidationError(
      'JWT_SECRET environment variable is required'
    );
  }
  
  const env   = process.env.NODE_ENV ?? "development";
  const isDev = env === "development" || env === "test";

  if (secret === 'streampay-dev-secret-do-not-use-in-prod' && !isDev) {
    throw new ConfigValidationError(
      'Production environment cannot use default JWT_SECRET'
    );
  }
  
  if (secret.length < 32) {
    throw new ConfigValidationError(
      'JWT_SECRET must be at least 32 characters'
    );
  }
  
  return secret;
}


function validateInternalServiceAuth(
  env: RequiredEnvVars & OptionalEnvVars
): ValidatedConfig["internalServiceAuth"] {
  const hasHmacConfig =
    typeof env.INTERNAL_SERVICE_HMAC_KEYS === "string" ||
    typeof env.INTERNAL_SERVICE_CURRENT_KEY_ID === "string" ||
    typeof env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS === "string";

  if (!hasHmacConfig) {
    if (env.NODE_ENV === "production" && env.INTERNAL_AUTH_TOKEN) {
      throw new ConfigValidationError(
        "INTERNAL_AUTH_TOKEN is not allowed in production. Configure INTERNAL_SERVICE_HMAC_KEYS and INTERNAL_SERVICE_CURRENT_KEY_ID instead."
      );
    }
    return undefined;
  }

  if (!env.INTERNAL_SERVICE_HMAC_KEYS) {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_HMAC_KEYS is required when internal service auth is enabled"
    );
  }

  if (!env.INTERNAL_SERVICE_CURRENT_KEY_ID) {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_CURRENT_KEY_ID is required when internal service auth is enabled"
    );
  }

  let parsedKeys: unknown;
  try {
    parsedKeys = JSON.parse(env.INTERNAL_SERVICE_HMAC_KEYS);
  } catch {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_HMAC_KEYS must be a valid JSON object of key IDs to secrets"
    );
  }

  if (!parsedKeys || typeof parsedKeys !== "object" || Array.isArray(parsedKeys)) {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_HMAC_KEYS must be a JSON object of key IDs to secrets"
    );
  }

  const keys = Object.entries(parsedKeys as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [keyId, secret]) => {
      if (typeof secret !== "string" || secret.length < 32) {
        throw new ConfigValidationError(
          `INTERNAL_SERVICE_HMAC_KEYS['${keyId}'] must be a string at least 32 characters long`
        );
      }
      accumulator[keyId] = secret;
      return accumulator;
    },
    {}
  );

  if (Object.keys(keys).length === 0) {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_HMAC_KEYS must contain at least one signing key"
    );
  }

  if (!keys[env.INTERNAL_SERVICE_CURRENT_KEY_ID]) {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_CURRENT_KEY_ID must reference a key present in INTERNAL_SERVICE_HMAC_KEYS"
    );
  }

  const allowedClockSkewSeconds = env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS
    ? Number(env.INTERNAL_SERVICE_CLOCK_SKEW_SECONDS)
    : 300;

  if (!Number.isFinite(allowedClockSkewSeconds) || allowedClockSkewSeconds <= 0) {
    throw new ConfigValidationError(
      "INTERNAL_SERVICE_CLOCK_SKEW_SECONDS must be a positive number"
    );
  }

  return {
    currentKeyId: env.INTERNAL_SERVICE_CURRENT_KEY_ID,
    keys,
    allowedClockSkewSeconds,
  };
}

/**
 * Validate anomaly detection thresholds
 */
function validateAnomalyThresholds(
  creationThreshold?: string,
  settleThreshold?: string,
  cancelThreshold?: string
): { creationBurstLimit: number; settleRateLimit: number; cancelBurstLimit: number } {
  const creationBurstLimit = creationThreshold ? Number(creationThreshold) : 50;
  const settleRateLimit = settleThreshold ? Number(settleThreshold) : 20;
  const cancelBurstLimit = cancelThreshold ? Number(cancelThreshold) : 5;
  
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
  
  if (isNaN(cancelBurstLimit) || cancelBurstLimit <= 0) {
    throw new ConfigValidationError(
      'ANOMALY_CANCEL_THRESHOLD must be a positive number'
    );
  }
  
  return { creationBurstLimit, settleRateLimit, cancelBurstLimit };
}

/**
 * Main configuration validation function
 * Call this at application boot to fail-fast on invalid configuration
 * 
 * @throws ConfigValidationError if configuration is invalid
 */
export function validateConfig(): ValidatedConfig {
  const env = process.env as unknown as RequiredEnvVars & OptionalEnvVars;
  
  // Validate network
  const networkProfile = validateStellarNetwork(env.STELLAR_NETWORK);
  
  // Validate JWT secret
  const jwtSecret = validateJwtSecret(env.JWT_SECRET);
  
  // Validate CI environment
  validateCIEnvironment(env.NODE_ENV || 'development', networkProfile.name);
  
  // Validate ALLOWED_ORIGINS for browser API requests
  const allowedOrigins = validateAllowedOrigins(env.ALLOWED_ORIGINS, env.NODE_ENV || 'development');
  
  // Validate anomaly thresholds
  const anomalyThresholds = validateAnomalyThresholds(
    env.ANOMALY_CREATION_THRESHOLD,
    env.ANOMALY_SETTLE_THRESHOLD,
    env.ANOMALY_CANCEL_THRESHOLD
  );

  const internalServiceAuth = validateInternalServiceAuth(env);
  
  const config: ValidatedConfig = {
    network: networkProfile,
    jwtSecret,
    serviceName: env.SERVICE_NAME || 'streampay-frontend',
    environment: env.NODE_ENV || 'development',
    internalAuthToken: env.INTERNAL_AUTH_TOKEN,
    allowedOrigins,
    anomalyThresholds,
    internalServiceAuth,
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
