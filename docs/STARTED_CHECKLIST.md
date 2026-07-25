# Started Checklist — Dashboard Onboarding

The `StartedChecklist` component provides a first-time-user onboarding checklist on the Predictify dashboard. It helps new users discover key platform features by guiding them through a set of tasks.

## Quick Start

```tsx
import { StartedChecklist } from "@/app/dashboard/StartedChecklist"

// Render on the dashboard
<StartedChecklist />
```

## Default Tasks

| # | Task | href |
|---|------|------|
| 1 | Connect your wallet | `/settings` |
| 2 | Browse prediction markets | `/events` |
| 3 | Place your first prediction | `/events` |
| 4 | Share a market | — |
| 5 | Explore the leaderboard | `/leaderboard` |

## Features

- **Checkable task list** — each task can be toggled complete/incomplete
- **Progress bar** — shows `X of N tasks completed` at the top of the card
- **SessionStorage persistence** — completed tasks and dismissed state persist across page refreshes but not across browser sessions
- **Dismissible** — users can hide the checklist via the X button or the "Dismiss checklist" button (when all tasks are complete)
- **Celebration state** — when all tasks are completed, the card transforms to show a PartyPopper icon and congratulatory message
- **Animated entrance** — uses framer-motion for a subtle fade-in + slide-up on mount
- **Accessible** — ARIA labels on checkboxes, progress bar, and list; screen-reader friendly

## API

```tsx
interface StartedChecklistProps {
  /** Override the default task list. */
  tasks?: ChecklistTask[]
  /** Called when the user dismisses the checklist. */
  onDismiss?: () => void
  /** Called when a task is toggled. Receives updated completed IDs. */
  onTaskToggle?: (completedIds: string[]) => void
}

interface ChecklistTask {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
}
```

### Custom Tasks

```tsx
import { Search, Wallet } from "lucide-react"

<StartedChecklist
  tasks={[
    {
      id: "custom-1",
      label: "Custom task",
      description: "Do something specific",
      icon: Wallet,
      href: "/custom-page",
    },
  ]}
  onTaskToggle={(ids) => console.log("Completed:", ids)}
/>
```

## SessionStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `predictify:started-checklist:completed` | `string[]` | Array of completed task IDs |
| `predictify:started-checklist:dismissed` | `boolean` | Whether the checklist is hidden |

## Testing

18 unit tests cover:

- Rendering (all tasks, progress bar, dismiss button)
- Toggling tasks (check, uncheck, onTaskToggle callback)
- Dismissing (hides component, onDismiss callback)
- All-complete celebration state
- Custom task lists
- SessionStorage persistence and restoration
- Accessibility (ARIA labels, roles)

```bash
pnpm test -- app/dashboard/StartedChecklist.test.tsx
```

## Dependencies

- `framer-motion` — entrance animation
- `@radix-ui/react-checkbox` — checkbox primitive
- `@radix-ui/react-progress` — progress bar primitive
- `lucide-react` — icons
- `@/hooks/useSessionStorage` — state persistence
