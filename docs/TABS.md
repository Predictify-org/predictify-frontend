# Tabs — Roving Tabindex Primitive

> **Campaign:** GrantFox FWC26 · **Added in:** `task/tabs-primitive`

A fully custom, headless-style tabs component implementing the
[WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) with an
explicit **roving tabindex** focus-management strategy.

---

## Why a custom component?

`components/ui/tabs.tsx` wraps `@radix-ui/react-tabs`, which is excellent for
general use. Radix uses its own internal focus-management mechanism that is not
surfaced as a roving tabindex. The GrantFox FWC26 accessibility audit required
an explicit, auditable roving-tabindex implementation with no third-party black-
box focus management.

---

## File locations

| File | Purpose |
|------|---------|
| `app/components/Tabs.tsx` | Roving-tabindex tabs primitive |
| `app/components/__tests__/Tabs.test.tsx` | 55 focused unit/integration tests |
| `app/markets/[id]/page.tsx` | Integration point — market detail tabs |

---

## API Reference

### `<Tabs />`

The root component. Manages active-tab state and provides context to all
sub-components internally.

```tsx
import { Tabs } from "@/app/components/Tabs";

<Tabs
  tabs={tabs}
  defaultValue="overview"
  aria-label="Market detail sections"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `TabItem[]` | **required** | Array of tab definitions (see `TabItem` below) |
| `value` | `string` | — | Controlled active tab value |
| `onValueChange` | `(value: string) => void` | — | Called when the active tab changes |
| `defaultValue` | `string` | first enabled tab | Initial active tab (uncontrolled mode) |
| `className` | `string` | — | Class names for the outer wrapper `<div>` |
| `tabListClassName` | `string` | — | Class names for the `role="tablist"` element |
| `tabClassName` | `string` | — | Class names applied to every `role="tab"` button |
| `panelClassName` | `string` | — | Class names applied to every `role="tabpanel"` |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Controls arrow-key direction and `aria-orientation` |
| `aria-label` | `string` | — | Accessible label for the tablist |
| `aria-labelledby` | `string` | — | ID of an element whose text labels the tablist |

#### `TabItem`

```ts
interface TabItem {
  /** Machine-readable value — must be unique within the Tabs instance. */
  value: string;
  /** Rendered inside the trigger button — can be a string or JSX. */
  label: React.ReactNode;
  /** Rendered in the panel when this tab is active. */
  content: React.ReactNode;
  /** When true, the trigger is rendered but non-interactive and skipped during navigation. */
  disabled?: boolean;
}
```

---

## Usage Examples

### Uncontrolled (most common)

```tsx
<Tabs
  tabs={[
    { value: "overview",   label: "Overview",   content: <OverviewPanel />   },
    { value: "activity",   label: "Activity",   content: <ActivityPanel />   },
    { value: "resolution", label: "Resolution", content: <ResolutionPanel /> },
    { value: "timeline",   label: "Timeline",   content: <TimelinePanel />   },
  ]}
  defaultValue="overview"
  aria-label="Market detail sections"
/>
```

### Controlled (with URL sync)

```tsx
const [tab, setTab] = useSearchParamState("tab", "overview");

<Tabs
  tabs={...}
  value={tab}
  onValueChange={setTab}
  aria-label="Market detail sections"
/>
```

### Vertical layout

```tsx
<Tabs
  tabs={...}
  orientation="vertical"
  aria-label="Settings sections"
  className="md:flex-row md:gap-6"
/>
```

### With disabled tab

```tsx
<Tabs
  tabs={[
    { value: "live",   label: "Live",   content: <LivePanel />   },
    { value: "closed", label: "Closed", content: <ClosedPanel />, disabled: true },
  ]}
  defaultValue="live"
  aria-label="Market filter"
/>
```

### Custom styling

```tsx
<Tabs
  tabs={...}
  tabListClassName="bg-muted/50 rounded-lg p-1"
  tabClassName="rounded-md data-[selected]:bg-background"
  panelClassName="py-6"
