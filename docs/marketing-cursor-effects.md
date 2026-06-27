# Marketing pointer follower and magnetic CTAs

Issue: [#275](https://github.com/Predictify-org/predictify-frontend/issues/275)

## Overview

The marketing landing page includes a lightweight pointer follower and magnetic hover effect scoped to three sections:

- `app/(marketing)/_sections/cta.tsx`
- `app/(marketing)/_sections/how-it-works.tsx`
- `app/(marketing)/_sections/kpi-strip.tsx`

## Behavior

| Effect | Detail |
| --- | --- |
| Pointer ring | 12px white ring that follows the pointer inside marketing sections |
| Hover scale | Ring scales 2× over buttons, links, and `[data-magnet]` targets |
| Magnetic pull | CTA label content shifts up to 6px toward the pointer |
| Performance | Pointer tracking writes CSS custom properties only — no React re-renders |

## Accessibility

- **Touch devices:** disabled via `(pointer: coarse)` — gestures remain fully optional.
- **Reduced motion:** disabled via `(prefers-reduced-motion: reduce)`.
- **Hit targets:** magnetic translation applies to `.magnetic-inner` content inside the button, keeping the interactive element’s layout box stable during scroll.
- **Decorative ring:** `aria-hidden="true"` and `pointer-events: none`.

## Edge cases

| Scenario | Handling |
| --- | --- |
| Window blur / tab hidden | Ring hidden, magnet offsets reset |
| Pointer lock | Updates paused until lock is released |
| Resize | Magnet targets re-cached |

## Manual test notes

1. Open `/` on a fine-pointer device (mouse/trackpad).
2. Open DevTools → Performance, record while scrolling through KPI, How It Works, and CTA sections.
3. Confirm frame rate stays near 60fps and layout entries do not spike on pointer move.
4. Hover CTAs — ring should scale 2× and labels should subtly pull toward the pointer (≤ 6px).
5. Enable **Reduce motion** in OS settings — effects should not appear.
6. Blur the window — ring should disappear immediately.

## Files

- `components/marketing/cursor-follower.tsx` — pointer loop and CSS variable updates
- `lib/marketing/magnetic.ts` — magnet offset math (unit tested)
- `app/globals.css` — ring and magnetic styles
- Section files — `data-marketing-cursor-section` and `data-magnet` attributes

## Tests

```bash
pnpm test lib/marketing/__tests__/magnetic.test.ts components/marketing/__tests__/cursor-follower.test.tsx
```
