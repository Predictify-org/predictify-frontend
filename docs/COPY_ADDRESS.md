# CopyAddress

**Location:** `app/components/CopyAddress.tsx`  
**Campaign:** GrantFox FWC26  
**Status:** Stable

---

## Overview

`CopyAddress` is a universal, standalone copy-to-clipboard button for addresses
and short strings.  Drop it anywhere you need a one-click copy action — wallet
addresses, receipt IDs, share URLs, or any text value.

It complements `components/ui/CopyableText`, which renders an *inline text
node* with a hover-reveal icon.  `CopyAddress` is an *independent button* with
no surrounding text display, making it suitable for placement alongside
pre-existing labels or inside dense UI surfaces (tables, cards, receipts).

---

## API

```tsx
import { CopyAddress } from "@/app/components/CopyAddress"

<CopyAddress
  address="GABC...XYZ"        // required
  label="Copy wallet"          // optional – defaults to the full address string
  size="sm"                    // optional – "default" | "sm" | "lg" | "icon"
  variant="outline"            // optional – all shadcn/ui Button variants
  className="ml-2"             // optional – extra CSS classes
  resetDelay={2000}            // optional – ms before icon resets (default 2000)
/>
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `address` | `string` | — | **Required.** The text written to the clipboard. |
| `label` | `string` | `address` | Visible button text. Pass `""` for an icon-only button. |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | `"sm"` | Forwarded to `<Button size>`. |
| `variant` | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"outline"` | Forwarded to `<Button variant>`. |
| `className` | `string` | — | Additional Tailwind classes applied to the button element. |
| `resetDelay` | `number` | `2000` | Milliseconds before the button resets from its "Copied" state. |

---

## Behaviour

1. **Click / Enter / Space** → writes `address` to `navigator.clipboard`.
2. **Success** → icon flips from `<Copy>` to `<Check>`, label changes to
   "Copied", `aria-pressed="true"`, toast fires ("Copied!" / "Address copied to
   clipboard.").
3. **After `resetDelay` ms** → button resets to its default state.
4. **Clipboard unavailable** (non-secure context, permission denied, API absent)
   → destructive toast fires; button state unchanged.

---

## Accessibility (WCAG 2.1 AA)

| Feature | Detail |
|---|---|
| Keyboard accessible | Native `<button>` — no custom key handlers needed |
| `aria-label` | `"Copy {label}"` or `"Copy address {address}"` for icon-only |
| `aria-pressed` | `false` → `true` while in "copied" state |
| Screen-reader live region | `<span aria-live="polite" class="sr-only">` announces "Address copied to clipboard" on success |
| Focus ring | Inherits design-system `focus-visible:ring-2 focus-visible:ring-ring` |
| Dark mode | Uses design tokens (`bg-background`, `text-foreground`, etc.) |

---

## Usage examples

```tsx
// Default – shows full Stellar address as label
<CopyAddress address="GABC...XYZ" />

// Short human-readable label
<CopyAddress address="GABC...XYZ" label="Copy address" />

// Ghost variant inside a card header
<CopyAddress
  address="RCP-2026-001"
  label="Copy receipt ID"
  variant="ghost"
  size="sm"
/>

// Icon-only (no visible text)
<CopyAddress address="GABC...XYZ" label="" size="icon" />

// Custom delay – stays in "copied" state for 3 seconds
<CopyAddress address="GABC...XYZ" resetDelay={3000} />
```

---

## Dependencies

| Dependency | Purpose |
|---|---|
| `@/components/ui/button` | Accessible, themeable button primitive |
| `@/hooks/use-toast` | Radix UI toast via module-level state |
| `lucide-react` (`Copy`, `Check`) | Copy / confirmation icons |
| `@/lib/utils` (`cn`) | Tailwind class merging |

No new runtime dependencies were added.

---

## Tests

`app/components/__tests__/CopyAddress.test.tsx` — 13 focused tests:

- Renders with default and custom props
- Copies address to clipboard on click and on Enter key
- Transitions Copy → Check icon and label on success
- `aria-pressed` toggles correctly
- Resets after `resetDelay`
- Success toast ("Copied!")
- Error toast on API rejection
- Error toast when Clipboard API is unavailable
- `aria-live` region announces copy to screen readers

Run:

```bash
pnpm test -- --testPathPattern=CopyAddress
```

---

## Related components

| Component | Location | Difference |
|---|---|---|
| `CopyableText` | `components/ui/CopyableText.tsx` | Inline text node with hover-reveal copy icon |
| `CopyAddress` | `app/components/CopyAddress.tsx` | Standalone button; no surrounding text display |
| `ReceiptShare` | `app/components/ReceiptShare.tsx` | Full share dialog with download and external link |
| `ShareSheet` | `app/components/ShareSheet.tsx` | Bottom-sheet with social platform sharing |
