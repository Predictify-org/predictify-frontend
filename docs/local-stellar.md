# Local Stellar Testnet Setup

Get from zero to a running StreamPay UI with funded testnet accounts in one command.

## Prerequisites

- Node.js 18+
- `curl`
- Internet access (for Stellar Friendbot)

## Quick start

```bash
# 1. Copy the env template
cp .env.testnet.example .env.testnet

# 2. Fill in NEXT_PUBLIC_API_URL (point to your local backend)
#    Leave STELLAR_SEED_SECRET_KEY empty — the script generates it.

# 3. Run the bring-up script
bash scripts/stellar-dev.sh

# 4. Copy the printed secret key into .env.testnet
#    (the script prints it; never commit it)

# 5. Start the frontend
npm run dev
```

Open http://localhost:3000 and connect your testnet wallet.

**Time to first successful stream in UI: ~2 minutes.**

---

## What the script does

`scripts/stellar-dev.sh`:

1. Checks `NODE_ENV` — **refuses to run if `NODE_ENV=production`**.
2. Loads `.env.testnet` if present.
3. Validates recommended env vars and warns about missing ones.
4. Generates fresh Ed25519 keypairs (no external SDK required).
5. Funds each account via [Friendbot](https://friendbot.stellar.org).
6. Runs `scripts/seed-streams.js` to POST fixture streams to the local API.

`scripts/seed-streams.js`:

- POSTs three sample streams (monthly salary, weekly stipend, quarterly grant) to `NEXT_PUBLIC_API_URL/streams`.
- Skips gracefully if the API is not running (non-fatal).

---

## Environment variables

See `.env.testnet.example` for the full list. Key variables:

| Variable | Default | Description |
|---|---|---|
| `STELLAR_NETWORK` | `testnet` | Network identifier |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Horizon endpoint |
| `STELLAR_FRIENDBOT_URL` | `https://friendbot.stellar.org` | Friendbot for funding |
| `STELLAR_SEED_SECRET_KEY` | _(generated)_ | Testnet secret key — never commit |
| `STELLAR_SEED_PUBLIC_KEY` | _(generated)_ | Testnet public key |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend API URL |
| `NEXT_PUBLIC_STELLAR_ASSET_CODE` | `XLM` | Asset for streams |
| `ACCOUNTS_TO_CREATE` | `2` | Number of test accounts |

---

## Security notes

- **No default seed phrases.** Keys are generated fresh on every run.
- **Never commit keys.** `.env.testnet` is in `.gitignore`. The script prints a warning next to every secret key.
- **Production guard.** The script exits immediately if `NODE_ENV=production`.
- **Testnet only.** These accounts have no real value. Do not reuse testnet keys on mainnet.
- **No PII.** Fixture streams use placeholder recipient addresses.

---

## Troubleshooting

### Friendbot returns an error

Friendbot rate-limits requests. Wait 30 seconds and retry, or fund manually:

```bash
curl "https://friendbot.stellar.org?addr=<YOUR_PUBLIC_KEY>"
```

### API not running / seed script skips

The seed script is non-fatal. Start your backend first, then re-run:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000 node scripts/seed-streams.js
```

### `NODE_ENV=production` error

The script refuses to run in production. Unset or change `NODE_ENV`:

```bash
NODE_ENV=development bash scripts/stellar-dev.sh
```

### Node.js version too old

The script requires Node.js 18+. Check your version:

```bash
node --version
```

### Horizon connection issues

If `STELLAR_HORIZON_URL` is unreachable, the script still generates keys and prints them. Fund accounts manually via Friendbot or Stellar Laboratory.

---

## Fixture streams

Three sample streams are seeded by `scripts/seed-streams.js`:

| Memo | Amount | Asset |
|---|---|---|
| fixture: monthly salary | 10.0000000 | XLM |
| fixture: weekly stipend | 5.5000000 | XLM |
| fixture: quarterly grant | 100.0000000 | XLM |

Recipient addresses are placeholders. Replace them with real testnet addresses for end-to-end testing.

---

## Soroban local node (future)

Running a local Soroban node is out of scope for this initial setup. The current flow uses the public Stellar testnet. A follow-up issue will add Docker Compose support for a fully offline local environment.
