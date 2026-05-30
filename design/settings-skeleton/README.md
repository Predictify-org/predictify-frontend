# StreamPay Settings Skeleton

## Scope

UI/UX and product design handoff for a thin v1 Settings surface. This is not a settings route implementation and does not add backend preference handling.

## Deliverables

- `settings-skeleton.pdf` - two-page stakeholder/design review export.
- `settings-overview.png` - list-row settings skeleton preview.
- `network-switch-modal.png` - Stellar network switch confirmation preview.
- `settings-spec.md` - Figma IA, component, accessibility, and product TBD notes.
- `build_settings_skeleton.py` - local exporter for the PDF/PNG previews and QA report.
- `quality-report.json` - output and quick contrast self-check.

## Included Screens

1. Settings overview with iOS-like list rows:
   - User defaults / default stream asset.
   - Stellar network selector with prominent safety callout.
   - Notification opt-ins for email communications.
   - Soroban/contract-related preferences marked TBD.

2. Network switch confirmation modal:
   - Reconfirmation copy.
   - Current/target network values.
   - Safety notes for testnet.
   - Destructive/caution treatment.

## Handoff Target

Parent Figma area: App shell / Settings IA skeleton.

Suggested frame names:

- `Settings / Overview / Desktop`
- `Settings / NetworkSwitch / ConfirmModal`
- `Settings / RowComponent / Button`
- `Settings / RowComponent / Link`
- `Settings / ScopeOnePager`

## Review Notes

- PM should lock v1 vs later settings in a short scope review.
- Every row must be annotated in Figma as a button or link.
- Network switching requires a confirmation modal and must not be treated as a casual toggle.
- Email opt-in copy should be reviewed with product/legal before implementation.
- Soroban/contract-related switches remain TBD unless product explicitly commits them.

## Validation

Run:

```powershell
& 'C:\Users\hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' design/settings-skeleton/build_settings_skeleton.py
```

The script writes the PDF, PNG previews, and `quality-report.json`.
