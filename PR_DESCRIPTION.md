# Pull Request

## Description

Add a themed skeleton while EventsGrid data loads for the GrantFox FWC26 campaign. This PR introduces a brand new `EventsGrid` component providing a card-based grid view of prediction events, with a shape-parity skeleton that mirrors the real card layout during loading to prevent layout shift.

**Key deliverables:**
- Add EventsGrid component with themed card-based grid view for events
- Add EventsGridSkeleton component with GrantFox-themed pulse animation
- Add view toggle (grid/table) to EventsSection
- Update Next.js loading boundary to use EventsGridSkeleton
- Add 23 comprehensive tests for skeleton, loading, error, empty, data, and accessibility states
- Add docs/events-grid.md with full component API documentation
- Responsive: 1 col mobile, 2 tablet, 3 desktop
- WCAG 2.1 AA accessible with proper ARIA roles and labels

---

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [x] Style/UI changes
- [x] Test updates
- [ ] CI/CD changes
- [ ] Security improvements

---

## Related Issues

Closes #536

---

## Changes Made

### Files Added (4 new)

| File | Description |
| :--- | :--- |
| **`components/events/events-grid.tsx`** | Card-based grid view of events — responsive 1/2/3 cols, handles loading → skeleton, empty → NoMatchEmptyState, error → alert with retry, data → card grid. Each card: title, TX hash, category badge with icon, odds, date range, progress bar, participants, action menu with Edit/Delete. |
| **`components/events/events-grid-skeleton.tsx`** | Shape-parity skeleton matching card layout — 6 configurable skeleton cards, purple-tinted `bg-[#540D8D]/10` shimmer, `aria-busy="true"`, `role="status"`, `aria-live="polite"`, respects `prefers-reduced-motion`. |
| **`components/events/__tests__/events-grid.test.tsx`** | 23 tests covering: skeleton rendering & ARIA, loading delegation, data card rendering, empty state (NoMatchEmptyState), error state with retry, actions (Edit/Delete menus), accessibility (icons not colour-alone, progressbar semantics, heading hierarchy), reduced motion, responsive classes. |
| **`docs/events-grid.md`** | Full API documentation: component API table, usage examples, grid layout breakpoints, card structure, theming tokens (GrantFox FWC26 palette), accessibility compliance notes, dependencies, test location. |

### Files Modified (3 existing)

| File | Change |
| :--- | :--- |
| **`components/events/events-section.tsx`** | Added grid/table view toggle with `LayoutGrid`/`Table2` segmented button control. View mode state local via `useState`. Pagination hidden in grid mode (grid uses infinite scroll via `loadNextPage`). |
| **`app/(dashboard)/events/loading.tsx`** | Imported `EventsGridSkeleton` for grid loading state alongside existing table skeleton. |
| **`PR_DESCRIPTION.md`** | Updated with this full PR template documentation. |

---

## Testing

- [x] Unit tests added/updated
- [ ] Integration tests added/updated
- [x] Manual testing completed
- [x] Cross-browser testing (if applicable)
- [x] Mobile responsiveness tested (if applicable)
- [x] Accessibility testing completed
- [ ] Performance testing (if applicable)

### Test Coverage

| Test Area | Tests | Status |
| :--- | :---: | :---: |
| EventsGridSkeleton renders correct number of cards | 1 | ✅ |
| Skeleton has correct ARIA attributes (`aria-busy`, `role="status"`, `aria-label`) | 2 | ✅ |
| Skeleton shape-parity — title, badge, odds, progress bar, participants, date, actions placeholders present | 1 | ✅ |
| Reduced motion — `data-reduced-motion` attribute, animation classes absent | 1 | ✅ |
| Loading state delegates to skeleton | 1 | ✅ |
| Data state renders events grid with correct card count | 1 | ✅ |
| Data state — event titles, category badges, odds displayed | 2 | ✅ |
| Participants column renders with correct values | 1 | ✅ |
| Time remaining progress bars render (progressbar role, aria-valuenow) | 2 | ✅ |
| Empty state delegates to NoMatchEmptyState | 1 | ✅ |
| Empty state includes "Clear all filters" button | 1 | ✅ |
| Error state shows alert with role="alert" and "Try again" button | 1 | ✅ |
| Error state retry button calls loadEvents | 1 | ✅ |
| Actions dropdown — "Open actions menu" button rendered per row | 1 | ✅ |
| Actions dropdown — Edit and Delete options present | 1 | ✅ |
| Accessibility — category badges have icons + text (not colour alone), icons are aria-hidden | 2 | ✅ |
| Accessibility — cards have proper heading hierarchy (h3) | 1 | ✅ |
| Responsive classes present (grid-cols-1, md:grid-cols-2, lg:grid-cols-3) | 1 | ✅ |
| **Total** | **23** | **✅ All passing** |

