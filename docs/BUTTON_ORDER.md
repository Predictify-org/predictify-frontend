# Button Order — Confirm / Cancel Pattern

> **Issue:** [#474 — Add accessible confirm/cancel button ordering](https://github.com/Predictify-org/predictify-frontend/issues/474)
> **Status:** Stable. All new confirm-style dialogs/drawers **MUST** follow this pattern.

This document defines the canonical, accessible ordering for **Cancel** and **primary action** buttons inside every `Dialog`, `AlertDialog`, and `Drawer` shipped in the Predictify frontend. It exists to guarantee:

1. **A consistent visual order** across the product, so muscle memory works everywhere.
2. **A consistent DOM/Tab order**, satisfying [WCAG 2.4.3 Focus Order](https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html) — keyboard focus must move in the same direction the eye reads.
3. **A consistent thumb‑friendly mobile pattern**, with the primary action placed where the thumb naturally rests.

If you are adding a new dialog or drawer, follow this rule **before writing any markup**.

---

## TL;DR — The Rule

> **Render the safe/Cancel element FIRST, then the primary (possibly destructive) Action element.** This applies to **both** the DOM and the markup order. Do not rely on `flex-col-reverse`, reorder CSS, or negative margins to flip visual order.

Visual layout is then derived from CSS only — never from reordering markup.

### Desktop (`sm:` and up — `min-width: 768px`)

| Position | Element | Notes                                                         |
| -------- | ------- | ------------------------------------------------------------- |
| Left     | Cancel  | Safe / non‑committal. Outline or ghost variant.               |
| Right    | Action  | Affirmative or destructive. Default or `destructive` variant. |

The action is right‑aligned via `sm:justify-end`.

### Mobile (below `sm:`)

| Position | Element  | Notes                                                                              |
| -------- | -------- | ---------------------------------------------------------------------------------- |
| Top      | Cancel   | Less prominent, escape route.                                                      |
| Bottom   | Action   | Primary action — thumb‑friendly reach. Stays visually distinct via color/variant.  |

The footer uses `flex-col` (no `flex-col-reverse`) so visual order matches DOM.

---

## Why this order?

### 1. WCAG 2.1 AA compliance

- **2.4.3 Focus Order** — The navigation order of focusable elements must preserve meaning and operability. A layout that uses `flex-col-reverse` to place the Action visually above the Cancel causes Tab to jump *downward* while advancing through the DOM, which violates this criterion.
- **2.4.7 Focus Visible** + **1.3.2 Meaningful Sequence** — Consistent visual ↔ focus order also keeps screen-reader output predictable (e.g. NVDA / VoiceOver read DOM order).

### 2. Native platform conventions

- **Desktop** mirrors the standard OS dialog button order: Cancel left → OK/Apply right. Users have decades of muscle memory here.
- **Mobile** mirrors Material Design and iOS HIG: secondary ("Cancel") above, primary ("Continue" / "Submit" / "Delete") at the bottom edge — where the thumb naturally rests.

### 3. Reduced accidental destructive taps

Putting the destructive variant at the bottom of the footer (with adequate `gap`) is safer than placing it at the top because:

- The button is visually separated from the Cancel by literal whitespace (never adjacent).
- Variant color (`bg-destructive`) plus the spacing prevents thumb‑mistakes.
- Keyboard users still reach the destructive button via Tab in a predictable path: Cancel → Action.

---

## Visual diagram

### Desktop

```
┌─────────────────────────────────────────────┐
│ Dialog title                                │
│ Dialog description                          │
│ …body content…                              │
│                                             │
│                  ┌──────────┐ ┌────────────┐ │
│                  │  Cancel  │ │   Action   │ │
│                  └──────────┘ └────────────┘ │
└─────────────────────────────────────────────┘
   ↑ Tab order matches this left → right order ↑
```

### Mobile (drawer or stacked dialog)

```
┌─────────────────────────────────────────────┐
│ Dialog / drawer title                       │
│ Dialog / drawer description                 │
│ …body content…                              │
│ ─────────────────────────────────────────── │
│ ┌─────────────────────────────────────────┐ │
│ │ Cancel                                  │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ Action  (primary / destructive)         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
   ↑ Tab order matches this top → bottom order ↑
```

---

## Implementation reference

The two primitive footers in `components/ui/` already encode this rule. **You almost never need to override their className.**

### `AlertDialogFooter` — `components/ui/alert-dialog.tsx`

```tsx
className={cn(
  "flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3",
  className,
)}
```

### `DialogFooter` — `components/ui/dialog.tsx`

```tsx
className={cn(
  "flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3",
  className,
)}
```

### Mobile `DrawerFooter` usage

When using a `Drawer` (mobile‑first), drop the safety wrapper and put the buttons directly:

```tsx
<DrawerFooter className="flex flex-col gap-2">
  {/* 1) Safe action — Cancel — first */}
  <DrawerClose asChild>
    <Button variant="outline">Cancel</Button>
  </DrawerClose>

  {/* 2) Primary / destructive — second */}
  <Button variant="destructive" onClick={onSubmit}>
    Submit Evidence
  </Button>
</DrawerFooter>
```

### Desktop `DialogFooter` usage

```tsx
<DialogFooter>
  {/* 1) Safe action — Cancel — first */}
  <Button variant="outline" onClick={onCancel}>
    Cancel
  </Button>

  {/* 2) Primary — second */}
  <Button onClick={onConfirm}>
    Confirm Prediction
  </Button>
</DialogFooter>
```

---

## Anti-patterns (do NOT do this)

- ❌ Reordering markup so the Action appears first, then using `flex-col-reverse` to "fix" the order visually. This silently breaks WCAG 2.4.3.
- ❌ Using `flex-row-reverse sm:justify-start` on desktop (would put Cancel on the right).
- ❌ Swapping element order between desktop and mobile responses if it changes the DOM order — keyboard users get a different sequence than visual users.
- ❌ Wrapping the Cancel `<Button>` in `asChild` differently from the Action, in a way that reorders the DOM via clone tricks.

If you find yourself needing any of the above, stop and either:

1. Use the existing primitives — re‑read this guide.
2. Open an issue against `docs/BUTTON_ORDER.md` to discuss the exception.

---

## Destructive vs. affirmative actions

Both kinds of flows use the **same** button order:

- **Affirmative** (Confirm Prediction, Save Changes) — primary button uses `variant="default"` or a custom brand color class.
- **Destructive** (Delete Event, Submit Evidence) — primary button uses `variant="destructive"` (or an explicit `bg-red-*` / `bg-destructive` class). Color must not be the only signal: the button label must include the destructive verb ("Delete Event", not "OK"; "Submit Evidence", not "Submit").

This keeps the order identical and the destructive nature communicated through **both** color and copy.

---

## Testing

We assert two things in every confirm-style component:

1. **DOM order** — the Cancel node is rendered before the Action node.
2. **Keyboard focus order** — `userEvent.tab()` cycles elements in DOM order inside the footer.

The shared primitive footers are covered by:

- `components/ui/__tests__/dialog-footer.test.tsx`

Pattern-specific tests:

- `components/patterns/__tests__/BetConfirmPattern.test.tsx`
- `components/patterns/__tests__/DisputeActionPattern.test.tsx`

If you add a new dialog/drawer, add or extend a test that covers at least:

- `[screen.getByRole("button", { name: /cancel/i })]` resolves to a sibling rendered **before** the action node in the footer's children.
- Tab from outside the dialog lands on Cancel, then Action.

---

## Changelog

| Date       | Change                                                          |
| ---------- | --------------------------------------------------------------- |
| 2026‑07‑23 | Initial rule + primitive updates (issue #474).                  |

---

## Related docs

- `DESIGN_ACCESSIBILITY_CHECKLIST.md` — overall a11y checklist.
- `docs/a11y-status.md` — current a11y audit and roadmap.
- WAI‑ARIA Authoring Practices — [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
