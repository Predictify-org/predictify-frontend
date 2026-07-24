# Recently viewed markets rail

A horizontal scrolling rail on the dashboard (`app/(dashboard)/dashboard/page.tsx`)
showing markets the user has visited recently. Works identically to the
recommendations strip and active bets carousel.

## Pieces

| File | Responsibility |
| --- | --- |
| [`hooks/useRecentlyViewed.ts`](../hooks/useRecentlyViewed.ts) | Syncs a max-10 list of `{id, title, category, href, viewedAt}` to `localStorage` under `predictify-recently-viewed`. Uses `useSyncExternalStore` for reactivity. |
| [`app/components/RecentlyViewedRail.tsx`](../app/components/RecentlyViewedRail.tsx) | Renders the scrollable rail, empty state, dismissible cards, and keyboard/scroll-arrow interaction. |
| [`app/(dashboard)/events/event-page/EventDetailsClient.tsx`](../app/(dashboard)/events/event-page/EventDetailsClient.tsx) | Calls `addRecentlyViewed({id, title, category, href})` on mount so the event appears in the rail. |

## Tracking

The rail is populated automatically — visiting any event detail page calls
`addRecentlyViewed` via the `useRecentlyViewed` hook. Each entry stores
`viewedAt` as a timestamp; the list is always ordered most-recent-first.
Duplicate visits to the same market move it back to position 1 (dedup by id).

## Data model

### `RecentlyViewedItem` (`hooks/useRecentlyViewed.ts`)

```ts
interface RecentlyViewedItem {
  id: string
  title: string
  category: string
  href: string
  viewedAt: number  // Date.now() when visited
}
```

Stored in `localStorage` under `predictify-recently-viewed`. Max 10 items;
oldest items are evicted when the limit is reached.

## Keyboard & scroll behavior

Mirrors the same pattern as `RecommendationsStrip` and `ActiveBets`:
- `role="region"`, `aria-label`, `tabIndex={0}`
- `ArrowLeft` / `ArrowRight` scroll by one viewport width
- Left/right arrow buttons appear on hover/focus-within of the container (`group-hover:opacity-100`)
- Every card is a `<Link>` and the container is in normal tab order, so no card is inaccessible without the arrows

## Empty state

When no markets have been viewed yet, a dashed-border placeholder message is shown:
"No recently viewed markets — markets you visit will appear here so you can quickly
find them again."

## Dismissal

Each card has a small `X` button (top-right corner) that calls `removeRecentlyViewed`
and removes the card from the rail immediately.

## Storage key

`predictify-recently-viewed` — follows the naming convention of other localStorage
keys in the project (`predictify-follows`, `predictify_wallet_prefs`, etc.).

## Testing

Tests live alongside their source files:

```
hooks/__tests__/useRecentlyViewed.test.ts
app/components/__tests__/RecentlyViewedRail.test.tsx
```

Run them with:
```bash
npm test hooks/__tests__/useRecentlyViewed
npm test app/components/__tests__/RecentlyViewedRail
```

The hook tests cover: empty initial state, add, prepend order, dedup, 10-item
limit, remove, clear, cross-mount persistence, and localStorage quota errors.

The component tests cover: empty state rendering, populated state (heading,
titles, categories, links, remove buttons), remove interaction, aria-label,
tabIndex, and keyboard scrolling.
