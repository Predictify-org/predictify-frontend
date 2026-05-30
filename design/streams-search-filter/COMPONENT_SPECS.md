Component Specs — Streams list UI (handoff)

Overview
This file lists named components, tokens, sizing, interaction states, and ARIA notes for engineering handoff.

Tokens (use project tokens where possible)
- Color-primary: `#111827` (body text)
- Color-muted: `#6b7280` (secondary text)
- Color-surface: `#ffffff`
- Color-surface-2: `#f3f4f6` (inputs)
- Accent-success: `#0ea5a4` (active chip)
- Accent-warning: `#f97316` (paused chip)

Typography
- Body (regular): 14px / 20px line-height — token: `text-sm`
- Small/secondary: 13px / 18px — token: `text-xs`
- Heading (component title): 16px / 24px — token: `text-md`

Components

1) Search / Combobox
- Name: `Search/Combobox`
- Height: 56px (desktop), 44px (mobile)
- Padding: 16px left/right
- Font-size: 14px
- Placeholder color: `Color-muted`
- Interaction: `role="combobox"`, input `aria-controls` -> listbox id, `aria-expanded` true/false; ArrowDown opens list, Enter selects, Esc closes
- Live region: announce "Showing {n} streams" after filters applied (polite)

2) Chip / Status
- Name: `Chip/Status`
- Variants: default, active, disabled
- Min touch size: 44x44px
- Padding: 8px 12px
- Border-radius: 20px
- States: `aria-pressed` true/false; visual: filled accent for active, outline for default

3) Chip / Asset
- Name: `Chip/Asset`
- Same sizing as `Chip/Status`; optional icon on left

4) Dropdown / Sort
- Name: `Dropdown/Sort`
- Height: 40px
- Keyboard: Tab to focus, Enter/Space to open, Arrow keys navigate, Enter to select
- ARIA: `role="combobox"` or accessible `button` + `aria-expanded` pattern

5) Sheet / Filter (Mobile)
- Name: `Sheet/Filter-Mobile`
- Full-screen overlay on mobile (375px width artboards)
- Sections: Status, Asset, Sort (optional)
- Buttons: `Apply` (primary), `Clear` (secondary)
- Touch targets: 44x44px minimum

6) List / Row
- Name: `List/Row`
- Variants: Comfortable (64px), Default (56px), Compact (48px)
- Left: recipient name (primary) — font-size 14px
- Right: asset and next payout (secondary) — font-size 13px
- Action affordance: row click or explicit kebab menu; ensure accessible label for actions

Accessibility notes
- Ensure all components have keyboard focus styles and `:focus-visible` states.
- Use ARIA roles per WAI-ARIA Authoring Practices for combobox/listbox.
- Provide `aria-live="polite"` region for dynamic counts when filters change.

Export names for assets
- Components should be exported with these names for handoff:
  - `Search-Combobox.png`
  - `Chip-Status-Default.png`, `Chip-Status-Active.png`
  - `Dropdown-Sort.png`
  - `Sheet-Filter-Mobile.png`
  - `List-Row-Default.png`, `List-Row-Compact.png`

Notes for engineering
- Document any live-region copy and exact ARIA attribute usage in the frontend ticket.
- If token adjustments are required (WCAG), coordinate with Brand for approvals.
