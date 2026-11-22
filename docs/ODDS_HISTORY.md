# Market Odds History Chart

The **Odds** tab on the market detail page (`/markets/[id]?tab=odds`) displays how implied "Yes" probability has moved over time.

## Architecture

- **`lib/market-history.ts`**
  - Exports `OddsPoint` (`{ t: number; probability: number }`), `HistoryRange` (`'1D' | '7D' | '30D' | 'All'`), `parseHistoryRange()`, `downsample()`, and `getOddsHistory(marketId, range, options)`.
  - Uses a typed `OddsHistoryProvider` interface backed by a deterministic seeded mock provider (`mockOddsHistoryProvider`).
  - Call `setOddsHistoryProvider(realApiProvider)` to swap in a live backend endpoint without modifying UI components.
  - `downsample()` uses Largest-Triangle-Three-Buckets (LTTB) to cap long series while preserving endpoints and visual peaks/troughs.

- **`components/market/OddsHistoryChart.tsx`**
  - Client component using Recharts (`ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ReferenceLine`, `Tooltip`).
  - Range selector implemented as an accessible `role="radiogroup"` with arrow-key navigation.
  - Persists the selected range in the URL (`?range=7D`) alongside `?tab=odds`. Invalid or missing `range` values fall back to `7D`.
  - Handles loading, empty (e.g. unknown market ID), and error (with retry) states.

- **`components/market/MarketDetailTabs.tsx` & `app/markets/[id]/MarketDetailClient.tsx`**
  - `MarketDetailTabs` extends `TAB_VALUES` with `"odds"` and accepts an optional `odds?: React.ReactNode` prop for backwards compatibility.
  - `MarketDetailClient` wires `MarketDetailTabs` with `<OddsHistoryChart marketId={marketId} />`.

## Accessibility

- **Screen-reader summary**: The chart region exposes an `aria-label` summarizing the range, start, end, min, and max probabilities.
- **Data table fallback**: A semantic `<table>` listing Time and Probability is always present in the DOM for assistive technologies and can be toggled visually via the **Show data table** button.
- **No color-only encoding**: Trend direction pairs icons (`TrendingUp`, `TrendingDown`, `Minus`) with signed percentage text (`+4.2%`, `-1.5%`, `0.0%`).
- **Reduced motion**: Uses `hooks/useReducedMotion.ts` to disable Recharts line animations (`isAnimationActive={!reducedMotion}`) and skeleton pulse animations when `prefers-reduced-motion: reduce` is active.
