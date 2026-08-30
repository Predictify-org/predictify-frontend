Title: Prevent claim retries from duplicating intent

Summary:
- Add client-side intent deduplication to prevent duplicate transaction submissions when users retry claims.
- Persist minimal intent state in `localStorage` with a 24h TTL to allow retries to reuse signed XDR or detected submission hashes.
- Integrate intent handling into `useTransaction` to ensure deterministic behavior across retries and partial failures.

Files changed:
- `lib/transaction/intent.ts` - intent store (get/upsert/remove, computeXdrHash)
- `hooks/useTransaction.hook.ts` - integrate intent deduplication and locking
- `lib/transaction/__tests__/intent.test.ts` - intent store tests
- `hooks/__tests__/useTransaction.test.tsx` - focused transaction flow tests

Behavior and invariants:
- Intent key: `walletAddress:sha256(builtXdr)` ensures same wallet + same built XDR map to same intent.
- If an intent has `submissionHash`, retry polls for confirmation instead of re-submitting.
- If an intent has `signedXdr` but not submitted, retry will re-submit stored `signedXdr` (avoids re-signing in many cases).
- Signed XDRs are removed shortly after successful confirmation to reduce exposure.

Security considerations:
- Signed XDRs are persisted temporarily in `localStorage`. If this is unacceptable, switch to storing only the `xdrHash` and require re-signing on retry.
- Avoid storing private keys or secrets; only XDR strings are stored.

Testing:
- Unit tests cover intent store operations and transaction flows for sign-submit-confirm and retry scenarios.
- Run tests locally with `pnpm test`.

Migration / compatibility:
- No server changes or DB migrations required.
- Public API to `useTransaction.executeTransaction(buildXdr)` unchanged.

Observability:
- Intents are stored with timestamps and status; support can inspect localStorage under `predictify:intents:v1` for debugging.

Next steps (optional):
- Consider encrypting signed XDR in localStorage or reducing persistence TTL.
- Add telemetry/metrics when intents transition to `submitted` and `success`.
