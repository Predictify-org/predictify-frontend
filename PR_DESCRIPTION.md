# feat: EventsGrid loading skeleton (GrantFox FWC26 themed)

## 🎯 Summary

Adds a themed `EventsGrid` component with a shape-parity skeleton for the GrantFox FWC26 campaign. The grid provides an alternative card-based view alongside the existing table view, with a toggle control in the EventsSection toolbar. When data is loading, a themed skeleton grid is displayed matching the card layout dimensions to prevent layout shift.

---

## ✨ What Changed

### 1. `components/events/events-grid.tsx` (new)
Responsive card-grid view for prediction events with:
- **Responsive layout**: 1 col (mobile), 2 col (tablet), 3 col (desktop)
- **Event cards**: Title, category badge, odds, time remaining progress bar, participant count, action menu
- **State handling**: Loading → `EventsGridSkeleton`, Empty → `NoMatchEmptyState`, Error → inline error with retry, Data → card grid
- **Delete confirmation**: Integrated `AlertDialog` for event deletion
- **Entry animations**: Staggered slide-in that respects `prefers-reduced-motion`
- **Theming**: GrantFox FWC26 palette (`#0A0A1A` cards, `#540D8D` borders/accents, glass-morphism hover)

### 2. `components/events/events-grid-skeleton.tsx` (new)
Shape-parity skeleton matching the EventsGrid card layout:
- 6 skeleton cards (configurable via `count` prop)
- Each card mirrors real card: avatar orb, title + subtitle lines, stats row, progress bar, footer
- Themed with `bg-[#540D8D]/10` purple-tinted shimmer
- `aria-label="Loading events"`, `aria-busy="true"`, `role="status"` for accessibility
- Staggered animation with `motion-safe:` prefixes respecting reduced motion
- `aria-hidden="true"` on individual skeleton cards

### 3. `components/events/__tests__/events-grid.test.tsx` (new)
Comprehensive test suite covering:
- **EventsGridSkeleton**: Rendering count, aria attributes, custom className, aria-hidden
- **EventsGrid loading state**: Shows skeleton only when no cached events
- **EventsGrid error state**: Error alert with "Try again" button
- **EventsGrid empty state**: NoMatchEmptyState with clear-filters button
- **EventsGrid data rendering**: Titles, badges, odds, participants, progress bars
- **Actions**: Dropdown menus with Edit/Delete options
- **Accessibility**: aria-hidden icons, aria-labelledby cards, progressbar semantics

### 4. `components/events/events-section.tsx` (modified)
- Integrated `EventsGrid` as alternative view mode
- Added table/grid view toggle with `LayoutGrid` / `Table2` icons in the header
- View mode state persisted locally via `useState`
- Pagination hidden in grid mode (grid supports infinite scroll via `loadNextPage`)

### 5. `app/(dashboard)/events/loading.tsx` (modified)
- Imported `EventsGridSkeleton` for potential grid loading state
- Existing table skeleton remains as default fallback

### 6. `docs/events-grid.md` (new)
Component documentation covering:
- Overview and states table
- Usage examples
- Grid layout breakpoints
- Card structure
- Theming tokens
- Accessibility compliance notes
- Dependencies and test location

---

## ♿ Accessibility (WCAG 2.1 AA Compliant)
- ✅ **Cards**: `<article>` with `aria-labelledby` pointing to title
- ✅ **Category icons**: `aria-hidden="true"` — text label conveys meaning (WCAG 2.1 AA 1.4.1)
- ✅ **Progress bars**: `role="progressbar"` with `aria-valuenow/min/max` and descriptive `aria-label`
- ✅ **Urgency**: Colours paired with `<span class="sr-only">` text for screen readers
- ✅ **Skeleton**: `aria-busy="true"` on wrapper, `role="status"` for live-region announcements
- ✅ **Reduced motion**: Entry animations disabled when `prefers-reduced-motion: reduce`
- ✅ **Focus management**: `focus-visible` rings on cards and interactive elements
- ✅ **Action menus**: Standard ARIA `menu`/`menuitem` patterns

---

## 🎨 Design Tokens (GrantFox FWC26 Campaign)
| Token | Value | Usage |
| :--- | :--- | :--- |
| Card background | `bg-[#0A0A1A]` | Dark card surface |
| Card border | `border-[#540D8D]/20` | Subtle purple border |
| Card border (hover) | `border-[#540D8D]/40` | Enhanced on hover |
| Card hover | `hover:bg-[#540D8D]/5` | Glass-morphism hover |
| Focus ring | `ring-[#540D8D]` | keyboard focus indicator |
| Skeleton shimmer | `bg-[#540D8D]/10` | Purple-tinted pulse |

---

## 📂 Files Changed

### Added
- `components/events/events-grid.tsx`
- `components/events/events-grid-skeleton.tsx`
- `components/events/__tests__/events-grid.test.tsx`
- `docs/events-grid.md`

### Modified
- `components/events/events-section.tsx`
- `app/(dashboard)/events/loading.tsx`
- `PR_DESCRIPTION.md`

---

## 🧪 Test Output

```bash
# Run the events grid tests
pnpm test -- --testPathPattern="events-grid"

# Run full test suite
pnpm test
```

## 📝 Commit Message

```
feat(events): EventsGrid loading skeleton with GrantFox FWC26 theming

- Add themed EventsGrid card view with responsive grid layout
- Add shape-parity EventsGridSkeleton with purple-tinted shimmer
- Add view toggle (table/grid) to EventsSection toolbar
- Add comprehensive test suite for grid + skeleton
- Add component documentation
- Ensure WCAG 2.1 AA accessibility
```

