# Internal Service Authentication

## Decision

This repository now protects internal-only API paths with signed HMAC service-to-service authentication instead of a shared long-lived admin password. mTLS in a service mesh remains a valid production option, but the application-layer control implemented here is HMAC with short-lived request signatures and rolling keys.

## Scope

- `POST /api/internal/reconciliation`
- Any future `/api/internal/*` route must call `requireInternalServiceAuth(...)`
- Public user APIs keep their existing end-user auth model and are not implicitly trusted as internal callers

## Threat Model

Protected against:

- Direct `curl` calls from the public internet to internal automation endpoints
- Replay of captured requests outside the configured freshness window
- Signature forgery without access to a valid HMAC key
- Silent fallback to a shared admin password in production

Not fully solved here:

- Mutual TLS between pods and ingress/service mesh
- Vault-backed key delivery and automatic pod reload on secret rotation
- Per-request nonce storage for one-time replay prevention inside the freshness window

## Request Format

Workers sign requests with these headers:

- `x-streampay-service-name`
- `x-streampay-key-id`
- `x-streampay-timestamp`
- `x-streampay-content-sha256`
- `x-streampay-signature`

The signature covers:

1. Signature version
2. HTTP method
3. Request path and query string
4. Calling service name
5. Key ID
6. Timestamp in epoch milliseconds
7. SHA-256 of the request body

## 404 vs 401 Policy

Policy is explicit and route-specific:

- `/api/internal/*` routes return `404` on missing or invalid service auth. This reduces casual discovery, but it is only a concealment layer on top of signature verification.
- Discoverable privileged routes should return `401` or `403` when callers are expected to know the route exists and need actionable auth failures.

Obscurity is not treated as the security control. Signature verification is the actual boundary.

## Configuration

Required for HMAC mode:

```env
INTERNAL_SERVICE_HMAC_KEYS={"current":"<32+ chars>","next":"<32+ chars>"}
INTERNAL_SERVICE_CURRENT_KEY_ID=current
INTERNAL_SERVICE_CLOCK_SKEW_SECONDS=300
```

Production guardrail:

- `INTERNAL_AUTH_TOKEN` is rejected in production so we do not drift back to a single shared long-lived password in env.

## Rotation Story

Recommended rollout:

1. Store at least `current` and `next` keys in Vault or your secret manager.
2. Roll out the new key to workers and API pods via `INTERNAL_SERVICE_HMAC_KEYS`.
3. Switch `INTERNAL_SERVICE_CURRENT_KEY_ID` to the new key once both sides have it.
4. Remove the old key after all callers have rotated.

Because verification accepts any configured key ID, callers can rotate without a hard cutover if both old and new keys are temporarily present.

## Kubernetes Network Policy

Application auth is required, but network policy should still narrow reachability:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: streampay-internal-api
spec:
  podSelector:
    matchLabels:
      app: streampay-frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ops
        - podSelector:
            matchLabels:
              app: reconciliation-worker
      ports:
        - protocol: TCP
          port: 3000
```

Defense in depth expectation:

- Network policy reduces who can connect
- HMAC signatures prove which internal service made the call
- Secret rotation limits blast radius if a key leaks

## Security Notes

- No PII is included in the signature material.
- These internal routes can trigger money-movement-adjacent workflows, so key storage belongs in Vault/KMS-backed secrets rather than committed config or ad hoc env sharing.
- This change does not alter on-chain settlement authorization rules; it hardens who may invoke operational API workflows.
