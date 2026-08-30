# Design System Tokens - Motion & Parallax

This document outlines the animation and parallax tokens used across the Predictify platform to ensure a consistent and accessible user experience.

## Parallax Depth Tokens

We use a subtle parallax effect to create depth without causing motion sickness. These tokens are limited to safe ranges and are automatically disabled when `prefers-reduced-motion` is detected.

| Token Name | Value | Usage |
| :--- | :--- | :--- |
| `parallax-depth-hero-primary` | `12px` | Main hero marketing cards and foreground elements. |
| `parallax-depth-hero-secondary`| `-8px` | Background decorative elements (counter-movement). |
| `parallax-depth-card-subtle` | `4px` | Hover effects and micro-interactions on standard cards. |

## Implementation Guidelines

### 1. Motion Safety
Always use the `useParallax` hook which implements the following safety checks:
- **Reduced Motion**: Disables transforms entirely when `prefers-reduced-motion: reduce` is set.
- **Viewport Constraints**: Parallax is disabled on mobile devices (width < 768px) to preserve performance and prevent layout shifts.
- **Hardware Acceleration**: Always use `translate3d(0, y, 0)` to ensure GPU acceleration.

### 2. Performance
- **IntersectionObserver**: Only run animation loops when the element is in the viewport.
- **RequestAnimationFrame**: Use `rAF` for smooth updates, capped at 60+ FPS.
- **Direct DOM Updates**: Bypass React state for the actual `transform` updates to avoid unnecessary re-renders.

## Verification
To verify parallax behavior:
1. Open DevTools > Rendering > Emulate CSS media feature `prefers-reduced-motion`.
2. Toggle between `reduce` and `no-preference`.
3. The hero elements should snap to a still composition when `reduce` is active.

---

## Color-Blind Safe Outcome Icons

> **WCAG 2.1 AA § 1.4.1 (Use of Color)**: Information must not be conveyed by color alone.
> All outcome tiles in `PredictionCard` and `DisputePanel` (TallyBar, VotingState, OpenState,
> EndedState, ExecutedState) now carry a **shape-based icon** alongside color, ensuring
> differentiation under Deuteranopia and Tritanopia simulations.

### Palette + Shape Mapping

| `OutcomeVariant` | Shape | Unicode | Color Token | Semantic meaning |
| :--- | :--- | :--- | :--- | :--- |
| `positive` | Triangle Up ▲ | `▲` | `text-chart-1` | First option / "Yes" / Won |
| `negative` | Triangle Down ▽ | `▽` | `text-chart-2` | Second option / "No" / Lost |
| `neutral`  | Diamond ◇      | `◇` | `text-chart-3` | Third option / Pending / Active |

`chart-*` tokens are defined in `app/globals.css` and are theme-aware (light/dark). They must **never** be replaced with bare hue names (`red`, `green`, etc.) as those convey information by color alone.

### Component Surface Coverage

| Component | What is annotated |
| :--- | :--- |
| `components/PredictionCard.tsx` | Status badge (Won / Lost / Pending / Active) |
| `components/disputes/shared/TallyBar.tsx` | Left and right tally label rows |
| `components/disputes/states/VotingState.tsx` | Vote option buttons |
| `components/disputes/states/OpenState.tsx` | Side-selection radio labels |
| `components/disputes/states/EndedState.tsx` | Leading outcome badge |
| `components/disputes/states/ExecutedState.tsx` | Final outcome badge |

### Accessibility Contract

- All icons are rendered with `aria-hidden="true"` (or `aria-hidden` as a boolean prop).
- The adjacent **text label** remains the primary accessible name for screen readers.
- For standalone icon usage (no sibling label), pass a `title` prop:  
  `<OutcomeIcon variant="positive" title="Positive outcome" />`  
  This causes the SVG to render `role="img"` and a `<title>` child.

### Three-Way Market Support

`getVariantByIndex(index: number): OutcomeVariant` maps any tally index to a variant:

| Index | Variant | Shape |
| :--- | :--- | :--- |
| `0` | `positive` | ▲ |
| `1` | `negative` | ▽ |
| `≥ 2` | `neutral` | ◇ |

For markets with more than three outcomes, all outcomes at index ≥ 2 render the Diamond (◇) shape and `text-chart-3` color, which provides shape-based discrimination from options 0 and 1.

### Simulation Verification

Use Chrome DevTools to verify outcome icon legibility under vision-deficiency simulations:

1. Open DevTools → **Rendering** tab (⋮ → More tools → Rendering).
2. Scroll to **Emulate vision deficiencies**.
3. Test each simulation below and confirm icons remain distinguishable:

| Simulation | Expected: icons still distinguishable |
| :--- | :--- |
| **Deuteranopia** (red-green) | ✓ ▲ vs ▽ vs ◇ differ by shape |
| **Tritanopia** (blue-yellow) | ✓ ▲ vs ▽ vs ◇ differ by shape |
| **Achromatopsia** (no color) | ✓ ▲ vs ▽ vs ◇ differ by shape |

### Source Files

- **Icon components**: [`components/icons/OutcomeIcons.tsx`](file:///c:/Users/DELL/Desktop/predictify-frontend/components/icons/OutcomeIcons.tsx)
- **Icon exports**: [`components/icons/index.tsx`](file:///c:/Users/DELL/Desktop/predictify-frontend/components/icons/index.tsx)
- **Tests**: [`components/icons/__tests__/OutcomeIcons.test.tsx`](file:///c:/Users/DELL/Desktop/predictify-frontend/components/icons/__tests__/OutcomeIcons.test.tsx)
