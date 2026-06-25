# streampay-frontend

**StreamPay** dashboard — Next.js app for Stellar wallet integration and payment stream management.

See [CHANGELOG.md](CHANGELOG.md) for the full API version history.

## API Versioning

StreamPay uses URL-path versioning (`/api/v1/`, `/api/v2/`).

| Path | Status | Sunset |
|------|--------|--------|
| `/api/v2/streams/*` | **Current** | — |
| `/api/v1/streams/*` | Deprecated 2026-04-28 | **2026-12-31** |
| `/api/streams/*` | Alias for v1 | Same as v1 |

**Policy**
- Breaking changes always increment the major version.
- Deprecated versions receive a minimum **90-day notice** before sunset.
- Every response from a deprecated path carries `Deprecation` and `Sunset`
  headers ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745)).
- After the sunset date, deprecated paths return `410 Gone` with a
  machine-readable body and a link to the migration guide.

**Wallet partners on v1:** see [docs/api-v2-migration.md](docs/api-v2-migration.md)
for the full migration guide, including field-by-field diffs and a migration
checklist. Deadline: **2026-12-31**.

## Overview

Next.js 15 (React, TypeScript) frontend for the StreamPay protocol. Users will connect Stellar wallets and create/manage payment streams from this dashboard.

## Security Configuration

This application implements strict environment profiles for Stellar testnet and mainnet to prevent dangerous configuration mistakes. See [docs/network-security.md](docs/network-security.md) for complete security documentation.

### Required Environment Variables

The application will fail to boot without these required variables:

- `STELLAR_NETWORK` - Network selection: `testnet` or `mainnet`
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed browser origins for API requests

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure for testnet (development):
   ```env
   STELLAR_NETWORK=testnet
   JWT_SECRET=dev-secret-key-at-least-32-chars
   ALLOWED_ORIGINS=http://localhost:3000
   NODE_ENV=development
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

### Security Features

- **Fail-fast validation**: Application refuses to start with invalid configuration
- **No silent defaults**: Never falls back to mainnet automatically
- **Explicit CORS allowlist**: Public API origin access is controlled by `ALLOWED_ORIGINS`
- **CI guardrails**: CI is enforced to use testnet only
- **Secret redaction**: All secrets are automatically redacted from logs
- **UI safety labels**: Testnet assets are clearly labeled to prevent confusion
- **Centralized config**: All network configuration in one module

See [docs/network-security.md](docs/network-security.md) for the complete security guide.

## Stream lifecycle (at a glance)

A stream moves through these on-chain states:

`Draft` → `Active` → (`Paused` ↔ `Active`)* → `Settled`

- **Draft**: created and escrowed, not yet streaming. `start_time` and
  `end_time` are not pinned until activation.
- **Active**: vesting linearly between `start_time` and `end_time`.
  Recipient may withdraw vested funds at any time.
- **Paused**: accrual is frozen; vested funds remain withdrawable.
- **Settled**: terminal. All funds released; no further state changes.
- **Cancelled**: terminal alternative to Settled when the sender ends
  the stream early. Remaining unvested funds refund to the sender.

See [docs/STATE_MACHINE.md](docs/STATE_MACHINE.md) for the formal
transition table and invariants.

## Schedule semantics

- Calendar-month schedules use UTC day boundaries for proration.
- Mid-month starts and last-day pauses are prorated using inclusive UTC days.
- Short months use actual day counts (no 30/32-day months).
- Local time display may shift with DST; calculations remain UTC.

## Horizon/Soroban resilience notes

The resilience wrapper in app/lib/stellarClient.ts provides a short-TTL read-through cache for account
and balance reads, plus circuit breaking and per-client timeouts/concurrency limits. When the circuit
is open, stale cached reads may be served to keep non-critical UI paths responsive. These reads are
eventually consistent; balances and account state may lag the chain by the cache TTL or stale window.

Auth and write operations are never cached. Cache keys must include the tenant and account address to
prevent cross-tenant data leakage.

## Persistence seam

Backend stream, idempotency, export, and activity state now sits behind a
pluggable repository interface.

- Default adapter: in-memory (`app/lib/repositories/in-memory.ts`)
- Durable seam: PostgreSQL-oriented adapter contract (`app/lib/repositories/postgres.ts`)
- Design notes and rollout plan: [docs/persistent-store-interface.md](docs/persistent-store-interface.md)

The default runtime behavior remains in-memory until the SQL migration track
cuts the durable adapter in.

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

## Setup for contributors

1. **Clone and enter the repo**
   ```bash
   git clone <repo-url>
   cd streampay-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify setup**
   ```bash
   npm run build
   npm test
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

App will be at `http://localhost:3000`.

