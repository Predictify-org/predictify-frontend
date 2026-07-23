# SearchInput

An accessible search input that implements the
[ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
(WAI-ARIA 1.2 §5.9).

**Source:** `app/components/SearchInput.tsx`  
**Tests:** `app/components/__tests__/SearchInput.test.tsx`

---

## Features

- **ARIA combobox** — `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`,
  `aria-autocomplete="list"`, `aria-controls`, and `aria-activedescendant` are
  managed automatically.
- **Full keyboard navigation** — arrow keys, Home/End, Enter, Escape, and Tab all
  behave per the WAI-ARIA authoring guide.
- **Live region** — result counts and loading / empty states are announced to
  screen-reader users via an `aria-live="polite"` region.
- **Clear button** — keyboard-reachable with a descriptive `aria-label`.
- **Reduced-motion safe** — dropdown entrance animation is wrapped in
  `motion-safe:` utilities and is suppressed when the user has
  `prefers-reduced-motion: reduce` set.
- **Controlled & uncontrolled** — use `value` + `onChange` for a controlled
  input, or omit both for an internally-managed uncontrolled input.

---

## Usage

### Minimal example

```tsx
import { SearchInput } from "@/app/components/SearchInput";

function MyPage() {
  const [query, setQuery] = React.useState("");

  const suggestions = useMarketSearch(query); // your own hook

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      suggestions={suggestions}
      onSelect={(s) => router.push(`/events/${s.id}`)}
      onSubmit={(q) => router.push(`/events?q=${encodeURIComponent(q)}`)}
      placeholder="Search markets…"
    />
  );
}
```

### With icons and subtext

```tsx
import { TrendingUp } from "lucide-react";

const suggestions = markets.map((m) => ({
  id: m.id,
  label: m.title,
  sublabel: m.category,
  icon: <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />,
}));

<SearchInput suggestions={suggestions} onSelect={handleSelect} />;
```

### Loading state

```tsx
<SearchInput
  value={query}
  onChange={setQuery}
  suggestions={results}
  isLoading={isFetching}
  placeholder="Search markets…"
/>
```

### Uncontrolled

```tsx
<SearchInput
  suggestions={staticSuggestions}
  onSelect={handleSelect}
  placeholder="Find a market"
/>
```

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Controlled value. Omit for uncontrolled. |
| `onChange` | `(value: string) => void` | — | Called on every keystroke (controlled). |
| `suggestions` | `SearchSuggestion[]` | `[]` | Items to display in the listbox. Filter externally. |
| `onSelect` | `(suggestion: SearchSuggestion) => void` | — | Called when the user confirms an option. |
| `onSubmit` | `(query: string) => void` | — | Called on Enter with no option highlighted. |
| `onOpen` | `() => void` | — | Called when the listbox opens. |
| `onClose` | `() => void` | — | Called when the listbox closes. |
| `isLoading` | `boolean` | `false` | Shows a spinner and sets `aria-busy`. |
| `placeholder` | `string` | `"Search…"` | Input placeholder (also used as `aria-label` fallback). |
| `className` | `string` | — | Extra classes for the outermost wrapper. |
| `maxSuggestions` | `number` | `10` | Maximum rendered items. |
| `disabled` | `boolean` | `false` | Disables the input. |
| `id` | `string` | — | Forwarded to the `<input>` element. |
| `aria-label` | `string` | `placeholder` | Overrides the auto-derived aria-label. |
| `aria-labelledby` | `string` | — | Points to an external label element. |

### `SearchSuggestion`

```ts
interface SearchSuggestion {
  id: string;          // unique key
  label: string;       // primary text
  sublabel?: string;   // secondary text (smaller)
  icon?: React.ReactNode; // decorative icon (must carry aria-hidden)
}
```

---

## Keyboard interaction

| Key | Behaviour |
|---|---|
| `ArrowDown` | Open listbox; move focus to next option (wraps at end). |
| `ArrowUp` | Open listbox; move focus to previous option (wraps at start). |
| `Home` | Move focus to first option (when listbox is open). |
| `End` | Move focus to last option (when listbox is open). |
| `Enter` | Confirm highlighted option, or submit free-text query. |
| `Escape` | Close listbox; if already closed, clear the value. |
| `Tab` | Close listbox; move focus naturally. |

---

## Differences from `components/navbar/SearchInput`

| Aspect | `components/navbar/SearchInput` | `app/components/SearchInput` |
|---|---|---|
| Scope | Navbar-specific (pinned actions, recent markets, slash commands, Cmd+K) | General-purpose, data-agnostic |
| Suggestions | Pulled directly from `useEventsStore` | Consumer-provided `suggestions[]` |
| Styling | Predictify brand colours, backdrop blur | Design-system tokens (`bg-popover`, `accent`) |
| Use case | Drop-in navbar widget | Reusable in any page or form |

---

## Accessibility notes

- The component is fully keyboard-operable with no mouse required.
- Visual focus and `aria-activedescendant` are always in sync.
- The listbox is rendered inline (no portal), so it is always reachable in the
  natural DOM order.
- The clear button (`aria-label="Clear search"`) is in the tab order when
  visible.
- The live region (`aria-live="polite"`, `aria-atomic="true"`) is always in
  the DOM but only populated when the listbox is open, preventing spurious
  announcements on page load.
- The "No results" and loading states are rendered as disabled `role="option"`
  elements inside the `listbox` so the combobox structure remains valid.

---

## Running the tests

```bash
# Run only the SearchInput test file
pnpm test app/components/__tests__/SearchInput.test.tsx

# Run the full suite
pnpm test

# With coverage
pnpm test:coverage
```
