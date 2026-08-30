# Success Confetti Component

**Component:** `app/components/SuccessConfetti.tsx`  
**Issue:** #436  
**Feature:** Prediction success confetti with reduced-motion fallback

---

## Overview

The `SuccessConfetti` component provides a celebratory visual effect when a user successfully places a prediction. It respects the `prefers-reduced-motion` media query by showing a static success indicator instead of animated confetti for users who have enabled reduced motion.

## Features

✅ **Full-motion confetti** — Canvas-based confetti animation using `canvas-confetti`  
✅ **Reduced-motion fallback** — Static success indicator (no animation)  
✅ **Reactive to preference changes** — Responds to runtime media query changes  
✅ **SSR-safe** — No errors when rendered on the server  
✅ **WCAG 2.1 AA compliant** — Decorative, non-interactive, accessible  
✅ **Dark mode compatible** — Uses design tokens for all colors  
✅ **Automatic cleanup** — No memory leaks or lingering DOM elements

---

## Usage

### Basic Example

```tsx
import { useState } from "react"
import { SuccessConfetti } from "@/app/components/SuccessConfetti"

export function PredictionForm() {
  const [showConfetti, setShowConfetti] = useState(false)

  const handleSuccess = () => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 5000)
  }

  return (
    <>
      <SuccessConfetti isVisible={showConfetti} />
      <button onClick={handleSuccess}>Place Prediction</button>
    </>
  )
}
```

### Integration with `notifyBetPlaced`

```tsx
import { notifyBetPlaced } from "@/lib/audio/notify-success"
import { SuccessConfetti } from "@/app/components/SuccessConfetti"

const [showConfetti, setShowConfetti] = useState(false)

const handleBetPlaced = () => {
  notifyBetPlaced({
    title: "Prediction placed",
    description: "Your prediction has been confirmed.",
    onSuccess: () => {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    },
  })
}
```

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isVisible` | `boolean` | *required* | Controls whether confetti is shown. When `false`, nothing is rendered. |
| `className` | `string` | `""` | Optional className for positioning the static fallback. |
| `testId` | `string` | `"success-confetti"` | Optional test ID for testing. |

---

## Behavior

### When `isVisible` is `false`

- Component renders `null`
- No DOM elements are created
- No confetti is triggered

### When `isVisible` is `true` and motion is **not** reduced

- Dynamically imports `canvas-confetti` library
- Fires two confetti bursts (100 particles + 50 particles)
- Uses chart color tokens (`--chart-1`, `--chart-2`, `--chart-4`, `--chart-5`)
- Confetti is rendered into a global canvas element by the library
- Canvas is automatically removed after animation completes
- Component renders a minimal placeholder for React's component contract

### When `isVisible` is `true` and motion **is** reduced

- Renders a static success indicator
- Displays a large `CheckCircle` icon with gradient background
- No animation classes or transitions
- Uses success color tokens (`green-500`, `emerald-500`)
- Equally visually prominent as the confetti animation

### Preference changes at runtime

- Component is reactive to `prefers-reduced-motion` changes
- If user changes their preference while the app is running, the component responds immediately
- Switches between confetti and static fallback without re-mounting

---

## Accessibility

### WCAG 2.1 AA Compliance

| Criterion | Implementation |
|-----------|----------------|
| **2.3.3 Animation from Interactions** | All motion is disabled under `prefers-reduced-motion` |
| **4.1.2 Name, Role, Value** | Decorative elements have `aria-hidden="true"` and `role="presentation"` |
| **1.4.3 Contrast (Minimum)** | All colors use design tokens with WCAG AA contrast ratios |
| **2.1.1 Keyboard** | Confetti does not trap focus or intercept keyboard events |

### Accessibility Features

- **Decorative** — `aria-hidden="true"` and `role="presentation"` on all elements
- **Non-interactive** — `pointer-events: none` prevents interference with underlying content
- **Screen reader friendly** — Not announced by assistive technologies (purely visual)
- **No focus trap** — Does not affect keyboard navigation or focus management

---

## Design Tokens

### Confetti Colors (Full Motion)

Uses chart color tokens for multi-color confetti:

- `--chart-1` → Blue (`#3b82f6`)
- `--chart-2` → Green (`#10b981`)
- `--chart-4` → Amber (`#f59e0b`)
- `--chart-5` → Red (`#ef4444`)

### Static Fallback Colors (Reduced Motion)

Uses success color tokens:

