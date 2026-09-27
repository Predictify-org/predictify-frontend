# Sticky Action Panel For Market Detail

This design spec defines how the market detail action panel should behave across desktop and mobile for betting, claiming, and dispute-related actions.

Scope: frontend design only.
Timeframe: apply this pattern to market detail work delivered within 96 hours before merge.

## Goal

Keep the primary action reachable without covering important market content. The sticky panel should adapt to market lifecycle state, remain usable with mobile keyboards, and never trap the user on small screens.

## Preferred Pattern

Use a responsive sticky action panel with different behavior by breakpoint:

- Desktop: sticky right-side panel inside the market detail layout
- Mobile: sticky bottom action panel with expandable details

The panel must remain dismissible or collapsible when it risks covering content or competing with input focus.

## Sticky Behavior Rules And Breakpoints

### Desktop: `min-width: 1024px`

- Place the action panel in the right rail beside the main market content.
- Keep it sticky below the page header once the panel reaches the viewport top.
- Do not let the sticky panel overlap the footer or extend beyond the main content container.
- Keep the primary CTA visible without requiring the user to scroll back to the top of the market page.
- Show supporting details in the panel by default: selected outcome, amount, payout summary, or claim/dispute context depending on state.

Passing pattern: the main market content scrolls while the action panel remains pinned in the right rail with the primary CTA visible.

Failing pattern: the panel covers market content, overlaps the footer, or sticks so aggressively that the user loses access to context below it.

### Tablet: `640px - 1023px`

- Use a stacked layout with the action panel following the main market summary.
- The panel may become sticky only after the user scrolls past the market header.
- Keep the sticky treatment lighter than desktop: pin the primary CTA row, not the full detail card, when vertical space is limited.
- Collapse secondary details by default if the content would push the primary CTA below the fold.

Passing pattern: the CTA row stays reachable while secondary payout or dispute details collapse into a summary line.

Failing pattern: the entire action card remains fixed and covers the odds list, evidence section, or important market notes.

### Mobile: `< 640px`

- Use a bottom-anchored sticky action panel above the safe area.
- Keep the closed state compact: summary plus primary CTA only.
- Expand supporting details in a sheet, drawer, or inline expansion above the CTA row.
- The panel must never permanently cover the bottom of the market content; reserve space or pad the page bottom so the final content remains readable.
- Provide a visible collapse or dismiss affordance when the expanded panel is open.

Passing pattern: the sticky bar shows selected state and primary CTA, while full details expand only when needed.

Failing pattern: a large fixed panel blocks the final market options, the dispute rationale, or the last historical row.

## Keyboard And Input Behavior On Mobile

- When the amount field or textarea receives focus, the sticky panel should move above the on-screen keyboard or reduce to a compact CTA strip.
- Never let the keyboard cover the input, helper text, or the primary CTA.
- If the keyboard reduces usable height too far, collapse secondary panel details automatically and preserve only:
  - Selected outcome or action label
  - Primary input summary
  - Primary CTA
- If the user is entering a dispute reason or bet amount, do not trap focus inside the sticky panel.
- The user must still be able to scroll the page content and dismiss the keyboard naturally.

Passing pattern: focusing the bet amount field lifts or compacts the sticky panel so the field, helper text, and CTA remain visible above the keyboard.

Failing pattern: the keyboard hides the amount field or submit button, or the sticky panel pins itself over the text entry area.

## Dismissible And Collapsible Rules

- The panel must be collapsible on mobile and tablet when expanded details are not actively needed.
- Use a clear affordance such as `Show details`, chevron collapse, or drag handle.
- Do not force the user to keep a tall panel open while reading market rules, history, or dispute evidence.
- If the panel is dismissed, preserve a compact CTA stub so the primary action remains reachable.
- Reopening the panel should restore the most recent input state where safe.

Passing pattern: a user collapses the detail area and keeps a one-line sticky CTA bar visible while reading the rest of the page.

Failing pattern: the sticky panel cannot be collapsed and occupies a fixed portion of the mobile viewport for the entire session.

## Content By Market Lifecycle State

The sticky panel content should change based on the market state instead of showing the same controls everywhere.

### Active Market: Bet State

Primary CTA:

- `Place Bet`

Panel content:

- Selected outcome summary
- Bet amount field
- Potential payout summary
- Fee or slippage note if relevant
- Validation or success feedback near the CTA

Rules:

- Keep the amount field and primary CTA in the same visible area.
- If no outcome is selected, use a disabled CTA with guidance such as `Select an outcome to continue`.
- Do not hide payout feedback below the sticky boundary when the user is typing.

Passing pattern: selected option, amount, payout, and `Place Bet` remain visible together in the sticky panel.

