# Request Fingerprinting

StreamPay computes a stable request fingerprint for fraud signal correlation
on every `/api/*` request. The fingerprint is a SHA-256 hash of normalized,
non-volatile request signals and is intentionally separate from idempotency
fingerprints (which include request bodies).

## Signals included

| Signal | Source | Normalization |
|---|---|---|
| HTTP method | `request.method` | Uppercase |
| Pathname | Request URL | Trailing slashes removed |
| Client IP | `x-forwarded-for` (first hop), `x-real-ip`, `cf-connecting-ip`, `true-client-ip` | Lowercase; falls back to `unknown` |
| User-Agent | `user-agent` header | Trimmed, lowercased |
| Accept-Language | `accept-language` header | Primary tag only, lowercased |
| Accept-Encoding | `accept-encoding` header | Sorted, lowercased |

## Signals excluded

The fingerprint must remain stable across retries and must not leak secrets:

- Request body and query parameters
- Cookies, authorization headers, and idempotency keys
- Request IDs, correlation IDs, and timestamps

## Propagation

1. Edge middleware (`middleware.ts`) computes the fingerprint via `lib/fingerprint.ts`.
2. The hash is attached to the downstream request as `x-request-fingerprint`.
3. Node server code registers an audit hook (`lib/fingerprint-audit.ts`) that
   appends `request.fingerprint.captured` entries to the audit log with the
   incoming `x-request-id` / `x-correlation-id`.
4. Privileged stream audit events automatically include `requestFingerprint`
   metadata when the header is present.

## API surface

There is no public response field for the fingerprint. It is an internal header
used for fraud correlation and audit enrichment only. External clients must not
send or rely on `x-request-fingerprint`.

## Testing

Run the focused domain tests:

```bash
npm test -- lib/fingerprint.test.ts lib/fingerprint-audit.test.ts middleware.test.ts
```

Coverage targets edge cases such as forwarded IP chains, header normalization,
invalid fingerprint headers, and middleware propagation on both success and
413 error paths.