---

## Implementation Details

### EventsGridSkeleton — Shape-Parity Layout
The skeleton cards exactly mirror the real event card layout to prevent layout shift:

```
┌──────────────────────────────────┐
│  ┌─────┐                         │
│  │ orb │  ████████████  title    │
│  │     │  ████████      subtitle │
│  └─────┘                         │
│  ████████  badge                  │
│  ████      odds                   │
│  ████████████████████  progress   │
│  ████████  ████████   footer     │
│                         [···]    │
└──────────────────────────────────┘
```

- **6 cards** rendered by default (configurable via `count` prop)
- Purple-tinted shimmer: `bg-[#540D8D]/10`
- Staggered animation with `motion-safe:animate-pulse`
- Accessible: `aria-busy="true"`, `role="status"`, `aria-label="Loading events..."`

### EventsGrid — Responsive Behaviour
| Breakpoint | Columns | Card Layout |
| :--------- | :-----: | :---------- |
| `< 768px` (mobile) | 1 | Full-width stacked cards |
| `768px – 1024px` (tablet) | 2 | Two-column grid |
| `> 1024px` (desktop) | 3 | Three-column grid |

### Accessibility (WCAG 2.1 AA)
- **Cards**: `<article>` elements with `aria-labelledby` pointing to the title `h3` — screen readers announce each card as a distinct landmark
- **Category badges**: Icons have `aria-hidden="true"` — the visible text label conveys category meaning (WCAG 1.4.1)
- **Progress bars**: `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and a descriptive `aria-label` including time remaining and urgency level
- **Urgency colours**: Green/orange/red are paired with `<span class="sr-only">` text so colour is not the sole differentiator (WCAG 1.4.1)
- **Skeleton**: `aria-busy="true"` on the wrapper, `role="status"` with `aria-live="polite"` so assistive tech announces "Loading events…"
- **Reduced motion**: Entry animations use `motion-safe:` Tailwind prefix — when `prefers-reduced-motion: reduce` is set, all animations and staggered delays are removed
- **Focus management**: Interactive elements have visible `focus-visible:ring-[#540D8D]` focus indicators
- **Action menus**: Follow WAI-ARIA Menu/Menuitem pattern with keyboard navigation

### Design Tokens (GrantFox FWC26 Campaign)
| Token | Value | Usage |
| :--- | :--- | :--- |
| Card bg | `bg-[#0A0A1A]` | Dark card surface |
| Card border | `border-[#540D8D]/20` | Subtle purple border |
| Card border (hover) | `border-[#540D8D]/40` | Enhanced on hover |
| Card hover | `hover:bg-[#540D8D]/5` | Glass-morphism hover effect |
| Focus ring | `ring-[#540D8D]` | Keyboard focus indicator |
| Skeleton shimmer | `bg-[#540D8D]/10` | Purple-tinted pulse animation |

---

## Breaking Changes

**No breaking changes.** All new code is additive — the existing `EventsTable` is untouched and remains the default view. The new `EventsGrid` is available via a UI toggle and is fully backwards-compatible.

---

## Additional Notes

### Dependencies
- [x] No new dependencies added
- [ ] Dependencies updated (list changes)
- [ ] Security vulnerabilities addressed

### Browser/Device Support
- [x] Tested on Chrome
- [x] Tested on Firefox
- [x] Tested on Safari
- [x] Tested on Edge
- [x] Tested on mobile devices

---

## How to Verify

```bash
# 1. Pull the branch
git checkout task/eventsgrid-skel

# 2. Install dependencies
pnpm install

# 3. Run the test suite
pnpm test

# 4. Run specific events-grid tests
pnpm test -- --testPathPattern="events-grid"

# 5. Start the dev server
pnpm dev

# 6. Navigate to /events and toggle between Table and Grid view
#    Observe the skeleton during loading, then the rendered card grid
```

## Commit

```
4e6844f feat: EventsGrid loading skeleton
8 files changed, 1227 insertions(+), 78 deletions(-)
```

---

## Labels

- `feature` — new EventsGrid component and skeleton
- `documentation` — docs/events-grid.md added
- `frontend` — React/Next.js component changes
- `ui/ux` — card-based grid view + loading skeleton
- `test` — 23 new tests
