# streampay-frontend

**StreamPay** dashboard — Next.js app for Stellar wallet integration and payment stream management.

## Overview

Next.js 15 (React, TypeScript) frontend for the StreamPay protocol. Users will connect Stellar wallets and create/manage payment streams from this dashboard.

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

## License

MIT
