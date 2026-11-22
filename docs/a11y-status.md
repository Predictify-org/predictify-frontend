# Accessibility Audit Status

This board tracks the latest accessibility audit status for recent GrantFox-facing
components and interaction flows.

## Snapshot

- Campaign: `GrantFox`
- Last updated: `2026-07-25`
- API changes: None
- Visible product changes: Added a dedicated internal accessibility board at `app/a11y-audit/page.tsx`, added SkipToContent link, and added MobileBottomTabs badge

## Board Status

| Component | Status | What was verified | Evidence |
| --- | --- | --- | --- |
| `ConnectWalletModal` | Verified | Provider labels, last-used badge announcement, error messaging, reduced-motion animation fallback | `components/connect-wallet-modal.tsx`, `src/pages/WalletModal.tsx`, `src/pages/__tests__/WalletModal.test.tsx` |
| Outcome icons and dispute voting states | Verified | Non-color outcome affordances, decorative icon handling, three-way outcome support | `components/icons/OutcomeIcons.tsx`, `components/icons/__tests__/OutcomeIcons.test.tsx`, `components/disputes/shared/TallyBar.tsx`, `app/design-system/tokens.md` |
| `DisputeOutcomeExplainer` | Verified | Dialog trigger flow, readable math steps, formatted tally values | `components/disputes/DisputeOutcomeExplainer.tsx`, `components/disputes/__tests__/DisputeOutcomeExplainer.test.tsx` |
| `ErrorRecoveryScreen` | Verified | Recovery CTAs, incident copy affordance, route escape hatches | `components/error/ErrorRecoveryScreen.tsx`, `components/error/ErrorRecoveryScreen.test.tsx`, `components/error-boundary.tsx` |
| `VirtualizedEventsList` | Verified | Keyboard focus visibility, loading messaging, scroll restoration | `components/events/virtualized-events-list.tsx`, `components/events/__tests__/virtualized-events-list.integration.test.tsx` |
| New event form focus order | Partial | Early tab order is covered; follow-up is still needed for the full form sequence and combobox continuation | `app/(dashboard)/events/new/page.tsx`, `app/(dashboard)/events/new/page.test.tsx`, `app/(dashboard)/settings/ACCESSIBILITY.md` |
| `focus-visible CSS layer` | Verified | Global `:focus-visible` ring on all interactive surfaces, dark-mode contrast, inset variant, skip-link prominence | `app/styles/focus.css`, `app/globals.css`, `app/__tests__/focus-visible.test.js` |
| `Confirm/Cancel button order (#474)` | Verified | DOM order matches Tab order (`flex-col`, no `flex-col-reverse`) across `Dialog`, `AlertDialog`, and mobile `Drawer`. Visual ↔ keyboard consistency. Rule documented in `docs/BUTTON_ORDER.md`. | `components/ui/alert-dialog.tsx`, `components/ui/dialog.tsx`, `components/patterns/BetConfirmPattern.tsx`, `components/patterns/DisputeActionPattern.tsx`, `components/ui/__tests__/dialog-footer.test.tsx`, `docs/BUTTON_ORDER.md` |
| `SkipToContent` | Verified | First focusable link on pages, bypasses standard headers to main content | `app/components/SkipToContent.tsx`, `app/components/__tests__/SkipToContent.test.tsx`, `app/layout.tsx`, `app/(dashboard)/layout.tsx`, `app/(marketing)/layout.tsx` |
| `MobileBottomTabs badge` | Verified | Custom red badge shows unread counts visually while aria-labels announce unread status | `components/navbar/MobileBottomTabs.tsx`, `components/navbar/__tests__/MobileBottomTabs.test.tsx` |
| `AboutMarketModal` | Verified | Focus restoration via DialogContentWithFocusReturn, screen-reader text, and Tailwind color-contrast consistency | `app/components/AboutMarketModal.tsx`, `app/components/__tests__/AboutMarketModal.test.tsx` |
| `RouteDocumentTitle (#457)` | Verified | Per-route document.title updates, missing route coverage (/claims, /markets, /a11y-audit, /settings/privacy), ARIA live region announcement for SR on SPA navigation | `app/hooks/useDocumentTitle.ts`, `app/hooks/__tests__/useDocumentTitle.test.tsx`, `docs/DOCUMENT_TITLES.md` |
| Markets route | Verified | Default list, keyboard category filter, and no-results state | `app/markets/page.tsx`, `app/__tests__/a11y-routes.test.tsx`, `test-utils/axe.ts` |
| Market detail route | Verified | Market detail content and inactive tab panels | `app/markets/[id]/page.tsx`, `app/__tests__/a11y-routes.test.tsx`, `test-utils/axe.ts` |
| Claims route | Verified | Loading, populated list, and filtered empty state | `app/(dashboard)/claims/page.tsx`, `app/__tests__/a11y-routes.test.tsx`, `test-utils/axe.ts` |
| Disputes route | Verified | Default list, filtered empty state, and open review dialog | `app/(dashboard)/disputes/page.tsx`, `app/__tests__/a11y-routes.test.tsx`, `test-utils/axe.ts` |
| Settings routes | Verified | Account, inactive account tab, language, motion, and privacy settings | `app/settings/account/page.tsx`, `app/settings/language/page.tsx`, `app/settings/motion/page.tsx`, `app/settings/privacy/page.tsx`, `app/__tests__/a11y-routes.test.tsx`, `test-utils/axe.ts` |

## Notes

### Verified

These components now have explicit audit evidence in either focused test coverage,
implementation notes, or design-token documentation that supports WCAG 2.1 AA review.
The priority route suite uses `jest-axe`; jsdom color contrast is excluded because
it cannot calculate rendered color contrast. The open Radix Select menu is checked
for keyboard access and its option name, but its body-level portal is excluded from
axe's landmark-region assertion because it renders outside the route landmark.

### Partial

The new event form has an accessibility regression guard in place for early keyboard
navigation, but it should receive a broader end-to-end tab sequence audit in a later pass.

## Follow-up backlog

1. Extend the new event form keyboard test to cover the full submit path.
2. Keep this board in sync whenever new GrantFox components land with a11y-impacting UI.
3. Add the matching status update to future PR descriptions so review evidence stays easy to trace.
4. When adding a new `Dialog` / `AlertDialog` / `Drawer`, follow [`docs/BUTTON_ORDER.md`](./BUTTON_ORDER.md) so this audit row stays accurate.
5. Audit remaining ad-hoc footer layouts (`components/connect-wallet-modal.tsx`, `app/(dashboard)/disputes/page.tsx`) on a future pass — they currently use a single primary button so are trivially compliant, but should be re-checked if any cancel affordance is added.
