export interface DisputeEvidenceCandidate {
  label?: string;
  url: string;
  isPrivate?: boolean;
  preview?: string;
}

export type DisputeEvidenceInput =
  | string
  | DisputeEvidenceCandidate
  | Array<string | DisputeEvidenceCandidate>;

export interface NormalizedDisputeEvidence {
  id: string;
  label: string;
  url: string;
  isPrivate: boolean;
  isValid: boolean;
  preview: string;
}

const MAX_EVIDENCE_URL_LENGTH = 2048;

function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function isSafeEvidenceUrl(value: string): boolean {
  if (typeof value !== 'string') return false;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_EVIDENCE_URL_LENGTH) return false;

  try {
    const parsed = new URL(trimmed);
    const allowedProtocols = new Set(['https:', 'http:']);
    const protocol = parsed.protocol.toLowerCase();

    if (!allowedProtocols.has(protocol)) return false;
    if (parsed.username || parsed.password) return false;
    if (!parsed.hostname) return false;
    if (protocol === 'http:' && !isLocalhostHostname(parsed.hostname)) {
      return false;
    }

    const unsafeProtocols = ['javascript:', 'data:', 'file:', 'blob:'];
    return !unsafeProtocols.some((unsafe) => trimmed.toLowerCase().startsWith(unsafe));
  } catch {
    return false;
  }
}

export function getEvidencePreviewLabel(value?: string): string {
  if (typeof value !== 'string' || !value.trim()) return 'Evidence preview';

  if (!isSafeEvidenceUrl(value)) return 'Evidence preview';

  return 'Evidence preview';
}

export function normalizeDisputeEvidence(
  evidence?: DisputeEvidenceInput
): NormalizedDisputeEvidence[] {
  const entries = Array.isArray(evidence) ? evidence : evidence == null ? [] : [evidence];
  if (!entries.length) {
    return [];
  }

  const seen = new Set<string>();

  return entries.reduce<NormalizedDisputeEvidence[]>((items, entry) => {
    const candidate = typeof entry === 'string' ? { url: entry } : entry;

    if (!candidate || typeof candidate.url !== 'string') {
      return items;
    }

    const normalizedUrl = candidate.url.trim();
    if (!isSafeEvidenceUrl(normalizedUrl)) {
      return items;
    }

    const dedupeKey = normalizedUrl.toLowerCase();
    if (seen.has(dedupeKey)) {
      return items;
    }
    seen.add(dedupeKey);

    const label = (candidate.label && candidate.label.trim()) || getEvidencePreviewLabel(normalizedUrl);
    const preview = (candidate.preview && candidate.preview.trim()) || label;

    items.push({
      id: `${label}-${dedupeKey}`,
      label,
      url: normalizedUrl,
      isPrivate: Boolean(candidate.isPrivate),
      isValid: true,
      preview,
    });

    return items;
  }, []);
}
