# Predictify

> Decentralized prediction markets on Stellar / Soroban.

**Live demo:** https://predictify-frontend-livid.vercel.app | **Docs:** `/docs` route and [docs/](docs/) | [Contracts repo](https://github.com/Predictify-org/predictify-contracts)

[![CI](https://github.com/Predictify-org/predictify-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Predictify-org/predictify-frontend/actions/workflows/ci.yml)

## What you can do

Browse prediction markets, place bets, track active positions, dispute outcomes, claim winnings and connect a Stellar wallet (Freighter, LOBSTR, xBull, Albedo, Rabet). Key routes: `/` landing, `/markets`, `/bets`, `/claims`, `/dashboard`, `/predictions`, `/leaderboard`, `/disputes`, `/help`, `/docs`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm type-check` | TypeScript check (excludes test files) |
| `pnpm test` | Jest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests (requires build) |
| `pnpm test:e2e:ui` | Playwright test runner with interactive UI |
| `pnpm storybook` | Start Storybook component workshop on port 6006 |
| `pnpm build-storybook` | Build static Storybook bundle |
| `pnpm storybook:a11y` | Run automated Storybook accessibility checks ([docs/STORYBOOK.md](docs/STORYBOOK.md)) |

CI (`.github/workflows/ci.yml`) runs install, type-check, tests and build on every push and PR.

## End-to-end tests

The `e2e/` directory contains Playwright specs that exercise the app in a real browser. The suite uses a mock Stellar wallet injected by `page.addInitScript` so no browser extension or live Horizon endpoint is required.

### Running locally

```bash
# 1. Install Playwright browsers (one-off, persists in ~/.cache/ms-playwright)
pnpm exec playwright install chromium

# 2. Run the full suite (builds the app first, then starts it on port 3000)
pnpm test:e2e

# 3. Or run against the dev server (faster iteration, no production build needed)
E2E_USE_DEV=1 pnpm test:e2e

# 4. Open the interactive Playwright UI
pnpm test:e2e:ui
```

The `NEXT_PUBLIC_E2E_MOCK_WALLET=1` environment variable is set automatically by `playwright.config.ts`. It activates the mock-wallet seam in `constants/wallet-kits.constant.ts` and is absent from production builds, so the mock code is tree-shaken and never ships.

### Covered flows

| Spec | What it tests |
| --- | --- |
| `e2e/markets.spec.ts` | Browse markets, keyword search, category filter |
| `e2e/market-detail.spec.ts` | Open a market from the list, tab switching, 404 path |
| `e2e/wallet.spec.ts` | Connect via modal, address in navbar, disconnect |
| `e2e/bet-slip.spec.ts` | Amount input, validation errors, keyboard submit, rejection path |

## Architecture

Next.js 15 App Router (`app/`), shared UI in `components/` (Radix + Tailwind), state in Zustand stores (`app/state`) and React context (`context/`), Stellar/Soroban helpers in `lib/stellar`. More in [docs/](docs/) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Deployment

Deploy with `vercel --prod` (Vercel project `predictify-frontend-live` is linked).

### Required Production Environment Variables

- **`NEXT_PUBLIC_APP_URL`** *(required in production)*: The canonical public origin of the deployed app (for example, `https://predictify-frontend-livid.vercel.app`). Used to generate `/sitemap.xml`, `/robots.txt`, `metadataBase`, per-market canonical URLs, Open Graph URLs, and schema.org JSON-LD. Defaults to `http://localhost:3000` in local development.
- **`NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID`** *(required for market creation)*: The Soroban contract address invoked by the Create Event page. Without it, market creation fails with a recoverable configuration error.

All other `NEXT_PUBLIC_*` variables have safe defaults. See
[`.env.example`](./.env.example) for the complete, commented list of supported
variables.

## About

Predictify is designed for anyone who wants to monetize their knowledge and intuition through prediction markets. Whether you're a sports enthusiast, crypto trader, political analyst, or simply someone with good instincts, Predictify provides a transparent, decentralized platform where your predictions can turn into rewards. The platform leverages Stellar's fast, low-cost transactions to ensure seamless user experience with instant payouts and minimal fees.

Built with Next.js 15, React 19, TypeScript, and the Stellar Wallets Kit, Predictify offers a modern, responsive interface that works seamlessly across desktop and mobile devices. The platform supports multiple Stellar wallets including Freighter, LOBSTR, XBull, Albedo, and Rabet, giving users flexibility in how they interact with the blockchain.

## Features

- **Decentralized & Transparent**: All predictions are recorded on-chain with complete transparency. No central authority controls the outcomes.
- **Shareable Prediction Receipts**: Completed predictions can now be shared with a polished receipt summary for campaigns such as GrantFox FWC26.
- **Profile Loading Parity**: Profile loading skeleton now mirrors profile card height, spacing, and shape to reduce first-paint layout jump.
- **Instant Payouts**: Smart contracts automatically distribute winnings immediately after event resolution. No waiting periods.
- **Multi-Wallet Support**: Connect with your preferred Stellar wallet (Freighter, LOBSTR, XBull, Albedo, Rabet).
- **Accessibility First**: WCAG 2.1 AA compliant with reduced-motion support, high contrast themes, and comprehensive screen reader accessibility.
- **Real-Time Markets**: Access live prediction markets with real-time updates on odds, stakes, and participant activity.
- **Side-by-Side Market Comparison**: Compare up to two selected prediction markets in a responsive modal with accessible keyboard and focus support.
- **Advanced Analytics**: Track your prediction performance with detailed analytics and insights.
- **Create Your Markets**: Anyone can create prediction markets on virtually any verifiable future event.
- **Verified Oracles**: Multiple oracle sources ensure accurate and tamper-proof event outcomes.
- **Daily Betting Limit Nudge**: Market cards now surface each user’s remaining daily betting allowance.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Blockchain**: Stellar Network
- **Wallet Integration**: [@creit.tech/stellar-wallets-kit](https://www.npmjs.com/package/@creit.tech/stellar-wallets-kit)
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: Zustand, React Context
- **Form Handling**: React Hook Form, Zod
- **Testing**: Jest, React Testing Library

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **pnpm**: v10.18.0 or higher (required package manager)
- **Git**: For version control

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/predictify-frontend.git
cd predictify-frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the documented example file and adjust anything you need:

```bash
cp .env.example .env.local
```

Every variable, its purpose, allowed values and default is documented in
[`.env.example`](./.env.example) — see [Configuration](#configuration) for the
table below. All values are optional locally; the defaults build and run.
# Use the local event fixtures instead of the API in development
NEXT_PUBLIC_USE_MOCKS=true

Events use the configured `NEXT_PUBLIC_API_URL` by default. Tests automatically use fixtures; set `NEXT_PUBLIC_USE_MOCKS=true` to use local event fixtures during development without a backend.

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 5. Build for Production

```bash
pnpm build
pnpm start
```

## Configuration

The app is configured entirely through environment variables. The committed
[`.env.example`](./.env.example) is the source of truth: it contains a comment
above every entry describing its purpose, allowed values and default. Copy it
before running the app:

```bash
cp .env.example .env.local
```

`.env.local` is git-ignored and must never be committed. Variables prefixed with
`NEXT_PUBLIC_` are embedded in the client bundle, so they must only hold public
values. `NODE_ENV` is managed by Next.js and should not be set in `.env.local`.

| Variable | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Public | `testnet` | Active Stellar network (`testnet` or `mainnet`); invalid values fail validation. |
| `NEXT_PUBLIC_API_URL` | Public | `http://localhost:3000/api` | Base URL of the backend API (`config.api.url`). |
| `NEXT_PUBLIC_APP_NAME` | Public | `Predictify` | Product name used in metadata and UI copy. |
| `NEXT_PUBLIC_APP_URL` | Public | `http://localhost:3000` | Canonical app origin for sitemap, robots, canonical and Open Graph URLs; required in production. |
| `NEXT_PUBLIC_ANALYTICS_ID` | Public | empty (disabled) | Optional analytics provider id. |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL` | Public | empty (network default) | Optional Horizon REST base URL override for `/api/ledger-time`. |
| `NEXT_PUBLIC_NOTIFICATION_STREAM_URL` | Public | empty (disabled) | Optional SSE endpoint for live notifications; empty keeps the mock fallback. |
| `STELLAR_HORIZON_URL` | Server | empty (network default) | Server-only Horizon override for `/api/ledger-time`; takes precedence over the public override. |

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Stellar Network Configuration

Predictify currently supports the Stellar Testnet by default. To switch to Mainnet:

1. Update `constants/wallet-kits.constant.ts`:

   ```typescript
   network: WalletNetwork.MAINNET;
   ```

2. Update your `.env.local`:
   ```env
   NEXT_PUBLIC_STELLAR_NETWORK=mainnet
   ```

**⚠️ Important**: Always test thoroughly on Testnet before deploying to Mainnet. Never use real funds on Testnet.

## Project Structure

```
predictify-frontend/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Authentication routes
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── bets/           # User bets page
│   │   ├── dashboard/      # Main dashboard
│   │   ├── disputes/       # Dispute resolution
│   │   ├── events/         # Events management
│   │   ├── finances/       # Financial overview
│   │   ├── mypredictions/  # User predictions
│   │   ├── profile/        # User profile
│   │   ├── settings/       # Settings page
│   │   └── verification/   # KYC verification
│   └── (marketing)/        # Public marketing pages
├── components/              # React components
│   ├── active-bets/        # Active bets components
│   ├── cards/              # Card components
│   ├── events/             # Event-related components
│   ├── navbar/             # Navigation components
│   ├── sections/           # Page sections
│   └── ui/                 # Reusable UI components (shadcn/ui)
├── context/                 # React Context providers
│   └── WalletContext.tsx   # Wallet state management
├── hooks/                   # Custom React hooks
│   └── useWallet.hook.ts   # Wallet integration hook
├── lib/                     # Utility functions and helpers
├── constants/               # Application constants
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for detailed guidelines.

Quick start:

### Development Workflow

1. **Fork the repository** and create your feature branch:

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our code style:
   - Use TypeScript for all new code
   - Follow the existing code structure and naming conventions
   - Write meaningful commit messages
   - Add tests for new features

3. **Test your changes**:

   ```bash
   pnpm test
   pnpm lint
   ```

4. **Commit your changes**:

   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request** with a clear description of your changes

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules (run `pnpm lint` before committing)
- Use functional components with hooks
- Prefer named exports over default exports
- Keep components small and focused
- Add JSDoc comments for complex functions

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Documentation

- **[Reduced-Motion Patterns](./docs/REDUCED_MOTION_PATTERNS.md)** - Comprehensive guide to implementing accessibility-compliant reduced-motion patterns
- **[Reduced-Motion Quick Reference](./docs/REDUCED_MOTION_QUICK_REFERENCE.md)** - Quick reference for developers implementing reduced-motion support
- [Next.js Documentation](https://nextjs.org/docs)
- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar Wallets Kit](https://github.com/creit-tech/stellar-wallets-kit)
- [Figma Design](https://www.figma.com/design/0WWKE7970cnVtuuTFv8lSI/Predictify)

## Network Information

### Stellar Testnet

- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`
- **Friendbot**: Available for test account funding

### Stellar Mainnet

- **Horizon URL**: `https://horizon.stellar.org`
- **Network Passphrase**: `Public Global Stellar Network ; September 2015`

## Troubleshooting

### Wallet Connection Issues

If you're having trouble connecting your wallet:

1. Ensure your wallet extension is installed and unlocked
2. Check that you're on the correct network (Testnet/Mainnet)
3. Clear browser cache and try again
4. Check the browser console for error messages

### Build Errors

If you encounter build errors:

1. Delete `node_modules` and `.next` directories
2. Run `pnpm install` again
3. Clear pnpm cache: `pnpm store prune`
4. Check that all environment variables are set correctly

## License

[Add your license here]

## Contributors

<!-- Add contributors here -->

- [Your Name](https://github.com/yourusername)

## Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ on Stellar
