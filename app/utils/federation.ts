export interface FederationRecord {
  stellar_address: string;
  account_id: string;
  memo_type?: string;
  memo?: string;
}

export type FederationErrorCode =
  | "INVALID_FORMAT"
  | "NETWORK_ERROR"
  | "NOT_FOUND"
  | "SERVER_ERROR";

export class FederationError extends Error {
  constructor(
    message: string,
    public readonly code: FederationErrorCode,
  ) {
    super(message);
    this.name = "FederationError";
  }
}

// user*domain.com — one asterisk, non-empty parts on both sides, domain has a dot
const FEDERATION_ADDRESS_RE = /^[^*\s]+\*[^*\s]+\.[^*\s]+$/;

const cache = new Map<string, FederationRecord>();
const cacheTimestamps = new Map<string, number>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function isFederationAddress(value: string): boolean {
  return FEDERATION_ADDRESS_RE.test(value);
}

export function parseFederationAddress(address: string): {
  username: string;
  domain: string;
} {
  if (!isFederationAddress(address)) {
    throw new FederationError(
      `Invalid Stellar federation address: "${address}"`,
      "INVALID_FORMAT",
    );
  }
  const idx = address.indexOf("*");
  return { username: address.slice(0, idx), domain: address.slice(idx + 1) };
}

async function fetchFederationServerUrl(domain: string): Promise<string> {
  const tomlUrl = `https://${domain}/.well-known/stellar.toml`;
  let response: Response;
  try {
    response = await fetch(tomlUrl, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new FederationError(
      `Could not reach ${domain} to fetch stellar.toml`,
      "NETWORK_ERROR",
    );
  }

  if (!response.ok) {
    throw new FederationError(
      `stellar.toml not found for domain "${domain}"`,
      "NOT_FOUND",
    );
  }

  const text = await response.text();
  const match = text.match(/FEDERATION_SERVER\s*=\s*"?([^"\n]+)"?/);
  if (!match) {
    throw new FederationError(
      `No FEDERATION_SERVER entry in ${domain}'s stellar.toml`,
      "NOT_FOUND",
    );
  }

  return match[1].trim();
}

export async function resolveFederationAddress(
  address: string,
  options: { bypassCache?: boolean } = {},
): Promise<FederationRecord> {
  if (!isFederationAddress(address)) {
    throw new FederationError(
      `"${address}" is not a valid Stellar federation address`,
      "INVALID_FORMAT",
    );
  }

  const key = address.toLowerCase();

  if (!options.bypassCache) {
    const hit = cache.get(key);
    const ts = cacheTimestamps.get(key) ?? 0;
    if (hit && Date.now() - ts < CACHE_TTL_MS) {
      return hit;
    }
  }

  const { domain } = parseFederationAddress(key);
  const federationUrl = await fetchFederationServerUrl(domain);

  const queryUrl = new URL(federationUrl);
  queryUrl.searchParams.set("q", key);
  queryUrl.searchParams.set("type", "name");

  let response: Response;
  try {
    response = await fetch(queryUrl.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new FederationError(
      `Could not reach federation server for "${domain}"`,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 404) {
    throw new FederationError(
      `Federation address "${address}" was not found`,
      "NOT_FOUND",
    );
  }

  if (!response.ok) {
    throw new FederationError(
      `Federation server returned HTTP ${response.status} for "${address}"`,
      "SERVER_ERROR",
    );
  }

  const record = (await response.json()) as FederationRecord;

  cache.set(key, record);
  cacheTimestamps.set(key, Date.now());

  return record;
}

export function clearFederationCache(): void {
  cache.clear();
  cacheTimestamps.clear();
}
