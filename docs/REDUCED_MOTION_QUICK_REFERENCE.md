# Reduced-Motion Quick Reference

Quick reference guide for implementing reduced-motion accessibility patterns in React components.

---

## Basic Hook Usage

```typescript
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function MyComponent() {
  const reducedMotion = useReducedMotion();
  
  return (
    <div className={`my-component ${reducedMotion ? "" : "animate-fade-in"}`}>
      Content
    </div>
  );
}
```

---

## Component Patterns

### Pattern 1: Conditional CSS Classes

**Best for:** Simple animations, CSS transitions, Tailwind utilities

```typescript
// ✅ Good
<div className={`base-styles ${reducedMotion ? "" : "animate-bounce transition-all"}`}>

// ❌ Avoid  
<div className={reducedMotion ? "base-styles" : "base-styles animate-bounce"}>
```

### Pattern 2: Static Fallback Component

**Best for:** Complex framer-motion animations, multi-element choreography

```typescript
export function AnimatedComponent({ reducedMotion: reducedMotionProp }) {
  const reducedMotion = reducedMotionProp ?? useReducedMotion();
  
  if (reducedMotion) {
    return <StaticFallback />;
  }
  
  return <AnimatedVersion />;
}
```

### Pattern 3: Animation Bypass Logic

**Best for:** Time-dependent animations, loading states, auto-advancing content

```typescript
useEffect(() => {
  if (reducedMotion) {
    // Skip to end state immediately
    setData(finalData);
    return;
  }
  
  // Animated loading sequence
  const timer = setTimeout(() => setData(finalData), 1500);
  return () => clearTimeout(timer);
}, [reducedMotion]);
```

---

## Testing Checklist

### Required Tests
- [ ] Renders different structures for motion vs. reduced-motion
- [ ] Static fallback contains all essential content
- [ ] No animation classes in reduced-motion mode
- [ ] Accessibility attributes identical in both modes
- [ ] Prop override works correctly

### Test Template

```typescript
import { useReducedMotion } from "@/hooks/useReducedMotion";

jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

describe("MyComponent — reduced-motion", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
  });

  it("applies animations when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    // Test animated version
  });

  it("removes animations when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    // Test static version
  });
});
```

---

## Common CSS Classes to Handle

### Animation Classes
```css
/* Always wrap these in reducedMotion checks */
.animate-fade-in
.animate-slide-up
.animate-bounce
.animate-pulse
.animate-spin
.animate-ping
```

### Transition Classes  
```css
/* These are handled by global CSS but can be conditionally applied */
.transition-all
.transition-colors
.transition-transform
.duration-200
.duration-300
```

### Transform Classes
```css
/* Especially important for motion sensitivity */
.hover:scale-105
.active:scale-95
.transform
```

---

## Accessibility Requirements

### ARIA Attributes
- Maintain identical `role`, `aria-label`, `aria-live` in both motion states
- Add `role="status"` to reduced-motion notification banners
- Use `aria-live="polite"` for non-urgent status updates

### Visual Hierarchy
- Preserve visual importance without relying on motion
- Use color, size, and position to maintain emphasis
- Ensure content remains scannable when static

### Testing
- Test with actual `prefers-reduced-motion` setting enabled
- Verify with screen readers in both motion states
- Check keyboard navigation works in static mode

---

## Performance Tips

### Do ✅
- Use CSS media queries for global animation disabling
- Implement early returns to skip expensive animation logic
- Preserve hover states even when transitions are disabled
- Use identical component structure between motion states

### Avoid ❌
- Loading animation libraries when motion is reduced
- Complex JavaScript animations that bypass CSS media queries
- Different DOM structures that cause layout shifts
- Removing all visual feedback (keep hover states)

---

## Debugging

### Browser DevTools
**Chrome/Edge:** DevTools → Rendering → Emulate CSS media feature → `prefers-reduced-motion: reduce`

**Firefox:** DevTools → Settings → Accessibility → Reduce motion

### Testing Commands
```bash
# Run reduced-motion tests specifically
pnpm test -- --testPathPattern="reduced-motion"

# Test with coverage
pnpm test:coverage -- --testPathPattern="reduced-motion"
```

### Component Inspection
```typescript
// Add temporary logging to verify hook behavior
const reducedMotion = useReducedMotion();
console.log('Reduced motion enabled:', reducedMotion);
```

---

## Common Gotchas

### SSR Issues
```typescript
// ❌ Will cause hydration mismatch
const [reducedMotion, setReducedMotion] = useState(false);

// ✅ SSR-safe initialization
const [reducedMotion, setReducedMotion] = useState(() => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});
```

### Framer Motion
```typescript
// ❌ Still renders motion components
{reducedMotion ? <div>Static</div> : <motion.div>Animated</motion.div>}

// ✅ Completely separate render paths
if (reducedMotion) return <StaticComponent />;
return <AnimatedComponent />;
```

### CSS Specificity
```css
/* ❌ May be overridden by component styles */
@media (prefers-reduced-motion: reduce) {
  .animate-bounce { animation: none; }
}

/* ✅ Use !important for reliable override */
@media (prefers-reduced-motion: reduce) {
  .animate-bounce { animation: none !important; }
}
```

---

## Quick Validation

### Manual Testing
1. Enable `prefers-reduced-motion: reduce` in OS settings
2. Refresh the page
3. Verify no animations play automatically
4. Check that hover effects still provide visual feedback
5. Ensure all content remains accessible

### Automated Testing
1. Component renders without errors in both motion states
2. No animation CSS classes present when motion is reduced
3. All interactive elements remain functional
4. Screen reader announcements work correctly

---

## Resources

- **Full Documentation:** `docs/REDUCED_MOTION_PATTERNS.md`
- **Hook Implementation:** `hooks/useReducedMotion.ts`
- **Global CSS Rules:** `app/globals.css` (line ~270)
- **Example Components:** `components/leaderboard/LeaderboardPodium.tsx`