import {
  buildRequestId,
  auditLogStore,
  resolveAuditActor,
} from '@/app/lib/audit-log';
import {
  REQUEST_FINGERPRINT_AUDIT_ACTION,
  buildRequestFingerprintLogContext,
  computeRequestFingerprintFromRequest,
  extractRequestPathname,
  getRequestFingerprintFromHeaders,
  setRequestFingerprintAuditHook,
} from '@/lib/fingerprint';

export async function recordRequestFingerprintAudit(
  request: Request,
  fingerprint?: string,
): Promise<void> {
  const resolvedFingerprint =
    fingerprint ??
    getRequestFingerprintFromHeaders(request.headers) ??
    (await computeRequestFingerprintFromRequest(request));

  auditLogStore.append({
    action: REQUEST_FINGERPRINT_AUDIT_ACTION,
    actor: resolveAuditActor(request),
    requestId: buildRequestId(request),
    target: {
      id: extractRequestPathname(request),
      type: 'request',
    },
    metadata: {
      method: request.method.toUpperCase(),
      pathname: extractRequestPathname(request),
      requestFingerprint: resolvedFingerprint,
    },
  });
}

export async function handleRequestFingerprintAuditHook(
  request: Request,
  fingerprint: string,
): Promise<void> {
  await recordRequestFingerprintAudit(request, fingerprint);

  const logContext = buildRequestFingerprintLogContext(request, fingerprint);
  console.info(JSON.stringify(logContext));
}

setRequestFingerprintAuditHook(handleRequestFingerprintAuditHook);
