# StreamPay on Stellar v1 Review Pack Handoff

## Deliverables

- `streampay-stellar-v1-review-pack.pdf` - single stakeholder PDF export.
- `previews/01-exec-summary.png` through `previews/08-product-tbd-handoff.png` - page previews for quick review.
- `build_review_pack.py` - local offline exporter for the PDF and preview PNGs.
- `quality-report.json` - export verification and quick WCAG contrast self-check.

## Included Screens

1. Exec summary: payment stream definition, Stellar-fintech positioning, and product guardrails.
2. Home / hero.
3. Streams list.
4. Create stream wizard step.
5. Stream detail.
6. Settle / withdraw modal.
7. Activity.
8. Product TBD and handoff notes for Soroban, on-chain escrow, and vesting.

## Product Guardrails

- Soroban: keep copy as pending product and engineering sign-off unless v1 scope explicitly includes smart contracts.
- On-chain escrow: do not claim final custody, enforcement, or settlement semantics until data sources are signed off.
- Vesting: out of v1 in this pack unless product adds it explicitly.
- Horizon / chain observability: user-facing copy can say activity may take a moment to refresh; do not promise SLOs.

## Accessibility Self-Check

- Contrast: the export script checks key foreground/background pairs against WCAG AA thresholds.
- Focus/keyboard: documented as handoff requirements for the Figma/prototype file; still requires interactive prototype review.
- Phase 2 gaps: live region announcements for status changes, richer reduced-motion notes, and full screen-reader pass.

## Review Still Needed

- PM locks the six included screens and one-line value proposition.
- Design crit with at least one product stakeholder and one engineering stakeholder.
- Product/engineering confirms Soroban, escrow, and vesting scope.
- Attach review notes to Figma or a short linked doc before closing the issue.

## References

- Stellar developer docs: https://developers.stellar.org/
- Soroban smart contracts docs: https://developers.stellar.org/docs/build/smart-contracts
- Horizon API docs: https://developers.stellar.org/docs/data/apis/horizon
- Local StreamPay design QA checklist: `docs/design-qa-checklist.md`
