# StreamPay Chart / Sparkline Kit

## Scope

UI/UX and product design handoff for lightweight per-stream accrual and remaining-funds charts. This is not a Next.js, D3, or chart-library implementation request.

## Deliverables

- `chart-sparkline-kit.pdf` - stakeholder/design review export.
- `chart-sparkline-kit-overview.png` - chart and mobile sparkline visual preview.
- `chart-sparkline-kit-states-a11y.png` - edge states, table fallback, and deferred frame preview.
- `chart-style-spec.md` - Figma component and annotation spec.
- `build_chart_kit.py` - local exporter for the PDF/PNG preview and QA report.
- `quality-report.json` - export and quick contrast self-check.

## Product Decision

This kit assumes Stream detail may show a simple balance burn-down or sparkline only if product supports remaining-funds or time-to-empty in v1. If product defers this from MVP, use the included "Deferred for MVP" frame and keep the spec as a future-ready reference.

## Handoff Target

Parent Figma area: Stream detail.

Suggested Figma frame names:

- `ChartKit / RemainingFunds / Desktop`
- `ChartKit / RemainingFunds / Mobile`
- `ChartKit / Sparkline / Row`
- `ChartKit / TableFallback`
- `ChartKit / DeferredFrame`

## Review Notes

- Max three pale line colors, with dash patterns so color is not the only distinction.
- No 3D, candlesticks, dense trading controls, or price chart metaphors.
- Empty, loading, error, success, and 1-point data states are documented.
- Stellar price is not in v1; mark as v2 TBD if product requests it.
- Soroban/Horizon/chain pending inclusion can appear as an annotated bar, but copy must stay non-committal.

## Validation

Run:

```powershell
& 'C:\Users\hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' design/chart-sparkline-kit/build_chart_kit.py
```

The script writes the PDF, preview PNGs, and `quality-report.json`.
