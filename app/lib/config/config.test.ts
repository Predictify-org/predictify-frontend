/**
 * Unit Tests for Stellar Network Configuration
 * 
 * Tests fail-fast validation, secret redaction, and network profile management.
 */

import {
  validateConfig,
  getConfig,
  resetConfigCache,
  ConfigValidationError,
  isSecret,
  redactSecrets,
} from './index';
import {
  getNetworkProfile,
  getSupportedNetworks,
  validatePassphraseForNetwork,
  validateHorizonUrlForNetwork,
  TESTNET_PROFILE,
  MAINNET_PROFILE,
} from './stellar';
import { resetBootstrap } from './bootstrap';

describe('Stellar Network Configuration', () => {
  beforeEach(() => {
    // Reset config cache before each test
    resetConfigCache();
    resetBootstrap();
    // Clear environment variables
    delete process.env.STELLAR_NETWORK;
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
    delete process.env.SERVICE_NAME;
    delete process.env.INTERNAL_AUTH_TOKEN;
    delete process.env.ANOMALY_CREATION_THRESHOLD;
    delete process.env.ANOMALY_SETTLE_THRESHOLD;
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
  });

  describe('Network Profiles', () => {
    it('should return testnet profile', () => {
      const profile = getNetworkProfile('testnet');
      expect(profile).toEqual(TESTNET_PROFILE);
      expect(profile.name).toBe('testnet');
      expect(profile.passphrase).toBe('Test SDF Network ; September 2015');
      expect(profile.horizonUrl).toBe('https://horizon-testnet.stellar.org');
      expect(profile.hasFriendbot).toBe(true);
      expect(profile.isProduction).toBe(false);
    });

    it('should return mainnet profile', () => {
      const profile = getNetworkProfile('mainnet');
      expect(profile).toEqual(MAINNET_PROFILE);
      expect(profile.name).toBe('mainnet');
      expect(profile.passphrase).toBe('Public Global Stellar Network ; September 2015');
      expect(profile.horizonUrl).toBe('https://horizon.stellar.org');
      expect(profile.hasFriendbot).toBe(false);
      expect(profile.isProduction).toBe(true);
    });

    it('should throw error for unsupported network', () => {
      expect(() => getNetworkProfile('future' as any)).toThrow(
        'Unsupported Stellar network: future'
      );
    });

    it('should return supported networks', () => {
      const networks = getSupportedNetworks();
      expect(networks).toContain('testnet');
      expect(networks).toContain('mainnet');
    });

    it('should validate passphrase for network', () => {
      expect(
        validatePassphraseForNetwork('Test SDF Network ; September 2015', 'testnet')
      ).toBe(true);
      expect(
        validatePassphraseForNetwork('Public Global Stellar Network ; September 2015', 'mainnet')
      ).toBe(true);
      expect(
        validatePassphraseForNetwork('Test SDF Network ; September 2015', 'mainnet')
      ).toBe(false);
    });

    it('should validate Horizon URL for network', () => {
      expect(
        validateHorizonUrlForNetwork('https://horizon-testnet.stellar.org', 'testnet')
      ).toBe(true);
      expect(
        validateHorizonUrlForNetwork('https://horizon.stellar.org', 'mainnet')
      ).toBe(true);
      expect(
        validateHorizonUrlForNetwork('https://horizon-testnet.stellar.org', 'mainnet')
      ).toBe(false);
    });
  });

  describe('Config Validation - Required Variables', () => {
    it('should fail if STELLAR_NETWORK is missing', () => {
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow('STELLAR_NETWORK environment variable is required');
    });

    it('should fail if JWT_SECRET is missing', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow('JWT_SECRET environment variable is required');
    });

    it('should fail if JWT_SECRET is too short', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'short';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow('JWT_SECRET must be at least 32 characters');
    });

    it('should fail if production uses default JWT_SECRET', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'streampay-dev-secret-do-not-use-in-prod';
      process.env.NODE_ENV = 'production';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(
        'Production environment cannot use default JWT_SECRET'
      );
    });

    it('should fail if network is invalid', () => {
      process.env.STELLAR_NETWORK = 'invalid' as any;
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow('Invalid STELLAR_NETWORK');
    });
  });

  describe('Config Validation - CI Guardrails', () => {
    it('should fail if CI uses mainnet', () => {
      process.env.STELLAR_NETWORK = 'mainnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      process.env.CI = 'true';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(
        'CI environment detected with mainnet network configuration'
      );
    });

    it('should fail if CI uses production JWT_SECRET', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'production-secret-key-at-least-32-chars';
      process.env.CI = 'true';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(
        'CI environment detected with production JWT_SECRET'
      );
    });

    it('should allow CI with testnet and dev secret', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'streampay-dev-secret-do-not-use-in-prod';
      process.env.CI = 'true';
      const config = validateConfig();
      expect(config.network.name).toBe('testnet');
    });
  });

  describe('Config Validation - Anomaly Thresholds', () => {
    it('should fail if anomaly threshold is invalid', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      process.env.ANOMALY_CREATION_THRESHOLD = 'invalid';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
      expect(() => validateConfig()).toThrow(
        'ANOMALY_CREATION_THRESHOLD must be a positive number'
      );
    });

    it('should fail if anomaly threshold is negative', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      process.env.ANOMALY_CREATION_THRESHOLD = '-10';
      expect(() => validateConfig()).toThrow(ConfigValidationError);
    });

    it('should use default thresholds if not provided', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      const config = validateConfig();
      expect(config.anomalyThresholds.creationBurstLimit).toBe(50);
      expect(config.anomalyThresholds.settleRateLimit).toBe(20);
    });

    it('should use custom thresholds if provided', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      process.env.ANOMALY_CREATION_THRESHOLD = '100';
      process.env.ANOMALY_SETTLE_THRESHOLD = '30';
      const config = validateConfig();
      expect(config.anomalyThresholds.creationBurstLimit).toBe(100);
      expect(config.anomalyThresholds.settleRateLimit).toBe(30);
    });
  });

  describe('Config Validation - Success Path', () => {
    it('should validate testnet configuration successfully', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      process.env.NODE_ENV = 'development';
      const config = validateConfig();
      expect(config.network.name).toBe('testnet');
      expect(config.jwtSecret).toBe('test-secret-at-least-32-characters-long');
      expect(config.environment).toBe('development');
      expect(config.network.isProduction).toBe(false);
    });

    it('should validate mainnet configuration successfully', () => {
      process.env.STELLAR_NETWORK = 'mainnet';
      process.env.JWT_SECRET = 'production-secret-key-at-least-32-chars';
      process.env.NODE_ENV = 'production';
      const config = validateConfig();
      expect(config.network.name).toBe('mainnet');
      expect(config.jwtSecret).toBe('production-secret-key-at-least-32-chars');
      expect(config.environment).toBe('production');
      expect(config.network.isProduction).toBe(true);
    });

    it('should cache configuration after first call', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).toBe(config2);
    });
  });

  describe('Secret Redaction', () => {
    it('should identify secret keys', () => {
      expect(isSecret('JWT_SECRET', 'my-secret')).toBe(true);
      expect(isSecret('PRIVATE_KEY', 'my-key')).toBe(true);
      expect(isSecret('PASSWORD', 'my-password')).toBe(true);
      expect(isSecret('AUTH_TOKEN', 'my-token')).toBe(true);
      expect(isSecret('SEED', 'my-seed')).toBe(true);
    });

    it('should identify JWT secrets by length', () => {
      expect(isSecret('jwt', 'a'.repeat(32))).toBe(true);
      expect(isSecret('jwt', 'short')).toBe(false);
    });

    it('should redact secret values', () => {
      const obj = {
        JWT_SECRET: 'my-secret-key',
        PUBLIC_KEY: 'GABC123',
        username: 'test',
      };
      const redacted = redactSecrets(obj);
      expect(redacted.JWT_SECRET).toBe('[REDACTED]');
      expect(redacted.PUBLIC_KEY).toBe('GABC123');
      expect(redacted.username).toBe('test');
    });

    it('should redact nested secrets', () => {
      const obj = {
        config: {
          JWT_SECRET: 'my-secret-key',
          apiKey: 'my-api-key',
        },
        public: 'data',
      };
      const redacted = redactSecrets(obj);
      expect(redacted.config.JWT_SECRET).toBe('[REDACTED]');
      expect(redacted.config.apiKey).toBe('[REDACTED]');
      expect(redacted.public).toBe('data');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        JWT_SECRET: null,
        PASSWORD: undefined,
        value: 'test',
      };
      const redacted = redactSecrets(obj);
      expect(redacted.JWT_SECRET).toBe(null);
      expect(redacted.PASSWORD).toBe(undefined);
      expect(redacted.value).toBe('test');
    });
  });

  describe('Config Cache', () => {
    it('should reset cache correctly', () => {
      process.env.STELLAR_NETWORK = 'testnet';
      process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long';
      const config1 = getConfig();
      resetConfigCache();
      const config2 = getConfig();
      expect(config1).not.toBe(config2);
    });
  });
});
