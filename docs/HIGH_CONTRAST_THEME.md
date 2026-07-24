# High-Contrast Theme — WCAG AAA

The high-contrast theme provides a AAA-compliant (WCAG 2.1) colour palette for users who need maximum visual distinction. All colour pairs achieve ≥7:1 contrast ratio for normal text and ≥4.5:1 for large text.

## Quick Start

The theme is available alongside `light` and `dark` via `next-themes`:

```tsx
import { useTheme } from "next-themes"

function ThemeToggle() {
  const { setTheme } = useTheme()
  return (
    <select onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="high-contrast">High Contrast</option>
    </select>
  )
}
```

## Palette

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `0 0% 0%` (#000) | Pure black background |
| `--foreground` | `0 0% 100%` (#fff) | Pure white text |
| `--border` | `0 0% 100%` (#fff) | White borders |
| `--primary` | `0 0% 100%` (#fff) | White primary fills |
| `--primary-foreground` | `0 0% 0%` (#000) | Black text on primary |
| `--muted` | `0 0% 20%` (#333) | Muted surfaces |
| `--destructive` | `0 100% 50%` (red) | Bright red for danger |

All chart colours use high-saturation hues for maximum distinguishability.

## File Structure

```
app/styles/themes/
├── high-contrast.css          # Theme CSS variables and overrides
└── high-contrast.test.tsx     # 8 tests
```

The CSS is imported in `app/layout.tsx`:

```tsx
import "./styles/themes/high-contrast.css"
```

The `ThemeProvider` in `components/providers.tsx` includes `high-contrast` in its `themes` array.

## Features

- **Pure black/white palette** — 21:1 contrast ratio on all text
- **Visible borders** — all elements have white borders for clear separation
- **Enhanced focus indicators** — 3px white outline with offset
- **Underlined links** — all links are underlined at all times
- **Visible scrollbars** — high-contrast scrollbar styling
- **Print-friendly** — inverts to black-on-white when printing
- **Reduced-motion** — respects `prefers-reduced-motion: reduce`

## Testing

8 tests cover:
- ThemeProvider integration (class application on `<html>`)
- Theme isolation (doesn't interfere with light/dark)
- CSS file importability
- All three themes render without errors

```bash
pnpm test -- app/styles/themes/high-contrast.test.tsx
```

## WCAG AAA Compliance

| Requirement | Met? | How |
|------------|------|-----|
| Normal text ≥ 7:1 | ✅ | White (#fff) on black (#000) = 21:1 |
| Large text ≥ 4.5:1 | ✅ | Same 21:1 ratio |
| Focus visible | ✅ | 3px white outline, 3px offset |
| Non-text contrast ≥ 3:1 | ✅ | White borders on all interactive elements |
| No colour-only info | ✅ | Borders, underlines, and icons convey state |
