import { validateConfig } from "@/app/lib/config";
import { getSigner } from "@/app/lib/kms/factory";
import { createResilientStellarClient } from "@/app/lib/stellarClient";
import { TenantScopedCache } from "@/app/lib/cache";

export type HealthStatus = "ok" | "degraded";

export type DependencyCheckResult = {
  status: HealthStatus;
  message?: string;
  checked_at: string;
};

export type ReadinessReport = {
  status: HealthStatus;
  checks: Record<string, DependencyCheckResult>;
};

export type HealthCheckDependencies = {
  now?: () => Date;
  validateConfig?: typeof validateConfig;
  getSigner?: typeof getSigner;
  createStellarClient?: typeof createResilientStellarClient;
  /** Injectable fetch for Soroban ping (defaults to global fetch) */
  fetch?: typeof fetch;
};

async function runCheck(
  now: () => Date,
  check: () => Promise<void> | void,
): Promise<DependencyCheckResult> {
  const checkedAt = now().toISOString();
  try {
    await check();
    return { status: "ok", checked_at: checkedAt };
  } catch (error) {
    return {
      status: "degraded",
      message: error instanceof Error ? error.message : "Dependency check failed.",
      checked_at: checkedAt,
    };
  }
}

/**
 * 5-second cache for the Soroban ping result.
 * Keyed by tenant="health" id=sorobanRpcUrl to avoid cross-URL pollution.
 */
const sorobanCache = new TenantScopedCache<DependencyCheckResult>("soroban-ping", 5_000);

/**
 * Ping the Soroban RPC endpoint with a 1-second timeout.
 * Uses the JSON-RPC `getHealth` method which all Soroban nodes expose.
 * Returns "ok" if the node responds, "degraded" if it times out or errors.
 * Result is cached for 5 s to avoid hammering RPC on every readyz poll.
 */
async function checkSoroban(
  sorobanRpcUrl: string,
  now: () => Date,
  fetcher: typeof fetch,
): Promise<DependencyCheckResult> {
  const cached = sorobanCache.get("health", sorobanRpcUrl);
  if (cached) return cached;

  const result = await runCheck(now, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1_000);
    try {
      const res = await fetcher(sorobanRpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth", params: [] }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Soroban RPC returned HTTP ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  });

  sorobanCache.set("health", sorobanRpcUrl, result);
  return result;
}

export async function getReadinessReport(
  dependencies: HealthCheckDependencies = {},
): Promise<ReadinessReport> {
  const now = dependencies.now ?? (() => new Date());
  const validate = dependencies.validateConfig ?? validateConfig;
  const signerFactory = dependencies.getSigner ?? getSigner;
  const stellarClientFactory = dependencies.createStellarClient ?? createResilientStellarClient;
  const fetcher = dependencies.fetch ?? fetch;

  const configCheck = await runCheck(now, () => {
    validate();
  });

  let horizonUrl = "";
  const stellarCheck = await runCheck(now, async () => {
    const config = validate();
    horizonUrl = config.network.horizonUrl;
    const client = stellarClientFactory({
      tenant: "readiness",
      network: config.network.name,
      timeoutMs: 2000,
      circuitBreaker: { failureThreshold: 1 },
    });
    await client.readAccount<unknown>({
      url: config.network.horizonUrl,
      address: config.network.name,
      critical: true,
    });
  });

  const kmsCheck = await runCheck(now, async () => {
    const signer = signerFactory();
    const publicKey = await signer.getPublicKey();
    if (!publicKey) {
      throw new Error("KMS signer did not return a public key.");
    }
  });

  // Soroban ping — skipped gracefully if no URL is configured
  let sorobanCheck: DependencyCheckResult | null = null;
  try {
    const config = validate();
    if (config.network.sorobanRpcUrl) {
      sorobanCheck = await checkSoroban(config.network.sorobanRpcUrl, now, fetcher);
    }
  } catch {
    // config already failed above; don't double-report
  }

  const checks: ReadinessReport["checks"] = {
    config: configCheck,
    stellar: {
      ...stellarCheck,
      ...(horizonUrl && stellarCheck.status === "ok" ? { message: `reachable: ${horizonUrl}` } : {}),
    },
    kms: kmsCheck,
    ...(sorobanCheck !== null ? { soroban: sorobanCheck } : {}),
  };

  return {
    status: Object.values(checks).every((check) => check.status === "ok") ? "ok" : "degraded",
    checks,
  };
}
