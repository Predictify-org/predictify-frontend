# Accessibility Controls

Per-user accessibility preferences for Predictify. All settings are stored in
`localStorage` under the key `predictify-a11y` and applied globally via
`data-*` attributes on `<html>`.

---

## Settings → Accessibility toggles

| Toggle | localStorage key | `<html>` attribute | Default |
|---|---|---|---|
| Reduce motion | `reduceMotion` | `data-reduce-motion` | OS `prefers-reduced-motion` |
| Disable parallax | `disableParallax` | `data-disable-parallax` | `false` |
| Disable auto-playing carousels | `disableAutoplay` | _(JS context only)_ | `false` |
| Increase contrast | `increaseContrast` | `data-increase-contrast` | `false` |

Settings persist across page loads. Clearing browser site data resets everything
to OS defaults.

---

## Reduce motion

**Context key:** `reduceMotion`  
**CSS selector:** `[data-reduce-motion="true"]`

When enabled, all `animation-duration` and `transition-duration` values are
forced to `0.01ms`, effectively stopping every decorative animation in the DOM.
`scroll-behavior` is also set to `auto`.

OS-level `prefers-reduced-motion: reduce` is used as the initial default when
no explicit user preference is stored.

**Components affected:**
- `AnimatedBackground` — drops `animate-pulse` classes
- All Tailwind animation utilities (`animate-fade-in`, `animate-slide-up`, etc.)
- `tailwindcss-animate` enter/exit utilities used by Sheet and Dialog

---

## Disable parallax

**Context key:** `disableParallax`  
**CSS selector:** `[data-disable-parallax="true"] [data-parallax]`

Removes `transform` from any element that carries a `data-parallax` attribute.
Apply `data-parallax` to any parallax container to opt it in:

```tsx
<div data-parallax style={{ transform: `translateY(${offset}px)` }}>
  ...
</div>
```

When the preference is active, the inline transform is overridden with
`transform: none !important`.

---

## Disable auto-playing carousels

**Context key:** `disableAutoplay`  
**Mechanism:** JavaScript (no CSS attribute)

The `Carousel` component (`components/ui/carousel.tsx`) reads
`disableAutoplay` from `AccessibilityContext` via `useAccessibility()`. Any
Embla plugin whose `.name` matches `/auto(?:play|scroll)/i` is stripped from
the active plugins array before Embla initialises.

This means passing an `AutoPlay` plugin to `<Carousel plugins={[AutoPlay()]}>` 
will silently have no effect when the user has disabled autoplay. All manual
Previous / Next navigation continues to work normally.

---

## Increase contrast

**Context key:** `increaseContrast`  
**CSS selector:** `[data-increase-contrast="true"]`

Swaps the following CSS custom-property tokens for higher-contrast values.
WCAG AAA (7:1 contrast ratio) is targeted where the token is used for text on
a standard background.

### Light mode token map

| Token | Default | High-contrast |
|---|---|---|
| `--foreground` | `0 0% 3.9%` | `0 0% 2%` |
| `--muted-foreground` | `0 0% 45.1%` | `0 0% 20%` |
| `--border` | `0 0% 89.8%` | `0 0% 30%` |
| `--primary` | `0 0% 9%` | `0 0% 4%` |
| `--card-foreground` | `0 0% 3.9%` | `0 0% 2%` |
| `--popover-foreground` | `0 0% 3.9%` | `0 0% 2%` |

### Dark mode token map

| Token | Default | High-contrast |
|---|---|---|
| `--foreground` | `0 0% 98%` | `0 0% 100%` |
| `--muted-foreground` | `0 0% 63.9%` | `0 0% 85%` |
| `--border` | `0 0% 14.9%` | `0 0% 70%` |
| `--primary` | `0 0% 98%` | `0 0% 98%` |
| `--card-foreground` | `0 0% 98%` | `0 0% 100%` |
| `--popover-foreground` | `0 0% 98%` | `0 0% 100%` |

---

## Adding a new consumer

1. Import the hook:
   ```ts
   import { useAccessibility } from "@/context/AccessibilityContext"
   ```
2. Destructure the flag you need:
   ```ts
   const { reduceMotion } = useAccessibility()
   ```
3. Conditionally apply classes or skip effects based on the flag.

For pure-CSS consumers, target the `data-*` attribute on `<html>` directly:

```css
[data-reduce-motion="true"] .my-animation {
  animation: none !important;
}
```

---

## localStorage schema

```json
{
  "reduceMotion": true,
  "disableParallax": false,
  "disableAutoplay": false,
  "increaseContrast": false
}
```

Key: `predictify-a11y`. Invalid or missing values fall back to OS defaults.
Writes are wrapped in `try/catch` so `localStorage` unavailability
(private browsing, quota exceeded) fails silently.
