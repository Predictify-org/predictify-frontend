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
exposes a typed `env` object. Defaults are applied when a variable is unset.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` | Active Stellar network. Validated to be `testnet` or `mainnet`. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api` | Base URL of the backend API. |
| `NEXT_PUBLIC_APP_NAME` | `Predictify` | Application name. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public app URL. |
| `NEXT_PUBLIC_ANALYTICS_ID` | empty | Optional analytics id. |

`validateEnv()` enforces required variables in production and validates the
network value. It runs automatically when the module is imported in production.

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

## Mocked vs. real status

| Area | Status | Source of truth today |
| --- | --- | --- |
| Environment config | Real | `lib/env.ts`, `lib/config.ts` |
| `NEXT_PUBLIC_API_URL` consumption | Not wired | defined but unused |
| Stellar network selection | Real | `NEXT_PUBLIC_STELLAR_NETWORK` via `lib/config.ts` |
| Wallet connect / disconnect | Real | `hooks/useWallet.hook.ts`, Stellar Wallets Kit |
| Transaction signing network | Partial | hardcoded `WalletNetwork.TESTNET` in `hooks/useWallet.hook.ts` |
| Events data | Mocked | `mockEvents` in `lib/events-store.ts` |
| Events fetch / pagination | Simulated | `setTimeout` in `lib/events-store.ts` |
| Transactions data | Mocked | `allTransactions` in `lib/mock-data.ts` |
| Bets data | Mocked | `mockActiveBets` in `lib/mock-data.ts` |

## See also

- [ARCHITECTURE.md](./ARCHITECTURE.md) for the route, state, and component map.
- [README.md](./README.md) for the documentation index.
