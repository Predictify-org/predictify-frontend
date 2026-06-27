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