## Scripts

| Command        | Description           |
|----------------|-----------------------|
| `npm run dev`  | Start dev server      |
| `npm run build`| Production build      |
| `npm start`    | Run production build  |
| `npm test`     | Run Jest tests        |
| `npm run test:e2e` | Run HTTP lifecycle E2E tests |
| `npm run lint` | Next.js ESLint        |
| `npm run reconcile` | Run nightly reconciliation job |

## CI/CD

On every push/PR to `main`, GitHub Actions runs:

### Standard CI (`.github/workflows/ci.yml`)
- Install: `npm ci`
- Build: `npm run build`
- Tests: `npm test`

### Security Scans (`.github/workflows/security.yml`)

Security gates run on every PR, push to main, and nightly at 2 AM UTC:

1. **CodeQL SAST** - Static Application Security Testing for JavaScript/TypeScript
   - Analyzes source code for security vulnerabilities
   - Results appear in GitHub Security tab
   - Blocks merge on critical findings

2. **Dependency Audit** - npm vulnerability scanning
   - Scans `package-lock.json` for known vulnerabilities
   - **Blocks on CRITICAL** severity unless exempted
   - Exemptions tracked in `.github/security-exemptions.json` with expiry dates
   - Advisory links provided in PR comments

3. **Container Scan** (conditional - only if Dockerfile exists)
   - Trivy scanner checks Docker images for OS/library vulnerabilities
   - Same exemption policy as dependency scan
   - Scans both CRITICAL and HIGH severity

#### Security Exemptions Policy

Vulnerabilities can be exempted temporarily with:
- Valid justification and expiry date (max 90 days)
- No auto-renewal - requires manual review
- 14-day advance notification before expiry
- Tracked in `.github/security-exemptions.json`

#### Local Testing

Mirror CI security checks locally:
```bash
# Check for dependency vulnerabilities
npm audit

# View audit in JSON format
npm audit --json

# Run linting (part of security hygiene)
npm run lint
```

Ensure the workflow passes before merging.

## E2E stream lifecycle harness

The repository includes a black-box HTTP E2E test for stream lifecycle actions:

- `create -> start -> pause -> settle`
- idempotent retries for `create`, `pause`, and `settle`
- DB state assertions after each transition
- mocked Stellar/Soroban settlement at adapter boundary (not business logic)

Run locally:

```bash
npm run test:e2e
```

Notes for contributors:

- The test boots a local Next server on a random localhost port to stay parallel-safe in CI.
- Test isolation uses `resetDb()` before each case.
- Settlement is mocked via `globalThis.__STREAMPAY_STELLAR_SETTLEMENT_CLIENT__` so no real chain keys or network calls are needed.

## Security notes for lifecycle tests

- No private keys, secrets, or wallet credentials are used by the E2E harness.
- Settlement calls are mocked and never submit on-chain transactions.
- Test fixtures avoid PII and keep recipient names synthetic.
- Auth enforcement is currently out of scope for these routes; tests focus on lifecycle correctness and idempotency behavior.

## Project structure

```
streampay-frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── page.test.tsx
│   └── globals.css
├── next.config.ts
├── tsconfig.json
├── jest.config.js
├── jest.setup.ts
├── .github/workflows/ci.yml
└── README.md
```

## API

The app exposes Next.js route handlers under `app/api/`. All routes share a single error envelope (see below).

### Authentication

Wallet-based auth uses a challenge/verify flow:

