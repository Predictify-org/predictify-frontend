# TODO - Secure debug KMS signing oracle

- [ ] Step 1: Edit `app/api/debug/kms-sign/route.ts` to hard-disable in production (NODE_ENV === "production" => 404).
- [ ] Step 2: In non-production, require internal-service auth via `requireInternalServiceAuth` with `concealFailure: true`.
- [ ] Step 3: Add strict request validation + bounded payload size (max 16KB) and type checks.
- [ ] Step 4: Remove/avoid logging sensitive payload data; log only safe metadata.
- [ ] Step 5: Replace ad-hoc `{ success, error }` error responses with standard RFC7807 error envelope using `createError`.
- [ ] Step 6: Ensure successful response keeps signature/public key but never returns raw payload.
- [ ] Step 7: Add Jest tests covering production 404, internal-auth concealFailure 404, valid auth success, and payload-too-large error envelope.
- [ ] Step 8: Run tests (`npm test`) and fix any TS/lint issues.

