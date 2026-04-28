# streampay-frontend

**StreamPay** dashboard — Next.js app for Stellar wallet integration and payment stream management.

## Overview

Next.js 15 (React, TypeScript) frontend for the StreamPay protocol. Users will connect Stellar wallets and create/manage payment streams from this dashboard.

## Security Configuration

This application implements strict environment profiles for Stellar testnet and mainnet to prevent dangerous configuration mistakes. See [docs/network-security.md](docs/network-security.md) for complete security documentation.

### Required Environment Variables

The application will fail to boot without these required variables:

- `STELLAR_NETWORK` - Network selection: `testnet` or `mainnet`
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)

### Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Configure for testnet (development):
   ```env
   STELLAR_NETWORK=testnet
   JWT_SECRET=dev-secret-key-at-least-32-chars
   NODE_ENV=development
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

### Security Features

- **Fail-fast validation**: Application refuses to start with invalid configuration
- **No silent defaults**: Never falls back to mainnet automatically
- **CI guardrails**: CI is enforced to use testnet only
- **Secret redaction**: All secrets are automatically redacted from logs
- **UI safety labels**: Testnet assets are clearly labeled to prevent confusion
- **Centralized config**: All network configuration in one module

See [docs/network-security.md](docs/network-security.md) for the complete security guide.

## Schedule semantics

- Calendar-month schedules use UTC day boundaries for proration.
- Mid-month starts and last-day pauses are prorated using inclusive UTC days.
- Short months use actual day counts (no 30/32-day months).
- Local time display may shift with DST; calculations remain UTC.

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

## GDPR export support

The app now includes a self-serve export flow for stream and activity history under `/api/exports`.

- `POST /api/exports` creates an async export job
- `GET /api/exports/:id` returns export status
- `GET /api/exports/:id?download=true` returns a short-lived signed URL for the resulting CSV
- Export artifacts are retained for 7 days and signed URLs are short-lived
- Download requests are audited when the signed URL is requested

## Asset Amount Validation Policy

`app/lib/amount.ts` centralizes amount parsing and stream escrow math used by the frontend stream list.

- Supported assets are intentionally allow-listed: `XLM`, `USDC`.
- Amount inputs must be plain decimal strings with at most 7 fractional digits (Stellar stroop precision).
- Negative values are rejected.
- Values above signed int64 bounds are rejected.
- Escrow derivation rejects sub-stroop outcomes (no implicit rounding).
- Validation returns explicit 4xx-style error metadata (`httpStatus` + error `code`) so invalid user input does not bubble into 500-class failures.

## Fuzz and Property-style Tests

- `app/lib/amount.test.ts` includes deterministic fuzz-style checks (seeded RNG) with bounded runtime.
- Bounded fuzz runs in normal CI because it is fast; if runtime grows in the future, keep deterministic unit coverage in CI and move larger fuzz campaigns to nightly workflows.

## License

MIT

## Smoke tests

This repository includes a CI smoke suite that validates app health and a synthetic stream write/read path.

- `npm run smoke` runs `GET /readyz`, `GET /api/streams`, and a synthetic `POST /api/streams` + `POST /api/streams/{id}/settle`.
- Use `SMOKE_TARGET_URL` to point at a deployed staging endpoint.
- Use `SMOKE_AUTH_TOKEN` for synthetic credentials in CI secrets.

A runtime feature flag is also available for incident mode: set `NEXT_PUBLIC_DISABLE_ONCHAIN_OPERATIONS=true` to pause new on-chain operations in the UI.