Failing pattern: the CTA remains visible but the selected outcome or amount context scrolls out of view, forcing guesswork.

### Closed Or Pending Resolution State

Primary CTA:

- No bet CTA
- Optional informational CTA such as `View Resolution Rules` or `Track Outcome` only if useful

Panel content:

- Market status
- Resolution countdown or pending status
- Claim availability summary if not yet claimable
- Dispute availability if the lifecycle permits it

Rules:

- Do not keep a disabled `Place Bet` CTA as the dominant action once the market closes.
- Shift the panel from transaction-first to status-first content.

### Resolved Claimable State

Primary CTA:

- `Claim Winnings` or `Claim Payout`

Panel content:

- Outcome summary
- Claimable amount
- Wallet or token summary
- Fee note if relevant
- Secondary action for dispute only if the dispute window is still valid

Rules:

- The claimable amount must be visible in the closed mobile state.
- If the market is resolved and claimable, claiming should outrank betting or informational actions.
- If multiple claims or wallet prompts are expected, state that before the CTA.

Passing pattern: the sticky panel shows final outcome, claim amount, and a reachable `Claim Winnings` CTA.

Failing pattern: the claim CTA is buried under non-essential market history, or the user must scroll back to the top to find it.

### Dispute-Eligible State

Primary CTA:

- `Raise Dispute` only when the dispute window is open and the user is eligible

Panel content:

- Current resolution status
- Dispute deadline
- Warning text or stake requirement
- Secondary access to claim only if claim and dispute can coexist in the same phase

Rules:

- Do not style dispute as the default action when claim is the main user path.
- Keep dispute warnings visible without pushing the CTA below the fold.
- Long evidence-entry flows should expand into a dedicated drawer or modal, not inside a permanently tall sticky panel.

### Dispute Open Or Voting State

Primary CTA:

- State-specific action such as `Vote`, `Stake On Outcome`, or `View Dispute`

Panel content:

- Dispute state badge
- Time remaining
- Leading side or tally summary if available
- Link or secondary action to full dispute details

Rules:

- Reduce market-betting content once the dispute process becomes the dominant state.
- Keep the sticky panel focused on the next valid user action, not the entire dispute record.

## Content Priority In Closed Mobile State

The closed mobile sticky panel should show only:

- Market state label
- One short context line such as selected outcome, claim amount, or dispute timer
- Primary CTA

Do not include long descriptions, full historical data, or long evidence text in the closed state.

## Space Protection Rules

- Add bottom padding to the main market detail page equal to the closed sticky panel height plus safe-area spacing.
- Increase reserved bottom spacing when the panel is expanded.
- Do not allow the sticky panel to cover:
  - Last betting option
  - Last explanatory paragraph in market rules
  - Last item in historical data
  - Dispute warnings or evidence summary

## Examples

### Active State Example

- Desktop: right-rail sticky card shows selected outcome, amount input, payout summary, and `Place Bet`.
- Mobile closed: bottom bar shows selected outcome plus `Place Bet`.
- Mobile expanded: amount field, payout summary, error/help text, and CTA appear above the keyboard-safe area.

### Resolved Claimable State Example

- Desktop: sticky right rail shows final outcome, claimable balance, wallet note, and `Claim Winnings`.
- Mobile closed: bottom bar shows `Claimable: 42.50 USDC` plus `Claim Winnings`.
- Mobile expanded: claim amount, token breakdown, wallet prompt note, and optional dispute-window notice.

## PR Review Evidence

For sticky action panel changes, include these screenshots in the PR:

- 1 desktop screenshot with the sticky panel visible
- 1 mobile screenshot with the panel closed
- 1 mobile screenshot with the panel expanded
- 1 mobile screenshot with the keyboard open while interacting with the panel
- 1 screenshot for an active betting state
- 1 screenshot for a resolved claimable state

## Validation Against Existing Screens

### `app/(dashboard)/events/event-page`

- Opportunity: replace the current always-visible side card with a responsive sticky pattern that keeps the primary action reachable across desktop and mobile.
- Risk to watch: the current bet form is separated from the option list, which can make context harder to preserve on smaller screens.

### `components/patterns/BetConfirmPattern.tsx`

- Opportunity: reuse the repo's existing desktop dialog and mobile drawer mental model for expanded action details and confirmation.
- Risk to watch: confirmation flows should not replace the need for a reachable sticky primary CTA on the base market page.

### `components/patterns/DisputeActionPattern.tsx`

- Opportunity: treat long dispute evidence flows as expanded overlays triggered from the sticky panel rather than forcing everything into the persistent panel.
- Risk to watch: dispute forms are long, so the sticky panel must hand off to a drawer or modal before the UI becomes cramped.
