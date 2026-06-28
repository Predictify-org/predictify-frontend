/**
 * Ambient environment variable declarations.
 *
 * Documenting every supported env var here gives editor autocompletion
 * and a single grep target for config audits. Keep this in sync with
 * `.env.example`.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /** Stellar network selection. Required at boot. */
    STELLAR_NETWORK?: 'testnet' | 'mainnet' | 'future';
    /** JWT signing secret. Must be 32+ chars in production. */
    JWT_SECRET?: string;
    /** Service name used in structured logs. */
    SERVICE_NAME?: string;
    /** Node runtime mode. */
    NODE_ENV?: string;
    /** Token presented by internal services for service-to-service auth. */
    INTERNAL_AUTH_TOKEN?: string;
    /** Comma-separated CORS allowlist for public API routes. */
    ALLOWED_ORIGINS?: string;
    /** Override for the stream-creation burst anomaly threshold. */
    ANOMALY_CREATION_THRESHOLD?: string;
    /** Override for the settle-rate spike anomaly threshold. */
    ANOMALY_SETTLE_THRESHOLD?: string;
    /** Set by CI providers. */
    CI?: string;
    /** Set by GitHub Actions. */
    GITHUB_ACTIONS?: string;
    /** Enables test-only code paths. Never set in production. */
    TEST_MODE?: string;
  }
}

declare global {
  /**
   * Process-wide cached configuration computed at boot.
   *
   * Modules should prefer reading from this object instead of touching
   * `process.env` directly so that hot-reload semantics stay predictable.
   */
  var streampayConfig: {
    /** Selected Stellar network profile (Horizon URL, passphrase, etc). */
    network: any;
    /** Resolved JWT signing secret. */
    jwtSecret: string;
    /** Logical service name used in logs and traces. */
    serviceName: string;
    /** Resolved NODE_ENV. */
    environment: string;
    /** Internal service-to-service bearer token, if configured. */
    internalAuthToken?: string;
    /** Resolved anomaly detector thresholds. */
    anomalyThresholds: {
      creationBurstLimit: number;
      settleRateLimit: number;
    };
  } | undefined;
}

export {};
