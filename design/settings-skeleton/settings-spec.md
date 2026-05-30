# Settings IA Skeleton Spec

## Intent

Settings v1 should feel familiar and low-risk: a quiet list-row surface where users can inspect defaults, understand Stellar network context, and opt into communications without feeling like they are configuring infrastructure.

This skeleton informs future backend `user prefs` work. It is not a route implementation.

## Information Architecture

### Section: Defaults

Rows:

- `Default stream asset`
  - Value: `XLM` in the mock.
  - Optional v1. If product defers asset defaults, show value as `Not set`.
  - Opens a selection sheet in later depth.

- `Default schedule timezone`
  - Value: `UTC`.
  - Rationale: stream math stays UTC; local display may be a later preference.

### Section: Stellar Network

Rows:

- `Network`
  - Value: `Testnet` or `Mainnet`.
  - Row type: button.
  - Interaction: opens confirmation modal, never a direct toggle.

- `Network safety`
  - Value: helper row or static callout.
  - Copy: `Testnet is for testing only. Do not send real funds.`

### Section: Notifications

Rows:

- `Email stream updates`
  - Value: `Off` by default in mock.
  - Row type: button or switch row; annotate accessible state.

- `Product announcements`
  - Value: `Off`.
  - Requires product/legal copy review before implementation.

### Section: Product TBD

Rows:

- `Soroban contract preferences`
  - Value: `TBD`.
  - Not committed for v1.

- `Escrow and vesting alerts`
  - Value: `TBD`.
  - Only include if product commits escrow/vesting scope.

## Interaction Rules

- Every list row is annotated as either `button` or `link` in Figma.
- Rows use a 44 px minimum target height; this skeleton uses 64 px rows.
- Network switching opens a modal with reconfirmation.
- Network switch modal requires:
  - Current network.
  - Target network.
  - Safety warning.
  - Cancel action.
  - Confirm action with caution/destructive styling.
- Avoid inline switches for network changes.

## Accessibility

- Row role annotation:
  - Button row: accessible name equals visible row label plus current value.
  - Link row: accessible name equals visible row label plus destination.
  - Switch row: include on/off state in Figma annotation.
- Focus order follows visual order from top to bottom.
- Keyboard interaction:
  - `Enter` / `Space` activates button rows.
  - `Esc` closes modal.
  - Focus returns to the `Network` row after modal close.
- Modal:
  - Initial focus on modal title or cancel action.
  - Focus is trapped while open.
  - Confirm action copy is explicit: `Switch to Testnet` or `Switch to Mainnet`.

## Copy Guardrails

Use:

- `Testnet is for testing only. Do not send real funds.`
- `Switching networks changes which streams and wallet activity are visible.`
- `Your preferences can be changed later.`

Avoid:

- `Safe mode`
- `Instant network switch`
- Any copy implying funds move automatically because the network label changed.

## States To Document

- Empty: no saved preferences.
- Loading: skeleton rows with same height as final rows.
- Error: preference save failed with retry.
- Success: preference saved confirmation.
- Disabled: unavailable until wallet connected.

## Product TBD

- Are user defaults in v1 or later?
- Is default asset limited to `XLM` and allow-listed Stellar assets?
- Does network preference persist per user, wallet, device, or environment?
- Should email opt-ins exist before backend notification preferences?
- Are any Soroban/contract-related switches approved for v1?

## Redlines

- Page max width: 960 px.
- Section gap: 28 px.
- Row height: 64 px minimum.
- Row padding: 20 px horizontal.
- Row radius: 16 px.
- Modal width: 560 px desktop.
- Modal padding: 28 px.
- Warning callout padding: 16 px.
- Button target: at least 44 x 44 px.
