# Add Accessible 'About this market' Modal

**Closes #362**

## 🎯 Summary

Implements an accessible 'About this market' modal to explain the market's resolution criteria, source oracle, and dispute window/process. Adheres to strict WCAG 2.1 AA guidelines, including dialog focus return, screen reader announcements, and Tailwind theme design tokens.

---

## ✨ What Changed

### 1. Educational Modal Component: `app/components/AboutMarketModal.tsx`
Created a new Client Component displaying:
- **Oracle / Source**: Details the source used to resolve outcomes (links to the official FIFA World Cup page for FWC26 markets).
- **Resolution Date / Time**: The date when the market resolves.
- **Resolution Criteria**: Yes vs. No conditions tailored specifically to Argentina's FIFA World Cup campaign.
- **Dispute Window & Arbitration**: Mentions the 24-hour window and decentralized arbitration.
- **Focus Management**: Uses `DialogContentWithFocusReturn` to shift focus back to the trigger button when closed.
- **Accessibility**: Includes detailed `sr-only` markup summarizing the parameters for continuous screen reader reading.

### 2. Hero Component Integration: `app/markets/[id]/hero.tsx`
- Added the `aboutModalTrigger` prop to render the modal button dynamically within the actions row of the hero (next to the Share button).
- Updated layout wrapping to `flex-wrap gap-3` so buttons stack nicely on narrow screens.

### 3. Page Level Integration: `app/markets/[id]/page.tsx`
- Imports `AboutMarketModal` and renders it within the Server Component page, passing it to `MarketHero`.

### 4. Dialog Component Fix: `components/ui/dialog.tsx`
- Fixed a compilation error where `useRef` was referenced directly instead of `React.useRef`.

### 5. Documentation and Status Syncs:
- **`app/data/a11y-manifest.json`**: Added `AboutMarketModal` entry.
- **`app/a11y-audit/page.tsx`**: Registered `AboutMarketModal` in the internal accessibility audit page.
- **`docs/a11y-status.md`**: Added `AboutMarketModal` row in the board status table.

---

## ♿ Accessibility (WCAG 2.1 AA Compliant)
- ✅ Screen reader announcements: Dialog labels (`aria-labelledby`/`aria-describedby`) and `sr-only` descriptions announce details clearly.
- ✅ Focus return: Restores focus to the trigger button on modal close via `DialogContentWithFocusReturn`.
- ✅ Contrast ratio: White text on primary buttons meets the required 4.5:1 ratio in both light and dark modes.

---

## 🧪 Test Output

### AboutMarketModal Tests:
```
PASS app/components/__tests__/AboutMarketModal.test.tsx
  AboutMarketModal
    √ renders the trigger button correctly
    √ opens the modal Dialog and displays FWC26 campaign resolution details
    √ opens the modal Dialog and displays generic resolution details
    √ has accessible screen-reader markup and descriptions
    √ closes the modal when clicking the Close button and returns focus to trigger
```

### MarketHero Integration Tests:
```
PASS app/markets/[id]/__tests__/hero.test.tsx
  MarketHero — about modal trigger
    √ renders aboutModalTrigger element when provided
    √ does not render actions wrapper if both onShare and aboutModalTrigger are omitted
```

### Manifest Alignment Tests:
```
PASS app/__tests__/a11y-manifest.test.js
  a11y manifest
    √ tracks the expected recent component statuses
    √ keeps the markdown board aligned with the manifest component names
```

---

## 📂 Files Changed

### Added
- [app/components/AboutMarketModal.tsx](file:///c:/Users/user/Drips/predictify-frontend/app/components/AboutMarketModal.tsx)
- [app/components/__tests__/AboutMarketModal.test.tsx](file:///c:/Users/user/Drips/predictify-frontend/app/components/__tests__/AboutMarketModal.test.tsx)

### Modified
- [app/markets/[id]/hero.tsx](file:///c:/Users/user/Drips/predictify-frontend/app/markets/[id]/hero.tsx)
- [app/markets/[id]/page.tsx](file:///c:/Users/user/Drips/predictify-frontend/app/markets/[id]/page.tsx)
- [components/ui/dialog.tsx](file:///c:/Users/user/Drips/predictify-frontend/components/ui/dialog.tsx)
- [app/markets/[id]/__tests__/hero.test.tsx](file:///c:/Users/user/Drips/predictify-frontend/app/markets/[id]/__tests__/hero.test.tsx)
- [app/data/a11y-manifest.json](file:///c:/Users/user/Drips/predictify-frontend/app/data/a11y-manifest.json)
- [app/a11y-audit/page.tsx](file:///c:/Users/user/Drips/predictify-frontend/app/a11y-audit/page.tsx)
- [docs/a11y-status.md](file:///c:/Users/user/Drips/predictify-frontend/docs/a11y-status.md)
