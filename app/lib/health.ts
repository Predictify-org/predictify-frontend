import { validateConfig } from "@/app/lib/config";
import { getSigner } from "@/app/lib/kms/factory";
import { createResilientStellarClient } from "@/app/lib/stellarClient";

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

export async function getReadinessReport(
  dependencies: HealthCheckDependencies = {},
): Promise<ReadinessReport> {
  const now = dependencies.now ?? (() => new Date());
  const validate = dependencies.validateConfig ?? validateConfig;
  const signerFactory = dependencies.getSigner ?? getSigner;
  const stellarClientFactory = dependencies.createStellarClient ?? createResilientStellarClient;

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

  const checks: ReadinessReport["checks"] = {
    config: configCheck,
    stellar: {
      ...stellarCheck,
      ...(horizonUrl && stellarCheck.status === "ok" ? { message: `reachable: ${horizonUrl}` } : {}),
    },
    kms: kmsCheck,
  };

  return {
    status: Object.values(checks).every((check) => check.status === "ok") ? "ok" : "degraded",
    checks,
  };
}
