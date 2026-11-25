# API Integration Guide

How the Predictify frontend is configured to talk to a backend, the data shapes it
expects, and exactly where real API calls should be introduced. Every path below
is a real file in this repository.

> Status note: the frontend does **not** call a real backend yet. Events and
> transactions are served from in-repo mock data. This guide documents the
> intended integration so the wiring is unambiguous when the API lands. Mocked
> points are flagged inline and summarized at the end.

## Environment configuration

Configuration is centralized in two files.

### `lib/env.ts`

[`lib/env.ts`](../lib/env.ts) reads and validates public environment variables and
exposes a typed `env` object. Defaults are applied when a variable is unset; an
explicitly empty or whitespace-only value is not treated as "unset".

Values are validated with [zod](https://zod.dev): URL variables must parse with
`new URL` and use `http:`/`https:` (trailing slashes are normalised away), the
Stellar network must be `testnet` or `mainnet` (case-insensitive), the app name
must be non-empty after trimming, and the analytics id is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` | Active Stellar network. Validated to be `testnet` or `mainnet`. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api` | Base URL of the backend API. |
| `NEXT_PUBLIC_APP_NAME` | `Predictify` | Application name. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL. |
| `NEXT_PUBLIC_ANALYTICS_ID` | empty | Optional analytics id. |
| `NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID` | empty | Soroban contract address used for market creation. Required by the Create Event flow. |

`parseEnv(source)` is the pure, testable entry point: given a map of values it
returns the validated `env` object or throws one aggregated error listing every
problem (e.g. `ftp://`, a host without a scheme, or `NEXT_PUBLIC_APP_NAME=""`).

`validateEnv()` applies the same rules to `process.env` and runs automatically
when the module is imported:

- in **production** an invalid value throws a readable, aggregated error;
- in **development/test** it logs a warning and falls back to the defaults above
  for the offending keys only, so a typo in `.env.local` does not block local
  work.

### `lib/config.ts`

[`lib/config.ts`](../lib/config.ts) builds a structured `AppConfig` from `env`:

```ts
import { config } from "@/lib/config";

config.app.name; // "Predictify"
config.app.url; // NEXT_PUBLIC_APP_URL
config.stellar.network; // "testnet" | "mainnet"
config.api.url; // NEXT_PUBLIC_API_URL  <-- API base URL
```

`getConfig()` is for any context, `getClientConfig()` is browser-only (it throws
on the server) and is what the wallet kit factory uses in
[`constants/wallet-kits.constant.ts`](../constants/wallet-kits.constant.ts).

> **Unused today:** `NEXT_PUBLIC_API_URL` (exposed as `config.api.url`) is defined
> and validated but is not yet read by any feature code. It exists as the agreed
> integration point. `NEXT_PUBLIC_STELLAR_NETWORK` is consumed today, by the wallet
> kit factory.

## Data shapes

The frontend already models the data it expects. A real API should return these
shapes (or be adapted to them at the fetch boundary).

### Events

Defined in [`types/events.ts`](../types/events.ts):

```ts
interface Event {
  id: string;
  title: string;
  txHash: string;
  category: "Football" | "Politics" | "Crypto" | "Stocks";
  odds: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  status: "ongoing" | "upcoming" | "past";
  timeRemaining?: string;
  timeRemainingMs?: number;
  participants: number;
}
```

The same file defines `EventFilters`, `EventSort`, and `PaginationState`, which
the events store uses for filtering, sorting, and pagination.

> **Mocked today:** events are seeded from the `mockEvents` array inside
> [`lib/events-store.ts`](../lib/events-store.ts). `loadEvents` and `loadNextPage`
> simulate latency with `setTimeout` and never hit the network.

### Transactions and bets

Defined in [`lib/types.ts`](../lib/types.ts):

```ts
interface Transaction {
  date: string;
  type: "deposit" | "bet" | "win" | "withdraw" | "refund";
  amount: string;
  status: "completed" | "pending";
  description: string;
  icon: "down" | "up" | "refresh";
  amountColor: string;
  currency: "XLM" | "USDC";
  numericAmount: number;
}

interface Bet {
  id: string;
  title: string;
  category: BetCategory;
  thumbnail: string;
  startDate: Date;
  endDate: Date;
  timeRemaining: string;
  progress: number; // 0-100
  status: BetStatus; // "active" | "pending" | "completed" | "cancelled"
  odds?: number;
  amount?: number;
  currency?: string;
}
```

`lib/types.ts` also defines `TransactionFilters`, `BetCategory`, `CategoryColor`,
and `BetStatus`.

> **Mocked today:** transactions and bets come from
> [`lib/mock-data.ts`](../lib/mock-data.ts), which exports `allTransactions`
> (`Transaction[]`), `mockActiveBets` (`Bet[]`), and `categoryColors`. Consumers
> include [`app/(dashboard)/bets/page.tsx`](<../app/(dashboard)/bets/page.tsx>),
> [`app/(dashboard)/disputes/page.tsx`](<../app/(dashboard)/disputes/page.tsx>),
> and [`components/transactions/TransactionsHstory.tsx`](../components/transactions/TransactionsHstory.tsx).

## Where real API calls should be introduced

The integration boundary is deliberately narrow. Introduce real calls in these
places, reading the base URL from `config.api.url`:

1. **Events list and pagination** — replace the `setTimeout` simulations in
   `loadEvents` and `loadNextPage` in
   [`lib/events-store.ts`](../lib/events-store.ts) with real requests:

   ```ts
   import { config } from "@/lib/config";
   import type { Event } from "@/types/events";

   loadEvents: async () => {
     set({ loading: true, error: null });
     try {
       const res = await fetch(`${config.api.url}/events`);
       const events: Event[] = await res.json();
       set({ events, loading: false, lastFetchTime: Date.now() });
       get().applyFilters();
     } catch {
       set({ loading: false, error: "Failed to load events" });
     }
   };
   ```

2. **Transactions** — replace imports of `allTransactions` from
   [`lib/mock-data.ts`](../lib/mock-data.ts) with a fetch to
   `${config.api.url}/transactions` that returns `Transaction[]`.

3. **Bets** — replace `mockActiveBets` similarly with `${config.api.url}/bets`
   returning `Bet[]`.

Keeping the request inside the store actions (for events) and at the page or
data-hook level (for transactions and bets) means components keep consuming the
same typed shapes, so no component changes are required when the API is wired in.

## LeaderboardTable component props

`components/leaderboard/LeaderboardTable.tsx` accepts the following props:

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `users` | `LeaderboardUser[]` | Yes | — | Array of leaderboard entries to render. |
| `onUserVisibilityChange` | `(isVisible: boolean) => void` | No | — | Callback invoked when the current user's row enters or leaves the viewport. |
| `onShare` | `() => void` | No | — | Callback invoked when the user clicks the Share button in the sticky action bar. When omitted, the Share button is not rendered. |

### Sticky action bar

When the user scrolls past 50px inside the table viewport, a sticky bottom action bar slides in. It provides:

- **Back to top** – scrolls the table back to the top. Disabled when the user is within 15% of the bottom.
- **Share** – only rendered when `onShare` is provided. Calls the callback on click.
- **Predictor count** – shows the total number of entries (hidden on mobile via `hidden sm:inline`).

The action bar uses `sticky bottom-0` positioning, `backdrop-blur-md`, and respects dark-mode design tokens (`bg-slate-900/95`, `border-slate-800`, `text-slate-400`, `text-cyan-400`).

## Market creation (`create_market`)

`app/(dashboard)/events/new/page.tsx` creates markets on-chain instead of
logging the form. Three modules cooperate:

| Module | Responsibility |
| --- | --- |
| [`lib/market-creation.ts`](../lib/market-creation.ts) | Draft types, zod schema, `validateMarketDraft()` and canonicalization. |
| [`lib/transaction/create-market-intent.ts`](../lib/transaction/create-market-intent.ts) | Deterministic intent key, `create_market` argument encoding and XDR construction. |
| [`hooks/useTransaction.hook.ts`](../hooks/useTransaction.hook.ts) | Signing, submission, confirmation and failure classification. |

### Validation rules

`validateMarketDraft()` returns normalized data or inline field errors. Limits
live in `MARKET_DRAFT_LIMITS`:

- Title: 5–120 characters after trimming.
- Description: 10–1000 characters after trimming.
- Category: one of `Sports`, `Finance`, `Entertainment`, `Politics`, `Technology`, `Other`.
- Deadline: strictly in the future and no more than 365 days away.
- Outcomes: 2–10 non-empty, unique (case-insensitive) strings of at most 80 characters.
- Optional probabilities, when supplied, must be between 0 and 100 and are display-only.

### Contract call

The checked-in contract source/spec does not yet export `create_market`. The
single integration point for its encoding is `encodeCreateMarketArgs()`, which
currently emits:

```
create_market(
  creator: Address,
  title: String,
  description: String,
  category: String,
  deadline: u64,        // unix seconds
  outcomes: Vec<String>,
  is_public: bool,
  featured: bool,
)
```

When the contract ABI lands, update that function and its tests rather than
spreading encoding across the form.

### Configuration and retries

- `NEXT_PUBLIC_PREDICTIFY_CONTRACT_ID` must be set; when it is missing the form
  keeps the draft and shows a recoverable "Could not prepare the transaction"
  error without calling the wallet.
- The intent key is `wallet:create_market:<canonical draft hash>`. The canonical form excludes
  display-only probabilities and truncates the deadline to whole seconds, so the
  same draft maps to the same intent.
- A built XDR is stored through `lib/transaction/intent.ts` and reused on retry,
  and the page guards against double submits while a transaction is in flight.
- Success redirects to `/events`; `userRejected`, `signFailed`, `submitFailed`,
  `confirmationFailed`, `confirmationTimeout` and `buildFailed` each render a
  distinct recoverable message and never clear the form.

## Mocked vs. real status

| Area | Status | Source of truth today |
| --- | --- | --- |
| Environment config | Real | `lib/env.ts`, `lib/config.ts` |
| `NEXT_PUBLIC_API_URL` consumption | Not wired | defined but unused |
| Stellar network selection | Real | `NEXT_PUBLIC_STELLAR_NETWORK` via `lib/config.ts` |
| Market creation | Real (contract ABI pending) | `lib/market-creation.ts`, `lib/transaction/create-market-intent.ts` |
| Wallet connect / disconnect | Real | `hooks/useWallet.hook.ts`, Stellar Wallets Kit |
| Transaction signing network | Partial | hardcoded `WalletNetwork.TESTNET` in `hooks/useWallet.hook.ts` |
| Events data | Mocked | `mockEvents` in `lib/events-store.ts` |
| Events fetch / pagination | Simulated | `setTimeout` in `lib/events-store.ts` |
| Transactions data | Mocked | `allTransactions` in `lib/mock-data.ts` |
| Bets data | Mocked | `mockActiveBets` in `lib/mock-data.ts` |

## See also

- [ARCHITECTURE.md](./ARCHITECTURE.md) for the route, state, and component map.
- [README.md](./README.md) for the documentation index.