/>
```

---

## Keyboard Interaction

| Key | Action |
|-----|--------|
| `Tab` | Moves focus **into** the tablist (to the active trigger), then to the active panel |
| `ArrowRight` / `ArrowDown` | Moves focus (and activates) the next enabled tab. Wraps from last → first. |
| `ArrowLeft` / `ArrowUp` | Moves focus (and activates) the previous enabled tab. Wraps from first → last. |
| `Home` | Moves focus (and activates) the first enabled tab |
| `End` | Moves focus (and activates) the last enabled tab |

Arrow orientation follows the `orientation` prop:
- `horizontal` → ArrowLeft / ArrowRight
- `vertical` → ArrowUp / ArrowDown

Disabled tabs are skipped in all arrow-key navigation.

---

## Roving Tabindex Details

The roving tabindex pattern keeps only the **active tab** in the natural tab order
(`tabIndex={0}`). All other tabs carry `tabIndex={-1}` so that pressing `Tab` takes
the user directly from the tablist to panel content — rather than cycling through
every trigger.

```
[Tab key] → active trigger (tabIndex 0) → [Tab key] → panel content
```

Keyboard users navigate between triggers **exclusively via arrow keys**, matching the
[ARIA authoring practices for composite widgets](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex).

---

## Accessibility (WCAG 2.1 AA)

| Criterion | How satisfied |
|-----------|---------------|
| 1.3.1 Info and Relationships | `role="tablist"`, `role="tab"`, `role="tabpanel"` |
| 2.1.1 Keyboard | Full arrow-key navigation; Home/End; disabled skip |
| 2.4.3 Focus Order | Roving tabindex; panel has `tabIndex={0}` for Tab navigation |
| 4.1.2 Name, Role, Value | `aria-selected`, `aria-controls`, `aria-labelledby`, `aria-orientation`, `aria-disabled` |

The component uses the global `focus.css` layer for consistent 3 px ring focus
indicators that adapt to dark mode via `--ring` design token.

---

## Visible Changes

### `app/markets/[id]/page.tsx` — Market detail page

A `<Tabs>` section is now rendered below the `MarketHero` component with four
tabs:

| Tab | Content |
|-----|---------|
| **Overview** | Market probability, description (placeholder) |
| **Activity** | Recent bets and participant activity (placeholder) |
| **Resolution** | Oracle sources and criteria (placeholder) |
| **Timeline** | Market lifecycle events (placeholder) |

The section carries `aria-label="Market detail sections"` and defaults to the
**Overview** tab on load.

Panel content is intentionally descriptive placeholder text; real sub-components
(BetForm, ActivityTimeline, ResolutionPreview, MarketTimeline) will be wired in
follow-up tasks once this primitive is approved.

---

## Design Token Consistency

The component uses only Tailwind semantic colour tokens — no hardcoded hex values:

| Element | Token |
|---------|-------|
| Inactive trigger text | `text-muted-foreground` |
| Hover background | `hover:bg-accent` |
| Active trigger text | `text-foreground` |
| Active underline indicator | `bg-primary` |
| Tablist border | `border-border` |
| Focus ring | `ring-ring` (via global `focus.css`) |

Dark mode is automatic via the `.dark` class on `<html>` (Next Themes).

---

## Test Coverage

```
Test Suites: 1 passed
Tests:       55 passed
```

| Suite | Tests |
|-------|-------|
| ARIA roles and attributes | 10 |
| Roving tabindex | 4 |
| Mouse interaction | 3 |
| Keyboard navigation (horizontal) | 8 |
| Keyboard navigation (vertical) | 5 |
| Disabled tabs | 3 |
| Panel visibility | 3 |
| DOM preservation | 2 |
| Controlled mode | 4 |
| Uncontrolled mode | 4 |
| Multiple instances | 1 |
| className forwarding | 4 |
| Edge cases | 4 |
