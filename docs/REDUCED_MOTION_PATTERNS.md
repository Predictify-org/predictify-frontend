# Reduced-Motion Implementation Patterns

This document describes the comprehensive reduced-motion accessibility patterns implemented across the Predictify platform. These patterns ensure WCAG 2.1 AA compliance for users with vestibular disorders and motion sensitivity.

> **Context:** Implementation of reduced-motion fallbacks for Dashboard animations (buffer #4). This addresses WCAG 2.1 SC 2.3.3 Animation from Interactions and SC 2.2.1 Timing Adjustable.

---

## Overview

The platform implements a multi-layered approach to reduced motion:

1. **CSS Media Query Global Rules** - Blanket disabling of animations via `@media (prefers-reduced-motion: reduce)`
2. **React Hook Integration** - `useReducedMotion` hook for component-level logic
3. **Static Fallback Components** - Alternative non-animated renders for complex components
4. **Transition-Safe Styling** - Conditional application of transition classes
5. **Comprehensive Testing** - Dedicated test suites ensuring motion alternatives work correctly

---

## Core Infrastructure

### useReducedMotion Hook

Location: `hooks/useReducedMotion.ts`

```typescript
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    // Sync with media query changes and handle listener cleanup
  }, [reducedMotion])

  return reducedMotion
}
```

**Key Features:**
- SSR-safe with `typeof window` check
- Synchronous initial read prevents animation flash
- Automatically responds to system preference changes
- Used consistently across all animated components

### Global CSS Rules

Location: `app/globals.css`

```css
@media (prefers-reduced-motion: reduce) {
  /* Custom animate- classes */
  .animate-fade-in,
  .animate-slide-up,
  .animate-bounce,
  .animate-status-live-pulse,
  .animate-marquee {
    animation: none !important;
  }

  /* Tailwind animate classes */
  .animate-in,
  .animate-out,
  .animate-pulse,
  .animate-spin,
  .animate-ping {
    animation: none !important;
  }

  /* Catch-all for any animate- prefixed classes */
  [class*="animate-"] {
    animation: none !important;
  }

  /* Disable transitions and set duration to 0 */
  .transition-all,
  .transition-colors,
  .transition-opacity,
  .transition-shadow,
  .transition-transform,
  [class*="transition-"],
  [class*="duration-"] {
    transition: none !important;
    animation-duration: 0ms !important;
  }

  /* Global override for any element with transitions */
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

**Coverage:**
- All custom `animate-*` classes
- All Tailwind animation utilities
- All transition and duration classes
- Catch-all selectors for comprehensive coverage

---

## Implementation Patterns

### Pattern 1: Static Fallback Components

**Use Case:** Complex components with framer-motion animations  
**Examples:** `LeaderboardPodium`, `StartedChecklist`

```typescript
export function LeaderboardPodium({ 
  topThree, 
  reducedMotion: reducedMotionProp 
}: LeaderboardPodiumProps) {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion;

  // Static fallback component
  const StaticPodium = () => (
    <div 
      className="flex items-end justify-center gap-2 sm:gap-4 py-8 mb-8"
      data-testid="leaderboard-podium-static"
      role="region"
      aria-label="Leaderboard top 3 positions"
    >
      {/* Identical structure without motion.div wrappers */}
    </div>
  );

  // Conditional rendering
  if (reducedMotion) {
    return <StaticPodium />;
  }

  return (
    <div data-testid="leaderboard-podium-animated">
      {/* framer-motion components */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Content */}
      </motion.div>
    </div>
  );
}
```

**Key Principles:**
- Identical visual structure between animated and static versions
- Same accessibility attributes (`role`, `aria-label`, etc.)
- Different `data-testid` values for testing
- Prop override support (`reducedMotionProp`)
- Preserve all non-motion styling

### Pattern 2: Conditional CSS Classes

**Use Case:** Components using CSS animations and transitions  
**Examples:** `Hero`, `AnimatedBackground`, `ConnectWalletButton2`

```typescript
export function Hero() {
  const reducedMotion = useReducedMotion();
  
  return (
    <div className="relative overflow-hidden font-sans">
      {/* Win Notification Badge */}
      <div className={`absolute right-0 -top-4 z-20 rounded-xl bg-gradient-to-r from-[#4F46E533] to-[#9333EA] p-2 shadow-2xl ${
        reducedMotion ? "" : "animate-fade-in"
      }`}>
        {/* Content */}
      </div>
      
      {/* Background overlay with conditional transitions */}
      <div className={`absolute inset-0 -z-0 bg-gradient-to-r from-purple-50 to-blue-50 opacity-0 group-hover:opacity-100 ${
        reducedMotion ? "" : "transition-opacity duration-200"
      }`} />
    </div>
  );
}
```

**Key Principles:**
- Conditional application of animation classes
- Preserve hover states and visual feedback
- Use empty string `""` instead of removing classes entirely
- Apply to both animations and transitions

### Pattern 3: Function-Based Class Generation

**Use Case:** Complex conditional styling logic  
**Examples:** `ConnectWalletButton2`, `Navbar`

```typescript
function ConnectWalletButton({ isConnected, ...props }: ButtonProps) {
  const reducedMotion = useReducedMotion();
  
  const getButtonClasses = (isHomePage: boolean) => {
    const baseTransition = reducedMotion ? "" : isHomePage 
      ? "transition-all duration-200 hover:scale-105" 
      : "transition-all duration-300 hover:shadow-cyan-500/30";
    
    return `${baseClasses} ${baseTransition}`;
  };

  return (
    <button className={getButtonClasses(pathname === "/")}>
      {/* Content */}
    </button>
  );
}
```

**Key Principles:**
- Centralized class generation logic
- Different animation behaviors for different contexts
- Clean separation of motion and non-motion styles
- Reusable across component variations

### Pattern 4: Animation Bypass Logic

**Use Case:** Components with timing-dependent behavior  
**Examples:** `Dashboard` loading states, tickers, carousels

```typescript
export default function DashboardPage() {
  const reducedMotion = useReducedMotion();
  
  useEffect(() => {
    if (reducedMotion) {
      // Skip animations and timers
      setStats(DEMO_STATS);
      setStatus("success");
      return;
    }
    
    // Original animated path with timers
    const timer = setTimeout(() => {
      setStats(DEMO_STATS);
      setStatus("success");
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Rest of component logic
}
```

**Key Principles:**
- Bypass time-dependent animations entirely
- Provide immediate feedback for reduced motion users
- Maintain the same end state regardless of path
- Use early returns for clean separation

---

## Accessibility Compliance

### WCAG 2.1 SC 2.3.3 Animation from Interactions

**Requirement:** Users can disable motion animation triggered by interaction

**Implementation:**
- All hover/focus animations respect `prefers-reduced-motion`
- Scale transforms on buttons are disabled in reduced motion
- Parallax effects are bypassed
- Loading skeleton animations are replaced with static placeholders

### WCAG 2.1 SC 2.2.1 Timing Adjustable

**Requirement:** Users can control time limits

**Implementation:**  
- Countdown timers show static "time remaining" labels
- Auto-advancing carousels pause and show navigation controls
- Loading states complete immediately without artificial delays
- Toast notifications have extended display times

### WCAG 2.1 SC 4.1.3 Status Messages

**Requirement:** Status messages are programmatically available to assistive technology

**Implementation:**
- Reduced motion status banners use `role="status"` and `aria-live="polite"`
- State changes announced through dedicated live regions
- Visual status preserved without motion dependency

---

## Testing Patterns

### Test Structure

Each animated component has a corresponding `ComponentName.reduced-motion.test.tsx` file following this structure:

```typescript
describe("ComponentName — reduced-motion implementation", () => {
  // ---- Static vs Animated rendering
  it("renders different DOM structures for motion vs. reduced-motion", () => {
    // Test both motion enabled and disabled paths
  });

  // ---- Content preservation  
  it("static fallback contains all essential information", () => {
    // Verify all data is present without animations
  });

  // ---- Animation class validation
  it("static fallback has no motion or animation classes", () => {
    // Check for absence of animate-*, transition-*, duration-* classes
  });

  // ---- Accessibility compliance
  it("both paths have identical accessibility attributes", () => {
    // Compare ARIA attributes between motion and static versions
  });

  // ---- Prop override behavior
  it("respects explicit reducedMotion prop over hook value", () => {
    // Test prop override functionality
  });

  // ---- Vacuousness checks
  it("VACUOUSNESS: test fails if useReducedMotion is ignored", () => {
    // Ensures the hook is actually consulted
  });
});
```

### Test Categories

1. **DOM Structure Tests** - Verify different rendering paths
2. **Content Preservation Tests** - Ensure all information remains accessible
3. **CSS Class Validation Tests** - Check for proper class application/removal
4. **Accessibility Compliance Tests** - Verify ARIA attributes and semantics
5. **Functionality Tests** - Confirm interactions still work
6. **Vacuousness Tests** - Prevent regression through negative assertions

### Mock Setup

```typescript
// Mock the useReducedMotion hook
jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

// Mock framer-motion to avoid JSDOM issues
jest.mock("framer-motion", () => {
  const React = require("react");
  return {
    motion: new Proxy({}, {
      get: (_, key) => React.forwardRef(({ children, ...props }, ref) => 
        React.createElement(key, { ...props, ref }, children)
      ),
    }),
  };
});
```

---

## Component Integration Checklist

When adding reduced-motion support to a component:

### 1. Hook Integration
- [ ] Import and use `useReducedMotion` hook
- [ ] Support optional `reducedMotion` prop override
- [ ] Handle SSR safely

### 2. Animation Handling
- [ ] Identify all animation/transition classes
- [ ] Create conditional class application logic
- [ ] Preserve visual hierarchy without motion
- [ ] Maintain hover/focus states

### 3. Accessibility
- [ ] Preserve all ARIA attributes in both modes
- [ ] Add appropriate `data-testid` values
- [ ] Ensure semantic structure remains identical
- [ ] Test with screen readers

### 4. Testing
- [ ] Create dedicated reduced-motion test file
- [ ] Test both animation paths
- [ ] Verify content preservation
- [ ] Add vacuousness checks
- [ ] Test prop override behavior

### 5. Documentation
- [ ] Add inline comments explaining reduced-motion logic
- [ ] Document any breaking changes
- [ ] Update component props interface
- [ ] Add usage examples

---

## Performance Considerations

### Optimization Strategies

1. **Early Returns** - Skip expensive animation logic when motion is reduced
2. **CSS-First** - Prefer CSS media queries over JavaScript where possible
3. **Lazy Loading** - Don't import animation libraries if not needed
4. **Conditional Bundling** - Use dynamic imports for animation-heavy features

### Bundle Impact

- `framer-motion` library is only loaded when animations are enabled
- CSS animations are stripped by media queries, not JavaScript
- Static fallbacks use identical component structure to minimize re-renders
- No performance regression for motion-enabled users

---

## Browser Support

### Media Query Support
- All modern browsers support `prefers-reduced-motion`
- Fallback behavior for unsupported browsers defaults to motion enabled
- Progressive enhancement approach ensures base functionality

### Testing Browsers
- Chrome/Edge: DevTools → Rendering → Emulate CSS media feature
- Firefox: DevTools → Settings → Accessibility → Reduce motion
- Safari: System Preferences → Accessibility → Display → Reduce motion

---

## Future Enhancements

### Planned Improvements
1. **Granular Motion Controls** - Separate settings for different animation types
2. **Performance Monitoring** - Track reduced-motion usage metrics
3. **Animation Registry** - Central registration system for all animations
4. **Custom Animation Curves** - Reduced-motion specific easing functions

### Migration Path
- All new animated components must include reduced-motion support from day one
- Existing components are being updated following the patterns in this document
- Legacy components will be deprecated in favor of accessible alternatives

---

## Resources

### Internal Documentation
- `docs/DASHBOARD_REDUCED_MOTION.md` - Dashboard-specific implementation
- `docs/COUNTDOWN_REDUCED_MOTION.md` - Timer component patterns
- `docs/WALLET_REDUCED_MOTION.md` - Wallet interaction patterns

### External References
- [WCAG 2.1 SC 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
- [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [CSS-Tricks Reduced Motion Guide](https://css-tricks.com/introduction-reduced-motion-media-query/)

### Code Examples
- `components/leaderboard/LeaderboardPodium.tsx` - Static fallback pattern
- `components/ui/animated-background.tsx` - Conditional CSS classes
- `app/(marketing)/_components/connectWalletButton2.tsx` - Function-based classes
- `app/(dashboard)/dashboard/page.tsx` - Animation bypass logic