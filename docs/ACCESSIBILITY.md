# Accessibility Controls

Per-user accessibility preferences for Predictify, accessible at
**Settings → Accessibility**. All values are stored in `localStorage`
under the key `predictify-a11y` and applied globally via `data-*`
attributes on `<html>`.

---

## Toggles

| Toggle | `localStorage` field | `<html>` attribute | Default |
|---|---|---|---|
| Reduce motion | `reduceMotion` | `data-reduce-motion` | OS `prefers-reduced-motion` |
| Disable parallax | `disableParallax` | `data-disable-parallax` | `false` |
| Disable auto-playing carousels | `disableAutoplay` | _(JS context only)_ | `false` |
| Increase contrast | `increaseContrast` | `data-increase-contrast` | `false` |

Preferences persist across page loads. Clearing browser site data resets
them to OS defaults. Values are never transmitted to a server.

---

## Reduce motion

**Field:** `reduceMotion` · **Attribute:** `data-reduce-motion`

When `true`, every `animation-duration` and `transition-duration` in the
DOM is forced to `0.01ms`, effectively stopping all decorative animation.
`scroll-behavior` is set to `auto`.

The initial default is read from `window.matchMedia("(prefers-reduced-motion: reduce)")`,
so users whose OS already requests reduced motion get the correct default
without touching Settings.

**Consumers:**
- `AnimatedBackground` — drops `animate-pulse` classes
- `globals.css` — `[data-reduce-motion="true"] *` rule stops all CSS
  animations for components that do not read React context

---

## Disable parallax

**Field:** `disableParallax` · **Attribute:** `data-disable-parallax`

Zeros the `transform` on any element carrying a `data-parallax` attribute:

```css
[data-disable-parallax="true"] [data-parallax] {
  transform: none !important;
}
```

Add `data-parallax` to any parallax container to opt it in automatically:

```tsx
<div data-parallax style={{ transform: `translateY(${offset}px)` }}>
```

---

## Disable auto-playing carousels

**Field:** `disableAutoplay` · Consumed via JS context only (no CSS attribute)

The `Carousel` component (`components/ui/carousel.tsx`) reads
`disableAutoplay` from `useAccessibility()`. Any Embla plugin whose
`.name` matches `/auto(?:play|scroll)/i` is stripped from the active
plugins array before Embla initialises. Manual Previous / Next navigation
is never affected.

---

## Increase contrast

**Field:** `increaseContrast` · **Attribute:** `data-increase-contrast`

Swaps CSS custom-property tokens for higher-contrast values.
WCAG AAA (7:1 contrast ratio) is targeted where the token is used for
body text on a standard background.

### Light mode token map

| Token | Default | High-contrast |
|---|---|---|
| `--foreground` | `0 0% 3.9%` | `0 0% 2%` |
| `--muted-foreground` | `0 0% 45.1%` | `0 0% 18%` |
| `--border` | `0 0% 89.8%` | `0 0% 28%` |
| `--primary` | `0 0% 9%` | `0 0% 4%` |
| `--card-foreground` | `0 0% 3.9%` | `0 0% 2%` |
| `--popover-foreground` | `0 0% 3.9%` | `0 0% 2%` |

### Dark mode token map

| Token | Default | High-contrast |
|---|---|---|
| `--foreground` | `0 0% 98%` | `0 0% 100%` |
| `--muted-foreground` | `0 0% 63.9%` | `0 0% 88%` |
| `--border` | `0 0% 14.9%` | `0 0% 72%` |
| `--primary` | `0 0% 98%` | `0 0% 98%` |
| `--card-foreground` | `0 0% 98%` | `0 0% 100%` |
| `--popover-foreground` | `0 0% 98%` | `0 0% 100%` |

---

## Adding a new consumer

**React component:**

```ts
import { useAccessibility } from "@/context/AccessibilityContext"

const { reduceMotion } = useAccessibility()
```

**Pure CSS:**

```css
[data-reduce-motion="true"] .my-animation {
  animation: none !important;
}
```

---

## `localStorage` schema

```json
{
  "reduceMotion": true,
  "disableParallax": false,
  "disableAutoplay": false,
  "increaseContrast": false
}
```

Key: `predictify-a11y`. Missing or invalid fields fall back to OS defaults.
All `localStorage` writes are wrapped in `try/catch` so private-mode
browsers or quota-exceeded errors fail silently.
