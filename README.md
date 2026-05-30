# streampay-frontend

**StreamPay** dashboard — Next.js app for Stellar wallet integration and payment stream management.

## Overview

Next.js 15 (React, TypeScript) frontend for the StreamPay protocol. Users will connect Stellar wallets and create/manage payment streams from this dashboard.

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
| `npm run lint` | Next.js ESLint        |

## CI/CD

On every push/PR to `main`, GitHub Actions runs:

- Install: `npm ci`
- Build: `npm run build`
- Tests: `npm test`

Ensure the workflow passes before merging.

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

## Organization Management API

The following endpoints support multi-tenant organization management:

- `POST /api/orgs/[orgId]/members`: Add a member to an organization (Owner-only).
- `GET /api/orgs/[orgId]/members`: List organization members (Member-only).

These endpoints require a valid JWT token obtained via `POST /api/auth/wallet` in the `Authorization: Bearer <token>` header.

## License

MIT
