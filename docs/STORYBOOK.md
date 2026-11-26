# Storybook Component Workshop

Predictify utilizes [Storybook](https://storybook.js.org/) for building, inspecting, and testing UI kit primitives and composite components in isolation.

## Getting Started

### Development Server
To launch Storybook locally on port 6006:

```bash
pnpm storybook
```

This starts the Next.js + Tailwind-aware component workshop with hot reloading.

### Building Static Storybook
To compile the static Storybook site into `storybook-static/`:

```bash
pnpm build-storybook
```

### Accessibility (a11y) Verification
To run automated accessibility audits across all stories:

```bash
pnpm storybook:a11y
```

This script builds the Storybook workshop and evaluates WCAG 2.1 AA rules using `@storybook/addon-a11y` and axe-core.

---

## Features & Configuration

### Theming Toolbar
Storybook includes a theme switcher in the top toolbar with support for:
- **Light Theme**: Default bright palette.
- **Dark Theme**: Default dark mode.
- **High Contrast Theme**: Meets WCAG AAA contrast ratio (≥7:1 normal text, ≥4.5:1 large text) as specified in [`docs/HIGH_CONTRAST_THEME.md`](./HIGH_CONTRAST_THEME.md).

### Reduced Motion Simulation
A toolbar toggle allows developers to simulate the `prefers-reduced-motion: reduce` media query. Components with animation hooks will adjust their transition states and render static alternatives.

---

## Documented Components

The component workshop covers shared primitives and design system tokens:

| Component | Path | Stories File | Covered States |
|-----------|------|--------------|----------------|
| `Button` | `components/ui/button.tsx` | `components/ui/button.stories.tsx` | Default, Secondary, Outline, Destructive, Disabled, Icons, Long Content |
| `Badge` | `components/ui/badge.tsx` | `components/ui/badge.stories.tsx` | Default, Success, Warning, Danger/Error, Neutral/Disabled, Taxonomy, Long Content |
| `Dialog` | `components/ui/dialog.tsx` | `components/ui/dialog.stories.tsx` | Default, Error Confirmation, Scrollable Long Content |
| `Input` | `components/ui/input.tsx` | `components/ui/input.stories.tsx` | Default, Floating Label, Success, Error Message, Disabled, Long Content |
| `Dropdown` | `app/components/Dropdown.tsx` | `app/components/Dropdown.stories.tsx` | Default, Checkboxes & Disabled, Long Content |
| `Tabs` | `app/components/Tabs.tsx` | `app/components/Tabs.stories.tsx` | Default, Disabled Tab, Long Labels (Roving Tabindex) |
| `DatePicker` | `app/components/DatePicker.tsx` | `app/components/DatePicker.stories.tsx` | Single Date, Range Mode, Disabled, Long Labels |
| `EmptyState` | `app/components/EmptyState.tsx` | `app/components/EmptyState.stories.tsx` | Default, Search Empty, Error Retry, Inactive, Long Content |

---

## Writing New Stories

Place stories next to the component file using the `*.stories.tsx` convention:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta: Meta<typeof MyComponent> = {
  title: "Components/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    // Props here
  },
};
```
