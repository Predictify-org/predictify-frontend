# Per-Prediction Comment Thread (`PredictionComments`)

> **Issue #342** · GrantFox FWC26 · Stellar Wave Program

---

## Overview

`PredictionComments` adds a compact, per-prediction comment thread mini-UI that lives beneath each prediction card/market detail section.  It is built entirely with existing design-system tokens and components — no external dependencies were added.

---

## Files

| File | Purpose |
|---|---|
| `app/components/PredictionComments.tsx` | Core component (new) |
| `app/components/PredictionCommentsLoader.tsx` | Thin client wrapper (reads `WalletContext`) |
| `app/(dashboard)/predictions/[id]/page.tsx` | Per-prediction detail route (new) |
| `app/markets/[id]/page.tsx` | Market detail page — integrates comment thread |
| `app/components/__tests__/PredictionComments.test.tsx` | 34 focused tests |

---

## Features

### Comment Thread
- Collapsible panel toggled by a header button with a comment-count badge.
- Shows author avatar (deterministic hue from Stellar address), display name, relative timestamp, and body.
- Nested replies (one level deep) rendered with a left-border indent.

### Emoji Reactions
- Four reactions per comment: 👍 👎 🔥 🤔
- Optimistic toggle: press once to react (+1 count, `aria-pressed=true`), press again to un-react.
- Reaction counts are shown inline on the pill button.

### Reply Thread
- "Reply" button appears on top-level comments for connected users.
- Inline reply form expands below the parent with the author name pre-filled in the placeholder.
- Cancel button or **Escape** key closes the form.

### New Comment Form
- Textarea with **Post** button (disabled when empty).
- **⌘↵ / Ctrl+Enter** submits; **Escape** cancels a reply.
- Not rendered when wallet is disconnected (replaced by a "connect wallet" prompt).

---

## Accessibility

- `aria-expanded`, `aria-controls` on the toggle button.
- `role="region"` with an accessible label on the open panel.
- `role="list"` / `role="listitem"` on the comment and reply lists.
- `aria-pressed` on reaction buttons.
- `role="status"` live region announces "Comment posted." / "Reply posted." after optimistic updates.
- `aria-label` on every interactive element.
- `<time dateTime="…">` with ISO-8601 `dateTime` attribute on timestamps.
- All focus rings use `focus-visible:ring-2 focus-visible:ring-ring`.

---

## Reduced-Motion

All CSS transitions include `motion-reduce:transition-none` so users with `prefers-reduced-motion: reduce` see no animations.

---

## Dark Mode

All colours use design tokens (`bg-card`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-primary/10`, etc.) so dark-mode is automatic.

---

## Usage

```tsx
// Server component (no wallet needed):
import PredictionCommentsLoader from "@/app/components/PredictionCommentsLoader";

<PredictionCommentsLoader predictionId={market.id} />
```

```tsx
// Direct usage (e.g. in tests or Storybook):
import { PredictionComments } from "@/app/components/PredictionComments";

<PredictionComments
  predictionId="pred-123"
  initialComments={comments}        // optional; defaults to mock data
  currentUserAddress="GABCD…"        // empty string → read-only mode
/>
```

---

## API Shape (replace mock with real fetch)

```ts
// GET /api/predictions/:id/comments
type Comment = {
  id: string;
  author: string;
  authorHandle: string;  // Stellar address or handle
  createdAt: string;     // ISO-8601
  body: string;
  reactions: Array<{
    emoji: "👍" | "👎" | "🔥" | "🤔";
    count: number;
    hasReacted: boolean;
  }>;
  replies?: Comment[];
};

// POST /api/predictions/:id/comments        { body: string }
// POST /api/predictions/:id/comments/:cid/replies  { body: string }
// POST /api/predictions/:id/reactions       { commentId: string, emoji: string }
```

---

## Tests

```bash
node_modules/.bin/jest PredictionComments --no-coverage
```

34 tests covering:
- Collapsed / open toggle & ARIA state
- Comment list rendering (author, timestamp, body, nested replies)
- Empty state
- Reaction toggle (optimistic increment / decrement)
- Post new comment (connected + read-only)
- Post reply (connected + cancel / Escape)
- Keyboard shortcuts (Ctrl+Enter, Escape)
- ARIA: `aria-controls`, `role="region"`, `role="list"`, `aria-pressed`, `dateTime`
- Live-region announcement
