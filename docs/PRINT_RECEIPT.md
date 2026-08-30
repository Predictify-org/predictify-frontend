# Print-Friendly Receipt Layout — GrantFox FWC26

## Overview

Predictify supports printing shareable prediction receipts. When a user
completes a prediction and views their receipt, they can trigger the browser's
print dialog via the **Print Receipt** button. The printed output is a clean,
branded, single-page receipt that is legible on paper regardless of whether
the user had dark mode enabled in the browser.

This document describes the implementation, design decisions, and WCAG 2.1 AA
compliance for the print receipt feature introduced for the GrantFox FWC26
campaign.

---

## Files changed

| File | Change |
|------|--------|
| `app/styles/print.css` | **New** — dedicated print stylesheet for the receipt layout |
| `app/layout.tsx` | Added `import "./styles/print.css"` so rules are loaded globally |
| `app/globals.css` | Removed duplicate inline `@media print` receipt block; replaced with a comment pointing to `app/styles/print.css` |
| `components/receipts/Receipt.tsx` | Renamed "Download Receipt" button → **"Print Receipt"**; added `aria-label`, `type="button"`, `data-print="hide"`, and switched icon to `Printer` |
| `app/styles/__tests__/print.receipt.test.ts` | **New** — 23 focused tests covering the print stylesheet and component structure |

---

## How it works

### Visibility-isolation technique

Printing an entire page usually produces unwanted chrome (navbar, sidebars,
banners). We use a two-step visibility isolation approach instead of
`display: none` on every non-receipt element (which would cause layout
reflow and break page-break hints):

1. `body * { visibility: hidden }` — hides everything without removing it
   from the document flow.
2. `.receipt-wrapper, .receipt-wrapper * { visibility: visible }` — re-shows
   the receipt and all its descendants.
3. `.receipt-wrapper { position: absolute; inset-block-start: 0; … }` — moves
   the receipt to the top-left of the print canvas so nothing else appears.

### Dark-mode safety

The receipt is designed for a screen that may be in dark mode. Without explicit
overrides the CSS custom properties that Tailwind and shadcn/ui use for
theming would render white text on a white page.

`app/styles/print.css` resets all relevant design tokens to their light-mode
values inside `@media print`:

```css
@media print {
  :root, .dark {
    --background: 0 0% 100% !important;
    --foreground: 0 0% 3.9% !important;
    /* … */
  }
}
```

### GrantFox FWC26 attribution footer

A CSS `::after` pseudo-element appended to `.receipt-container` prints a
lightweight attribution line below the receipt:

```
GrantFox FWC26 · Predictify Official Receipt · predictify.app
```

This is purely presentational and only visible in print; no markup change is
needed in the component.

---

## Triggering a print

The receipt is triggered by `window.print()`. The **Print Receipt** button in
`components/receipts/Receipt.tsx` calls `handlePrint`:

```tsx
const handlePrint = () => {
  window.print();
};
```

The button and all other action controls are wrapped in a `div` with both
`.print-hide` (a CSS class) and `data-print="hide"` (an attribute selector)
so the print stylesheet can hide them via two targeting strategies:

```tsx
<div className="print-hide" data-print="hide">
  <button type="button" onClick={handlePrint} aria-label="Print this receipt">
    <Printer aria-hidden="true" />
    Print Receipt
  </button>
  {/* Share receipt, Back to Dashboard */}
</div>
```

---

## WCAG 2.1 AA compliance

| Criterion | How it is met |
|-----------|--------------|
| 1.4.1 — Use of Color | Labels accompany every data value; colour is not the sole differentiator |
| 1.4.3 — Contrast (Minimum) | Body text: `#000` on `#fff` = 21:1. Muted labels: `#374151` on `#fff` = 10.7:1 |
| 1.4.4 — Resize Text | Base font set to `11pt`; no fixed pixel heights that prevent scaling |
| 2.1.1 — Keyboard | Print button is a native `<button>` — keyboard and AT accessible |
| 4.1.2 — Name, Role, Value | `aria-label="Print this receipt"` on the print button; icons have `aria-hidden="true"` |
| 2.3.3 / prefers-reduced-motion | All animations suppressed unconditionally in `@media print` |

---

## Testing

Tests live in `app/styles/__tests__/print.receipt.test.ts` and use
file-content assertions (the same strategy as `src/pages/ClaimFlow.print.test.ts`):

```bash
# Run just the print receipt tests
npx jest "app/styles/__tests__/print.receipt.test.ts"

# Run all tests
pnpm test
```

The 23 tests cover:
- `app/styles/print.css` — file exists, required CSS constructs present
- `app/layout.tsx` — print stylesheet imported globally
- `app/globals.css` — no duplicate inline print block
- `components/receipts/Receipt.tsx` — print trigger, DOM structure, a11y attributes

---

## Print preview tips

- **Chrome / Edge**: File → Print → select "More settings" → enable "Background graphics" for colour icon rendering.
- **Firefox**: File → Print → check "Print Background Colors and Images".
- **macOS Safari**: File → Print → expand "Safari" dropdown → check "Print backgrounds".

The stylesheet uses `print-color-adjust: exact` to request that browsers render
background colours without requiring the user to change settings manually.
