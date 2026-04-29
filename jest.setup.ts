/// <reference types="node" />
import "@testing-library/jest-dom";

// =============================================================================
// Test Environment Configuration
// =============================================================================
// SECURITY: Tests run in testnet mode only to prevent accidental mainnet usage
// These values are safe for testing - they match the dev secrets documented
// in .env.example and are NOT production credentials
// =============================================================================

// Set required environment variables for testing
process.env.STELLAR_NETWORK = process.env.STELLAR_NETWORK || "testnet";
process.env.JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.SERVICE_NAME = process.env.SERVICE_NAME || "streampay-frontend-test";

// Security validation for test environment
if (process.env.STELLAR_NETWORK !== "testnet") {
  throw new Error(
    "SECURITY: Tests must run on testnet only. " +
    `STELLAR_NETWORK was set to: ${process.env.STELLAR_NETWORK}`
  );
}

// Reset config cache before each test to ensure clean state
// This is handled in individual test files via resetConfigCache()
