# Success Feedback Spec

## Intent

Success feedback should help users trust money-adjacent actions without making crypto-style hype claims. The tone is calm, precise, and receipt-like.

## Milestones

| Milestone | Inline pattern | Blocking pattern | Notes |
| --- | --- | --- | --- |
| Stream created | Toast after draft/create action | Full-page if create flow exits into receipt | Show stream name, recipient, and next action. |
| Settlement completed | Toast if user remains on detail | Receipt page/modal if amount is material or flow is dedicated | Include amount, recipient, and status copy. |
| Withdrawal completed | Toast or receipt | Full-page receipt recommended after withdrawal flow | Include destination wallet and amount. |
| Included in ledger `N` | Optional sub-state | Optional receipt detail | Placeholder only until Horizon/Soroban data contract is final. |

## Copy Principles

Use non-binding timing:

- `Usually updates after StreamPay refreshes wallet and chain-observed activity.`
- `This may take a moment to appear in activity.`
- `Included in ledger N` only when data is available and product/engineering approve the source.

Avoid:

- `Guaranteed`
- `Instant`
- `Final forever`
- `Funds are safe now`
- Any promise about Soroban or escrow behavior before sign-off.

## Inline Toast Pattern

Use when:

- The user can keep working.
- The action has a clear next location.
- No receipt or review detail is required.

Anatomy:

- Success icon plus text label, not color alone.
- Title.
- One-line supporting copy.
- Optional link action: `View stream`, `View receipt`, or `Open activity`.
- Dismiss button with accessible label.

Accessibility annotation:

- Role: `status`.
- Live region: `polite`.
- Do not move focus to the toast unless it contains the next required action.
- Dismiss target at least 44 x 44 px.

## Blocking Confirmation Pattern

Use when:

- The action is a completed money-adjacent milestone.
- User needs a receipt, amount confirmation, or next-step decision.
- The originating flow ends after the milestone.

Anatomy:

- Calm success mark.
- Outcome title.
- Amount/recipient/asset details.
- Network or ledger status line with cautious copy.
- Primary next action.
- Secondary action back to Stream detail or Activity.

Accessibility annotation:

- If modal: `role=dialog`, labelled by title, focus trapped.
- If page: main heading receives standard page focus behavior.
- Confirmation text is available as text, not only icon or color.

## Failure After Success Edge

Frame name: `Feedback / Edge / DelayedConfirmation`

Use when:

- Local submission succeeded but Horizon/chain-observed confirmation is delayed.
- StreamPay cannot yet verify inclusion.

Copy:

`Submitted. Confirmation is taking longer than expected. We will keep checking and show the latest status in Activity.`

Actions:

- `Refresh status`
- `View activity`

Do not convert this into an error unless product defines the failure condition.

## Visual Tokens

Reuse existing StreamPay semantic colors:

- Success: `#22C55E`
- Success dark surface: `#0F2D1E`
- Text: `#E4E4E7` on dark surfaces, `#101827` on light surfaces.
- Muted: `#A1A1AA` on dark surfaces, `#475569` on light surfaces.
- Warning/delayed: `#FDE68A` on `#2A210F`.

## States To Document

- Loading / submitted.
- Success.
- Delayed confirmation.
- Error after retry.
- Dismissed toast.

## Product TBD

- Exact timing language for Horizon observed activity.
- Whether `included in ledger N` appears in v1.
- Which data source owns ledger/inclusion state.
- Whether Soroban/contract-specific receipt lines are in scope.
- Whether email notification copy appears after success.

## Handoff Notes

- This issue does not include `copy.ts` changes.
- Handoff copy changes to a separate frontend implementation issue.
- Design crit should include at least one product stakeholder and one engineering stakeholder.
