# "What's New" Changelog Drawer

A drawer, opened from the navbar, that lists recent product updates so users
don't have to discover UI changes by accident. It's mounted as `<WhatsNewDrawer />`
in [`components/navbar/Navbar.tsx`](../components/navbar/Navbar.tsx) (desktop nav
and the mobile header).

## Pieces

| File | Responsibility |
| --- | --- |
| [`content/changelog.json`](../content/changelog.json) | The changelog entries. Plain JSON so non-engineers can add an entry without touching component code. |
| [`hooks/use-whats-new.ts`](../hooks/use-whats-new.ts) | Seen/unseen state: reads/writes `localStorage`, exposes `hasUnseen`, `markSeen()`, `dismissForever()`. Has no UI dependencies, so it's tested on its own. |
| [`components/changelog/WhatsNewDrawer.tsx`](../components/changelog/WhatsNewDrawer.tsx) | The trigger button + [`Sheet`](../components/ui/sheet.tsx) UI. Renders entries from the hook. |

## Adding a changelog entry

Prepend a new object to the top of `content/changelog.json` — order matters,
the **first entry is treated as the latest** for unseen-indicator purposes:

```json
{
  "id": "2026-07-01-my-feature",
  "version": "2026.7.1",
  "date": "2026-07-01",
  "title": "Short, user-facing title",
  "description": "One or two sentences on what changed and why a user cares.",
  "highlights": ["Bullet point", "Another bullet point"],
  "image": "/changelog/my-feature.png",
  "imageAlt": "Describe what the screenshot shows"
}
```

`image` and `imageAlt` are optional — omit them if you don't have a screenshot.
When present, `image` must point to a file under `public/` (e.g.
`public/changelog/my-feature.png`); it's rendered with `next/image`.

`id` must be stable and unique — it's the value persisted to `localStorage` to
know whether a user has seen that entry, so don't reuse or rewrite an existing
entry's `id`.

## Seen/unseen behavior

- On mount, `useWhatsNew` compares `localStorage["predictify:whats-new:last-seen-id"]`
  against the first (latest) entry's `id`. If they differ — including on a
  user's very first visit, when nothing is stored yet — `hasUnseen` is `true`
  and the trigger shows a small dot.
- Opening the drawer calls `markSeen()`, which writes the latest entry's `id`
  to `localStorage` and clears the dot immediately (it does not wait for the
  drawer to close).
- Checking "Don't show this indicator again" inside the drawer calls
  `dismissForever()`, which sets `localStorage["predictify:whats-new:dont-show-again"]`.
  Once set, the dot stays hidden for all future entries too — the drawer
  itself remains reachable from the navbar at any time, only the unseen dot
  is suppressed.
- Both `localStorage` reads and writes are wrapped in `try/catch` so private
  browsing or disabled storage degrades to "no persistence" instead of
  throwing.

## Accessibility

- The trigger is a real `<button>` (via Radix's `Dialog.Trigger`), so it's
  reachable by Tab and activates on Enter/Space without extra wiring.
- Its `aria-label` carries the unseen state ("What's new: new updates
  available" vs. "What's new") since the dot itself is `aria-hidden`.
- The drawer is a Radix `Dialog` under the hood: it traps focus, closes on
  `Escape`, and returns focus to the trigger on close. While it's open, Radix
  marks the rest of the page `aria-hidden`, which includes the (now
  visually hidden by responsive CSS) duplicate trigger for the other
  breakpoint — that's expected, not a bug.
- `app/globals.css` disables the Sheet's slide-in/out animation under
  `prefers-reduced-motion: reduce` (the `.animate-in`/`.animate-out` rule),
  so the drawer snaps open/closed instead of sliding for users who've asked
  for reduced motion. This applies to every `Sheet`/`Dialog` in the app, not
  just this drawer.

## Testing

```bash
pnpm test hooks/__tests__/use-whats-new
pnpm test components/changelog
```

- `hooks/__tests__/use-whats-new.test.ts` covers the unseen logic in
  isolation: first-visit unseen state, `markSeen` clearing it and persisting
  across remounts, a newer entry becoming unseen again after an older one
  was seen, and `dismissForever` suppressing the indicator permanently.
- `components/changelog/__tests__/WhatsNewDrawer.test.tsx` covers the UI:
  entries render from the JSON source, the drawer opens/closes via Enter and
  Escape, the indicator clears on open, and the "don't show again" checkbox
  persists to `localStorage`.
