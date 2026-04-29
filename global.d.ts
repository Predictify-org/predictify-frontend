declare namespace NodeJS {
  interface ProcessEnv {
    STELLAR_NETWORK?: 'testnet' | 'mainnet' | 'future';
    JWT_SECRET?: string;
    SERVICE_NAME?: string;
    NODE_ENV?: string;
    INTERNAL_AUTH_TOKEN?: string;
    ANOMALY_CREATION_THRESHOLD?: string;
    ANOMALY_SETTLE_THRESHOLD?: string;
    CI?: string;
    GITHUB_ACTIONS?: string;
    TEST_MODE?: string;
  }
}

declare global {
  var streampayConfig: {
    network: any;
    jwtSecret: string;
    serviceName: string;
    environment: string;
    internalAuthToken?: string;
    anomalyThresholds: {
      creationBurstLimit: number;
      settleRateLimit: number;
    };
  } | undefined;
}

export {};