1. `GET /api/auth/wallet?address=G…` — receive a one-time challenge nonce
2. Sign the challenge with your Stellar private key
3. `POST /api/auth/wallet` — submit `{ address, challenge, signature }` to receive a bearer token
4. Pass the token as `Authorization: Bearer <token>` on all authenticated requests

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/auth/wallet` | — | Issue wallet challenge |
| `POST` | `/api/auth/wallet` | — | Verify signature, get token |
| `GET` | `/api/v2/streams` | Bearer | List streams (v2 shape) |
| `POST` | `/api/v2/streams` | Bearer | Create a stream |
| `POST` | `/api/webhooks/dlq` | — | Receive DLQ webhook events |
| `GET` | `/api/webhooks/deliveries` | — | List delivery attempts |
| `POST` | `/api/debug/kms-sign` | — | Sign payload via KMS (non-prod only) |

### Error envelope

Every error response — regardless of status code — uses this shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested stream does not exist.",
    "request_id": "req_01HZ9ABCDEF"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `string` | Machine-readable error code (e.g. `BAD_REQUEST`, `UNAUTHORIZED`) |
| `message` | `string` | Human-readable detail safe to display |
| `request_id` | `string` | Forwarded from `x-request-id` header, or auto-generated fallback |

The helper lives in `app/lib/errors/index.ts`. Use `errorResponse(code, message, status)` in every route — never return a bare `{ error: "string" }` or `{ success, error }` shape.

### v2 stream shape

`/api/v2/streams` returns streams in the v2 contract. Key differences from v1:

| v1 field | v2 field | Notes |
|----------|----------|-------|
| `actions` | `allowed_actions` | Renamed |
| `createdAt` | `created_at` | snake_case |
| _(absent)_ | `settlement` | `null` until settled |

See `app/lib/api-version.ts` for the `toV2Stream()` conversion and `openapi.json` for the full OpenAPI 3.1 spec.

## Organization Management API

The following endpoints support multi-tenant organization management:

- `POST /api/orgs/[orgId]/members`: Add a member to an organization (Owner-only).
- `GET /api/orgs/[orgId]/members`: List organization members (Member-only).

These endpoints require a valid JWT token obtained via `POST /api/auth/wallet` in the `Authorization: Bearer <token>` header.

## Documentation index

Quick links to the long-form docs under [docs/](docs/):

- [Architecture overview](docs/architecture.md)
- [API client usage](docs/api-client-usage.md)
- [Stream state glossary](docs/stream-state-glossary.md)
- [Error codes reference](docs/error-codes.md)
- [Testing guide](docs/testing-guide.md)
- [Glossary](docs/glossary.md)
- [State machine](docs/STATE_MACHINE.md)
- [Network security](docs/network-security.md)
- [Privacy](docs/PRIVACY.md)
- [Reconciliation runbook](docs/reconciliation-runbook.md)

See also [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md) in the repository root.

## Troubleshooting

A few of the most common local-dev issues:

- **App fails to start with "STELLAR_NETWORK environment variable is required"**
  — copy `.env.example` to `.env.local` and set `STELLAR_NETWORK=testnet`.
- **JWT errors during local auth** — ensure `JWT_SECRET` is at least
  32 characters. Generate one with `openssl rand -base64 32`.
- **CORS errors in the browser** — your origin must appear in
  `ALLOWED_ORIGINS` (comma-separated). The default is
  `http://localhost:3000`.
- **`npm test` cannot find Jest** — run `npm install` first; the test
  runner is a dev dependency.
- **Stale Next.js build artifacts** — delete `.next/` and rebuild.
- **Port 3000 already in use** — set `PORT=3001 npm run dev` or kill
  the process holding the port.

For deeper issues see [docs/network-security.md](docs/network-security.md)
and the runbooks under [docs/runbooks/](docs/runbooks).

## License

MIT

## Smoke tests

This repository includes a CI smoke suite that validates app health and a synthetic stream write/read path.

- `npm run smoke` runs `GET /readyz`, `GET /api/streams`, and a synthetic `POST /api/streams` + `POST /api/streams/{id}/settle`.
- Use `SMOKE_TARGET_URL` to point at a deployed staging endpoint.
- Use `SMOKE_AUTH_TOKEN` for synthetic credentials in CI secrets.

A runtime feature flag is also available for incident mode: set `NEXT_PUBLIC_DISABLE_ONCHAIN_OPERATIONS=true` to pause new on-chain operations in the UI.
