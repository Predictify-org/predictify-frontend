# StreamPay Success Feedback Patterns

## Scope

UI/UX and product design handoff for positive feedback after major stream and Stellar on-chain milestones. This is a Figma/static design artifact only; no React, toast system, route, or `copy.ts` implementation is included.

## Deliverables

- `success-feedback-patterns.pdf` - three-page stakeholder/design review export.
- `success-toast-patterns.png` - inline toast pattern preview.
- `success-full-page-patterns.png` - blocking/full-page confirmation preview.
- `success-edge-and-a11y.png` - delayed confirmation edge case and accessibility annotations.
- `success-feedback-spec.md` - copy, interaction, accessibility, and product TBD notes.
- `build_success_feedback.py` - local exporter for PDF/PNG previews and QA report.
- `quality-report.json` - output and quick contrast self-check.

## Included Milestones

- Stream created.
- Settlement completed.
- Withdrawal completed.
- Optional placeholder: included in ledger `N`.
- Edge case: delayed confirmation after a submitted success state.

## Pattern Rules

- Inline success toast: use for non-blocking confirmation where the user can continue working.
- Blocking confirmation: use after high-importance money-adjacent milestones that deserve review, receipt, or a clear next action.
- Copy stays non-binding about Stellar/Horizon timing. Avoid exact finality promises unless product/legal approves them.
- Soroban and contract-specific claims remain TBD until contracts/API behavior is final.

## Handoff Target

Parent Figma area: stream lifecycle feedback and Stream detail.

Suggested frame names:

- `Feedback / Toast / StreamCreated`
- `Feedback / Toast / SettlementCompleted`
- `Feedback / Toast / WithdrawalCompleted`
- `Feedback / FullPage / StreamCreated`
- `Feedback / FullPage / SettlementReceipt`
- `Feedback / Edge / DelayedConfirmation`
- `Feedback / A11yAnnotations`

## Validation

Run:

```powershell
& 'C:\Users\hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' design/success-feedback-patterns/build_success_feedback.py
```

The script writes the PDF, PNG previews, and `quality-report.json`.
