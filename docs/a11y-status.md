# Accessibility Audit Status

This board tracks the latest accessibility audit status for recent GrantFox-facing
components and interaction flows.

## Snapshot

- Campaign: `GrantFox`
- Last updated: `2026-06-29`
- API changes: None
- Visible product changes: None in this update

## Board Status

| Component | Status | What was verified | Evidence |
| --- | --- | --- | --- |
| `ConnectWalletModal` | Verified | Provider labels, last-used badge announcement, error messaging | `components/connect-wallet-modal.tsx`, `components/__tests__/connect-wallet-modal.test.tsx` |
| Outcome icons and dispute voting states | Verified | Non-color outcome affordances, decorative icon handling, three-way outcome support | `components/icons/OutcomeIcons.tsx`, `components/icons/__tests__/OutcomeIcons.test.tsx`, `components/disputes/shared/TallyBar.tsx`, `app/design-system/tokens.md` |
| `DisputeOutcomeExplainer` | Verified | Dialog trigger flow, readable math steps, formatted tally values | `components/disputes/DisputeOutcomeExplainer.tsx`, `components/disputes/__tests__/DisputeOutcomeExplainer.test.tsx` |
| `ErrorRecoveryScreen` | Verified | Recovery CTAs, incident copy affordance, route escape hatches | `components/error/ErrorRecoveryScreen.tsx`, `components/error/ErrorRecoveryScreen.test.tsx`, `components/error-boundary.tsx` |
| `VirtualizedEventsList` | Verified | Keyboard focus visibility, loading messaging, scroll restoration | `components/events/virtualized-events-list.tsx`, `components/events/__tests__/virtualized-events-list.integration.test.tsx` |
| New event form focus order | Partial | Early tab order is covered; follow-up is still needed for the full form sequence and combobox continuation | `app/(dashboard)/events/new/page.tsx`, `app/(dashboard)/events/new/page.test.tsx`, `app/(dashboard)/settings/ACCESSIBILITY.md` |
| `focus-visible CSS layer` | Verified | Global `:focus-visible` ring on all interactive surfaces, dark-mode contrast, inset variant, skip-link prominence | `app/styles/focus.css`, `app/globals.css`, `app/__tests__/focus-visible.test.js` |

## Notes

### Verified

These components now have explicit audit evidence in either focused test coverage,
implementation notes, or design-token documentation that supports WCAG 2.1 AA review.

### Partial

The new event form has an accessibility regression guard in place for early keyboard
navigation, but it should receive a broader end-to-end tab sequence audit in a later pass.

## Follow-up backlog

1. Extend the new event form keyboard test to cover the full submit path.
2. Keep this board in sync whenever new GrantFox components land with a11y-impacting UI.
3. Add the matching status update to future PR descriptions so review evidence stays easy to trace.