- Icon: `text-green-500 dark:text-green-400`
- Background gradient: `from-green-500/20 to-emerald-500/20`
- Border: `border-green-500/40`

All tokens are theme-aware and work in both light and dark mode.

---

## Testing

### Test Coverage

- ✅ Renders nothing when `isVisible={false}`
- ✅ Renders confetti when `isVisible={true}` and motion is not reduced
- ✅ Renders static fallback when `isVisible={true}` and motion is reduced
- ✅ Applies correct accessibility attributes (`aria-hidden`, `role`)
- ✅ Responds to preference change at runtime
- ✅ SSR-safe (no errors when `window` is `undefined`)
- ✅ Cleans up on unmount
- ✅ Dark mode compatibility
- ✅ No hardcoded color values
- ✅ Vacuousness checks (tests fail if guards are removed)

### Running Tests

```bash
# Run all SuccessConfetti tests
npm test -- SuccessConfetti

# Run with coverage
npm test -- SuccessConfetti --coverage

# Run reduced-motion specific tests
npm test -- SuccessConfetti.reduced-motion
```

---

## Implementation Notes

### Why `canvas-confetti`?

- **Battle-tested** — 5M+ weekly downloads, widely used in production
- **Performant** — Canvas-based, GPU-accelerated
- **Small bundle** — ~7KB gzipped
- **Built-in reduced-motion support** — `disableForReducedMotion: true`
- **No new animation framework** — Doesn't conflict with Framer Motion

### Dynamic Import

The component uses dynamic import for `canvas-confetti`:

```tsx
import("canvas-confetti").then((confettiModule) => {
  confettiModule.default({ ... })
})
```

Benefits:
- Reduces initial bundle size
- Avoids SSR errors (canvas-confetti requires `window`)
- Only loaded when confetti is actually triggered

### Cleanup

- `canvas-confetti` manages its own canvas element
- Canvas is automatically removed after animation completes
- No manual cleanup required in the component
- On unmount, effect cleanup prevents memory leaks

---

## Integration Recommendations

### Option A: Layout Level (Recommended)

Add confetti to the dashboard layout for centralized control:

```tsx
// app/(dashboard)/layout.tsx
const [showConfetti, setShowConfetti] = useState(false)

return (
  <>
    <SuccessConfetti isVisible={showConfetti} />
    {children}
  </>
)
```

**Benefits:**
- Works across all prediction flows
- Single source of truth
- Centralized state management

### Option B: Page Level

Add confetti to specific prediction pages:

```tsx
// app/(dashboard)/events/event-page/EventDetailsClient.tsx
const [showConfetti, setShowConfetti] = useState(false)

const handleBetSubmit = async () => {
  // ... submit bet
  setShowConfetti(true)
  setTimeout(() => setShowConfetti(false), 5000)
}
```

**Benefits:**
- More granular control
- Page-specific behavior
- Easier to debug

### Option C: Context (Advanced)

Use React Context for app-wide confetti control:

```tsx
// See app/components/SuccessConfetti.example.tsx
<ConfettiProvider>
  {children}
</ConfettiProvider>
```

**Benefits:**
- Trigger confetti from anywhere
- No prop drilling
- Testable via context mocking

---

## Troubleshooting

### Confetti not appearing?

1. Check `isVisible` is `true`
2. Check browser console for import errors
3. Verify `canvas-confetti` is installed: `npm list canvas-confetti`
4. Check if reduced motion is enabled: DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion`

### Static fallback always showing?

1. Check `prefers-reduced-motion` setting in OS/browser
2. Check `useReducedMotion()` hook return value
3. Verify `window.matchMedia` is available

### TypeScript errors?

Install the TypeScript definitions:

```bash
npm install --save-dev @types/canvas-confetti
```

---

## Related Files

- **Component:** `app/components/SuccessConfetti.tsx`
- **Tests:** `app/components/__tests__/SuccessConfetti.test.tsx`
- **Reduced-motion tests:** `app/components/__tests__/SuccessConfetti.reduced-motion.test.tsx`
- **Examples:** `app/components/SuccessConfetti.example.tsx`
- **Hook:** `hooks/useReducedMotion.ts`
- **Integration point:** `lib/audio/notify-success.ts`

---

## References

- [WCAG 2.1 SC 2.3.3: Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [canvas-confetti documentation](https://github.com/catdad/canvas-confetti)
- [Designing Safer Web Animation For Motion Sensitivity](https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity/)
