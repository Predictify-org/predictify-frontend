import { Keypair, Networks, Transaction, TransactionBuilder } from "stellar-sdk";
import { Server } from "stellar-sdk/rpc";

export interface StellarClientMetrics {
  increment: (name: string, value?: number) => void;
  gauge?: (name: string, value: number) => void;
  debug?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface FeeBumpPolicy {
  threshold: number;
  multiplier: number;
  maxFeePerOp: number;
  maxTotalFee: number;
}

export interface StellarClientConfig {
  horizonUrl: string;
  networkPassphrase?: string;
  feeBumpPolicy?: Partial<FeeBumpPolicy>;
  metrics?: StellarClientMetrics;
}

const DEFAULT_FEE_BUMP_POLICY: FeeBumpPolicy = {
  threshold: 100,
  multiplier: 5,
  maxFeePerOp: 500_000,
  maxTotalFee: 10_000_000,
};

const FEE_STATS_REFRESH_MS = 60_000;

function noopMetrics(): StellarClientMetrics {
  return {
    increment: () => {},
    gauge: () => {},
    debug: () => {},
  };
}

function ensureFetchAvailable(): typeof fetch {
  if (typeof fetch === "undefined") {
    throw new Error("Global fetch is unavailable; Stellar fee statistics cannot be retrieved.");
  }
  return fetch;
}

function parseMedianFee(feeStats: any): number {
  const medianValue = feeStats?.p50 ?? feeStats?.median;
  if (medianValue == null) {
    throw new Error("Fee stats response is missing a median or p50 value.");
  }
  const median = Number(medianValue);
  if (!Number.isFinite(median) || median < 0) {
    throw new Error("Invalid median fee from Horizon fee stats.");
  }
  return Math.floor(median);
}

function parseSafeInt(value: any, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${name} from Horizon fee stats.`);
  }
  return Math.floor(parsed);
}

export class StellarClient {
  private server: Server;
  private policy: FeeBumpPolicy;
  private metrics: StellarClientMetrics;
  private feeStatsCache: {
    median: number;
    maxFee: number;
    minFee: number;
    fetchedAt: number;
  } | null = null;
  private networkPassphrase: string;

  constructor(config: StellarClientConfig) {
    this.server = new Server(config.horizonUrl);
    this.networkPassphrase = config.networkPassphrase ?? Networks.PUBLIC;
    this.policy = { ...DEFAULT_FEE_BUMP_POLICY, ...(config.feeBumpPolicy ?? {}) };
    this.metrics = config.metrics ?? noopMetrics();
  }

  async submitTransaction(
    signedTransactionXdr: string,
    feeBumpSignerSecret?: string,
  ): Promise<Record<string, unknown>> {
    const feeStats = await this.getFeeStats();
    this.metrics.increment("stellar.transaction.submissionAttempt");
    this.metrics.gauge?.("stellar.feeStats.median", feeStats.median);

    const shouldBump = feeStats.median > this.policy.threshold && Boolean(feeBumpSignerSecret);
    const envelopeXdr = shouldBump
      ? await this.buildFeeBumpEnvelope(signedTransactionXdr, feeBumpSignerSecret!)
      : signedTransactionXdr;

    if (shouldBump) {
      this.metrics.increment("stellar.transaction.feeBumpTriggered");
      this.metrics.debug?.("Fee bump applied", { medianFee: feeStats.median, threshold: this.policy.threshold });
    } else {
      this.metrics.increment("stellar.transaction.feeBumpSkipped");
      if (feeStats.median > this.policy.threshold && !feeBumpSignerSecret) {
        this.metrics.debug?.("Fee bump recommended but no signer provided", { medianFee: feeStats.median });
      }
    }

    try {
      const result = await this.server.submitTransaction(envelopeXdr);
      this.metrics.increment("stellar.transaction.submissionSuccess");
      return result as Record<string, unknown>;
    } catch (error: unknown) {
      this.metrics.increment("stellar.transaction.submissionFailure");
      throw error;
    }
  }

  async getFeeStats(): Promise<{ median: number; maxFee: number; minFee: number }> {
    const now = Date.now();
    if (this.feeStatsCache && now - this.feeStatsCache.fetchedAt < FEE_STATS_REFRESH_MS) {
      this.metrics.increment("stellar.feeStats.cacheHit");
      return this.feeStatsCache;
    }

    this.metrics.increment("stellar.feeStats.fetch");
    const fetchFn = ensureFetchAvailable();
    const feeStatsUrl = new URL("fee_stats", this.server.serverURL).href;
    const response = await fetchFn(feeStatsUrl);

    if (!response.ok) {
      this.metrics.increment("stellar.feeStats.fetchFailure");
      throw new Error(`Failed to fetch Horizon fee stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const feeStats = data?.fee_stats;
    const median = parseMedianFee(feeStats);
    const maxFee = parseSafeInt(feeStats?.max_fee, "max_fee");
    const minFee = parseSafeInt(feeStats?.min_accepted_fee, "min_accepted_fee");

    this.feeStatsCache = {
      median,
      maxFee,
      minFee,
      fetchedAt: now,
    };
    this.metrics.increment("stellar.feeStats.fetchSuccess");
    return this.feeStatsCache;
  }

  private async buildFeeBumpEnvelope(
    signedTransactionXdr: string,
    feeBumpSignerSecret: string,
  ): Promise<string> {
    const innerTransaction = new Transaction(signedTransactionXdr, this.networkPassphrase);
    const feeBumpSigner = Keypair.fromSecret(feeBumpSignerSecret);
    const feeStats = await this.getFeeStats();
    const candidateFeePerOp = Math.min(
      feeStats.median * this.policy.multiplier,
      this.policy.maxFeePerOp,
    );
    const feeBumpFee = Math.min(candidateFeePerOp * innerTransaction.operations.length, this.policy.maxTotalFee);

    this.metrics.gauge?.("stellar.transaction.feeBumpFee", feeBumpFee);
    const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
      feeBumpSigner,
      feeBumpFee.toString(),
      innerTransaction,
      this.networkPassphrase,
    );

    feeBumpTx.sign(feeBumpSigner);
    return feeBumpTx.toEnvelope().toXDR("base64");
  }
}
