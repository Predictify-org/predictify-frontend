# Mobile Portfolio Quick Actions

This design spec defines how quick actions should work on mobile portfolio screens such as My Predictions, claimable positions, and transaction history.

Scope: frontend design only.
Timeframe: apply this pattern to mobile portfolio work delivered within 96 hours before merge.

## Goal

Keep high-frequency actions within thumb reach without overcrowding the portfolio screen. Quick actions should feel easy to access, but `Claim all` must never be easy to trigger by accident.

## Preferred Placement Pattern

Use a two-layer mobile action model:

- Closed state: a sticky bottom quick-actions bar anchored inside the safe area.
- Open state: a bottom sheet for secondary controls and batch actions.

Do not use a floating action button as the primary pattern for portfolio actions. A FAB hides action labels, competes with list content, and makes `Claim all` feel too immediate for a high-impact action.

### Closed State

The sticky bottom bar should stay within thumb reach and expose only the most common actions:

- Search
- Filter
- Group
- Claim all, only when claimable positions exist

Rules:

- Keep labels visible. Do not rely on icon-only controls for primary portfolio actions.
- Limit the closed bar to 3 visible controls plus one overflow trigger if needed.
- If `Claim all` is available, place it at the far right as the most deliberate action.
- If `Claim all` is not available, do not show a disabled primary button. Replace it with more useful space for search, filter, or group.
- Keep the bar persistent while scrolling, but never let it cover the last card, last row action, or bottom-sheet handle.

Passing pattern: a mobile portfolio shows Search, Filter, Group, and a clearly labeled `Claim all` button in a bottom bar that sits above the safe area.

Failing pattern: a floating action button opens unlabeled actions, or `Claim all` appears as a prominent always-enabled control even when nothing is claimable.

### Open State

Opening quick actions should reveal a bottom sheet rather than a full-screen takeover.

The sheet should contain:

- Search field at the top
- Filter chips or grouped filter options
- Group options such as status, market, token, or claimability
- Portfolio summary row when useful, such as `12 claimable positions`
- `Claim all` action block when claimable positions exist

Rules:

- Keep the first interactive controls above the fold on common mobile heights.
- Preserve the underlying portfolio context so the user understands what the sheet is changing.
- Use clear section labels so search, filter, group, and claim actions do not blend together.
- Show active filter count and active grouping in the sheet header or trigger row.

Passing pattern: the bottom sheet opens to a search field, grouped filter controls, and a separate claim section with summary text.

Failing pattern: all controls are merged into one long list with no hierarchy, or the sheet opens so tall that the user loses context.

## Action Hierarchy

Order actions by frequency and risk:

1. Search
2. Filter
3. Group
4. Claim all

Design implications:

- Search, filter, and group should be reachable in one tap from the closed state.
- `Claim all` should be reachable, but visually separated from discovery actions.
- Do not style `Claim all` like a destructive action, but do style it as high impact.
- Avoid placing `Claim all` next to close, back, or dismiss controls.

## Confirmation Rules For High-Impact Actions

`Claim all` requires a confirmation step every time.

Use a confirmation bottom sheet or confirmation dialog with:

- The number of claimable positions
- Estimated total claim amount by token if available
- Any fee, gas, or settlement note that changes user expectation
- Clear primary action text such as `Confirm claim all`
- Secondary cancel action

Confirmation rules:

- Never trigger `Claim all` directly from the sticky bar with one tap.
- Never use swipe, long-press, or gesture shortcuts for `Claim all`.
- Do not place `Claim all` inside a crowded overflow menu with destructive items.
- Disable the confirm button until claimable totals are loaded if the amount is still resolving.
- If claiming is partially unavailable, explain what will be skipped before confirmation.
- After confirmation, show progress and completion feedback without removing the user from the portfolio context.

Passing pattern: tapping `Claim all` opens a confirmation sheet reading `Claim 12 positions` with total amount, fee note, cancel, and confirm actions.

Failing pattern: tapping `Claim all` immediately submits the transaction or confirms with a generic `Are you sure?` message that hides the actual impact.

## Thumb-Reach And Layout Guidance

- Place the sticky bar at the bottom edge above the device safe area.
- Keep the most common actions centered or bottom-right within easy thumb reach.
- Avoid placing primary quick actions only in the top app bar on mobile.
- Keep tap targets large enough for one-handed use, especially for filter chips and claim actions.
- When the keyboard opens for search, keep filter and claim actions reachable after dismissing the keyboard.

## Search, Filter, And Group Behavior

### Search

- Search should open inline in the bottom sheet or expand from the quick-actions bar.
- Keep the field persistent until dismissed so users can refine results without re-opening actions.

### Filter

- Show active filter count in the closed state.
- Group filters by meaning, such as status, token, settlement state, and date.
- Provide clear reset and apply actions at the bottom of the sheet.

### Group

- Keep grouping options short and mutually exclusive.
- Recommended groups for portfolio:
  - Claimable first
  - Status
  - Market
  - Token
- If group order changes the list significantly, show the active grouping in the closed state.

## Claimable-Heavy Portfolio Example

Use this example when the user has many settled positions ready to claim.

Closed state:

- Sticky bar shows `Search`, `Filter`, `Group`, and `Claim all`.
- The `Claim all` control includes a count badge such as `12`.

Open state:

- Bottom sheet header shows `Portfolio actions`.
- Summary row states `12 positions ready to claim`.
- Search and filter sections remain available above the claim section.
- Claim section includes token totals and a short note such as `Some claims may settle in separate wallet prompts`.

Confirmation state:

- Confirmation sheet headline: `Claim all ready positions`
- Body copy: shows count, estimated total, and any wallet or network note
- Primary action: `Confirm claim all`
- Secondary action: `Cancel`

Failing example:

- A claimable-heavy portfolio uses a single bright floating button over the list with no count, no summary, and no confirmation.

## PR Review Evidence

For mobile portfolio quick-action changes, include these screenshots in the PR:

- 1 mobile screenshot with quick actions closed
- 1 mobile screenshot with quick actions open
- 1 mobile screenshot of the `Claim all` confirmation state when applicable
- 1 mobile screenshot of a claimable-heavy portfolio example

## Validation Against Existing Screens

### `app/(dashboard)/mypredictions`

- Opportunity: replace the top-right filter-only action with a thumb-reach quick-actions bar for search, filter, and group.
- Risk to watch: the current top-area controls compete with the main tabs and are harder to reach one-handed on mobile.

### `components/transactions/TransactionsHstory.tsx`

- Opportunity: move dense filter controls into a bottom sheet and expose the active filter count from the sticky quick-actions bar.
- Risk to watch: the current expanded filter panel takes large vertical space and would feel heavy on smaller screens.

### Claimable-heavy portfolio state

- Opportunity: use a count-aware `Claim all` entry point with a separate confirmation step and summary totals.
- Risk to watch: placing `Claim all` beside low-risk discovery actions without separation makes accidental submission more likely.
