# fix: wire error/help text to inputs via aria-describedby on EventsGrid and FormControl

Closes #534

---

## Summary

This PR improves accessibility by properly wiring error and help/description text to form controls and buttons via `aria-describedby`, in compliance with **WCAG 2.1 AA** success criteria 3.3.1 (Error Identification), 3.3.2 (Labels or Instructions), and 4.1.2 (Name, Role, Value).

## Changes

### 1. `components/events/events-grid.tsx` — Error state `aria-describedby`

- Generates a stable `errorMessageId` via `React.useId()` at the **component top level** (fixed Rules of Hooks violation — hook was originally inside a conditional block)
- Assigns `id={errorMessageId}` to the error message `<p>` element
- Links the "Try again" button to the error message via `aria-describedby={errorMessageId}`, ensuring screen readers announce the error context when the button receives focus

**Before:**
```tsx
<p className="text-sm text-muted-foreground max-w-sm mb-4">
  {error}
</p>
<Button variant="outline" onClick={() => window.location.reload()}>
  Try again
</Button>
```

**After:**
```tsx
<p id={errorMessageId} className="text-sm text-muted-foreground max-w-sm mb-4">
  {error}
</p>
<Button variant="outline" onClick={() => window.location.reload()} aria-describedby={errorMessageId}>
  Try again
</Button>
```

### 2. `components/ui/form.tsx` — `FormControl` `aria-describedby` refactor

Replaced the ternary expression with a cleaner, more robust array-based pattern that avoids trailing whitespace and empty-string edge cases.

**Before:**
```tsx
aria-describedby={
  !error
    ? `${formDescriptionId}`
    : `${formDescriptionId} ${formMessageId}`
}
```

**After:**
```tsx
aria-describedby={
  [formDescriptionId, error ? formMessageId : null]
    .filter(Boolean)
    .join(" ")
}
```

### 3. Tests

- **`components/events/__tests__/events-grid.test.tsx`** — Added 2 tests:
  - Verifies `aria-describedby` on the retry button resolves to an element containing the error text
  - Verifies the error message ID is stable across re-renders (ensures `useId()` works correctly)

- **`components/ui/__tests__/form.test.tsx`** (new file) — Added 7 tests:
  - Includes form description ID when there is no error
  - Includes both description and message IDs when there is an error
  - No empty/extra spaces in `aria-describedby`
  - Sets `aria-invalid` to `true` when there is an error
  - Does not set `aria-invalid` when there is no error
  - Only includes description ID when no `FormDescription` is rendered
  - `aria-describedby` IDs are stable across re-renders

### 4. Lint fix

- Added `displayName` to the `next/link` mock in EventsGrid tests to resolve `react/display-name` lint warning

## Verification

| Check | Status |
|-------|--------|
| ESLint | ✅ Clean on all changed files |
| Form tests (7) | ✅ All passing |
| EventsGrid tests (2 new) | ✅ All passing |
| TypeScript | ✅ No type errors on changed files |

## Files Changed

```
 M components/events/__tests__/events-grid.test.tsx  (+35 lines)
 M components/events/events-grid.tsx                  (+8 lines)
 M components/ui/form.tsx                             (+3/-3 lines)
 A components/ui/__tests__/form.test.tsx              (+209 lines)
```

## Accessibility Impact

- **WCAG 2.1 AA SC 3.3.1 (Error Identification)**: Error messages are now programmatically linked to the corresponding retry action
- **WCAG 2.1 AA SC 3.3.2 (Labels or Instructions)**: Form field descriptions are correctly associated with inputs
- **WCAG 2.1 AA SC 4.1.2 (Name, Role, Value)**: `aria-invalid` is properly toggled alongside `aria-describedby` for error states
