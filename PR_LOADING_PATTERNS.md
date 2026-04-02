# feat(design): loading skeletons and async state patterns

## 📝 Description

Implements loading skeletons for the three core surfaces (markets list, event detail, events table), inline async loading states for buttons/forms, and error + retry banners for network failures. All patterns are layout-shift-free.

## 🎯 Type of Change

- [x] 🎨 Style/UI changes
- [x] ✨ New feature (non-breaking change which adds functionality)

## 🔗 Related Issues

Closes #design/loading

## 📋 Changes Made

### New Files

| File | Purpose |
|------|---------|
| `components/skeletons/markets-skeleton.tsx` | `MarketCardSkeleton` + `MarketsListSkeleton` — mirrors market card layout exactly |
| `components/skeletons/event-detail-skeleton.tsx` | `EventDetailSkeleton` — covers badges, title, stat grid, options, form |
| `components/ui/async-button.tsx` | `AsyncButton` — inline spinner + loading text, auto-disables |
| `components/ui/error-banner.tsx` | `ErrorBanner` — destructive alert with optional Retry action |
| `app/(dashboard)/loading-patterns/page.tsx` | Demo page showing all 3 surfaces + patterns |

### Modified Files

| File | Change |
|------|--------|
| `app/(dashboard)/events/event-page/page.tsx` | Added `isLoading`/`fetchError` states; renders skeleton on load, error banner on failure; replaced manual `Loader2` button with `AsyncButton` |
| `components/events/events-section.tsx` | Reads `error` from events store; renders `ErrorBanner` with `loadEvents` as retry callback |

### Key Design Decisions

- Skeleton blocks use explicit `h-*`/`w-*` sizes matching real content — no layout shift on reveal.
- `AsyncButton` wraps the existing `Button` primitive; zero API surface change for callers.
- `ErrorBanner` is a thin wrapper over the existing `Alert` component — consistent with the design system.
- Error/retry pattern hooks directly into the Zustand `events-store` `error` + `loadEvents` — no new state needed.

## 🧪 Testing

- [x] ✅ Manual testing completed
- [x] ✅ TypeScript check passes (`pnpm tsc --noEmit` — zero new errors)
- [x] ✅ Mobile responsiveness tested (skeletons use responsive grid classes)

## 📸 Screenshots

Visit `/loading-patterns` in the running app to see all three surfaces side-by-side:

1. **Markets List Skeleton** — 3 shimmer cards matching the marketing widget
2. **Event Detail Skeleton** — full page skeleton for the event detail route
3. **Events Table Skeleton** — existing skeleton wired via `loading.tsx`
4. **AsyncButton** — live demo with 2-second simulated action
5. **ErrorBanner** — with and without retry callback

## ✅ Pre-submission Checklist

- [x] ✅ Code follows project style guidelines (Tailwind, shadcn/ui primitives)
- [x] ✅ No TypeScript errors in new files
- [x] ✅ No new dependencies added
- [x] ✅ No breaking changes — all changes are additive
- [x] ✅ Skeletons match real content dimensions (no layout shift)
- [x] ✅ `AsyncButton` is backwards-compatible with `Button` props

## 🔧 Additional Notes

- The two pre-existing TS errors (`activity-timeline-demo/page.tsx`, `typography-example.tsx`) are unrelated to this PR.
- The `/loading-patterns` demo page can be removed before merging to `main` if not needed in production.
