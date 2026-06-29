/**
 * Request fingerprinting for fraud signal correlation.
 *
 * Builds a stable SHA-256 hash from non-volatile request signals so operators
 * can correlate suspicious activity without storing raw IP or User-Agent values
 * in audit metadata. Volatile values (request IDs, timestamps, cookies, auth
 * tokens, and bodies) are intentionally excluded.
 *
 * Uses the Web Crypto API so the module stays Edge-runtime compatible.
 */

export const REQUEST_FINGERPRINT_HEADER = 'x-request-fingerprint';

export const REQUEST_FINGERPRINT_AUDIT_ACTION = 'request.fingerprint.captured';

export interface RequestFingerprintSignals {
  acceptEncoding: string;
  acceptLanguage: string;
  clientIp: string;
  method: string;
  pathname: string;
  userAgent: string;
}

export type RequestFingerprintAuditHook = (
  request: Request,
  fingerprint: string,
) => void | Promise<void>;

let auditCaptureHook: RequestFingerprintAuditHook | null = null;

/**
 * Registers a Node-side audit hook. Edge middleware cannot import the audit log
 * store directly, so production deployments register this hook from server code.
 */
export function setRequestFingerprintAuditHook(
  hook: RequestFingerprintAuditHook | null,
): void {
  auditCaptureHook = hook;
}

export function getRequestFingerprintAuditHook(): RequestFingerprintAuditHook | null {
  return auditCaptureHook;
}

const CLIENT_IP_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'cf-connecting-ip',
  'true-client-ip',
] as const;

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed.length <= 1) {
    return trimmed || '/';
  }
  return trimmed.replace(/\/+$/, '') || '/';
}

function normalizeUserAgent(userAgent: string): string {
  return normalizeWhitespace(userAgent).toLowerCase();
}

function normalizeAcceptLanguage(acceptLanguage: string): string {
  const primary = acceptLanguage.split(',')[0] ?? '';
  return normalizeWhitespace(primary).toLowerCase();
}

function normalizeAcceptEncoding(acceptEncoding: string): string {
  const values = acceptEncoding
    .split(',')
    .map((value) => normalizeWhitespace(value).toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  return values.join(',');
}

/**
 * Extract the best-effort client IP from trusted proxy headers.
 * Only the first hop in X-Forwarded-For is used to avoid spoofing chains.
 */
export function extractClientIp(headers: Headers): string {
  for (const headerName of CLIENT_IP_HEADERS) {
    const raw = headers.get(headerName);
    if (!raw) {
      continue;
    }

    const candidate =
      headerName === 'x-forwarded-for'
        ? raw.split(',')[0]?.trim() ?? ''
        : raw.trim();

    if (candidate) {
      return candidate.toLowerCase();
    }
  }

  return 'unknown';
}

export function extractRequestPathname(request: Request): string {
  const nextPathname = (request as { nextUrl?: { pathname: string } }).nextUrl?.pathname;
  if (nextPathname) {
    return normalizePathname(nextPathname);
  }

  return normalizePathname(new URL(request.url).pathname);
}

export function extractFingerprintSignals(request: Request): RequestFingerprintSignals {
  const headers = request.headers;

  return {
    acceptEncoding: normalizeAcceptEncoding(headers.get('accept-encoding') ?? ''),
    acceptLanguage: normalizeAcceptLanguage(headers.get('accept-language') ?? ''),
    clientIp: extractClientIp(headers),
    method: normalizeMethod(request.method),
    pathname: extractRequestPathname(request),
    userAgent: normalizeUserAgent(headers.get('user-agent') ?? ''),
  };
}

export function normalizeFingerprintSignals(
  signals: RequestFingerprintSignals,
): RequestFingerprintSignals {
  return {
    acceptEncoding: normalizeAcceptEncoding(signals.acceptEncoding),
    acceptLanguage: normalizeAcceptLanguage(signals.acceptLanguage),
    clientIp: signals.clientIp.trim().toLowerCase() || 'unknown',
    method: normalizeMethod(signals.method),
    pathname: normalizePathname(signals.pathname),
    userAgent: normalizeUserAgent(signals.userAgent),
  };
}

function buildFingerprintPayload(signals: RequestFingerprintSignals): string {
  const normalized = normalizeFingerprintSignals(signals);
  const payload = {
    acceptEncoding: normalized.acceptEncoding,
    acceptLanguage: normalized.acceptLanguage,
    clientIp: normalized.clientIp,
    method: normalized.method,
    pathname: normalized.pathname,
    userAgent: normalized.userAgent,
  };

  return JSON.stringify(payload);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeRequestFingerprint(
  signals: RequestFingerprintSignals,
): Promise<string> {
  const payload = buildFingerprintPayload(signals);
  const encoded = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

export async function computeRequestFingerprintFromRequest(
  request: Request,
): Promise<string> {
  return computeRequestFingerprint(extractFingerprintSignals(request));
}

export function getRequestFingerprintFromHeaders(headers: Headers): string | null {
  const fingerprint = headers.get(REQUEST_FINGERPRINT_HEADER)?.trim().toLowerCase() ?? '';
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) {
    return null;
  }
  return fingerprint;
}

export function buildRequestFingerprintLogContext(
  request: Request,
  fingerprint: string,
): Record<string, string> {
  const requestId =
    request.headers.get('x-request-id') ??
    request.headers.get('x-correlation-id') ??
    crypto.randomUUID();

  return {
    event: 'request.fingerprint.captured',
    method: normalizeMethod(request.method),
    pathname: extractRequestPathname(request),
    request_fingerprint: fingerprint,
    request_id: requestId,
  };
}

export function attachRequestFingerprintMetadata(
  request: Request,
  metadata?: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const requestFingerprint = getRequestFingerprintFromHeaders(request.headers);

  return {
    ...metadata,
    requestFingerprint: requestFingerprint ?? null,
  };
}

export async function captureRequestFingerprint(
  request: Request,
): Promise<string> {
  const fingerprint = await computeRequestFingerprintFromRequest(request);

  if (auditCaptureHook) {
    await auditCaptureHook(request, fingerprint);
  }

  return fingerprint;
}
