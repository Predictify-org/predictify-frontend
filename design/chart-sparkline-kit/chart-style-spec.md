# Chart Style Spec

## Intent

The chart is a small confidence aid on Stream detail, not a trading surface. It should answer one of two user questions:

- How quickly are remaining funds being consumed?
- When might this stream need attention if the current rate continues?

If product cannot support these values reliably in v1, use the deferred frame instead of showing projected depletion.

## Visual Tokens

Use a pale palette with no more than three series colors:

| Token | Hex | Use | Pattern |
| --- | --- | --- | --- |
| `chart-accrual-line` | `#7DD3FC` | Accrued or projected accrual | Solid |
| `chart-remaining-line` | `#86EFAC` | Remaining funds | Dashed `6 / 6` |
| `chart-threshold-line` | `#FDE68A` | Warning threshold or minimum reserve guide | Dotted `2 / 6` |

Core geometry:

- Line thickness: 3 px desktop, 2 px mobile.
- Sparkline thickness: 2 px.
- Axis rule: 1 px `#334155` on dark surface or `#CBD5E1` on light annotation frames.
- Gridlines: optional, max 3 horizontal rules, 1 px at 24 percent opacity.
- Points: hidden by default; show the latest point only when it adds meaning.
- No 3D, glow, gradient area fill, candlestick, crosshair, or dense trading controls.

## Labels And Copy

Preferred chart title:

`Remaining funds over time`

Preferred helper copy:

`Estimate updates when StreamPay refreshes wallet and chain-observed activity.`

Use non-committal time-to-empty copy:

- Good: `At current rate, funds may need review around Jun 18.`
- Avoid: `Funds will run out on Jun 18.`
- Avoid: `Guaranteed until Jun 18.`

## States

| State | Design behavior |
| --- | --- |
| Empty | Show an empty axis and message: `Not enough stream activity to chart yet.` |
| Loading | Use a skeleton line that matches chart bounds; no layout shift. |
| Error | Replace chart body with retry affordance and non-raw error copy. |
| Success | Show line, latest value, and time-to-empty annotation only when supported. |
| 1-point data | Show one labelled point plus fallback table; do not draw a misleading trend. |
| Deferred | Use `Deferred for MVP` frame with rationale and owner/date placeholder. |

## Pending Inclusion Annotation

If product supports chain-state visibility, show a quiet horizontal bar below the chart:

`Pending chain inclusion`

Do not promise timing or finality. The annotation may reference Horizon or Soroban only as a data-source note after engineering signs off.

## Mobile

Mobile Stream detail should not become a full charting view.

- Prefer a sparkline plus latest value and one helper sentence.
- If the full chart is required, use horizontal scroll inside the chart frame.
- Axis labels can shrink to first, current, and projected review date only.
- Keep tap targets at least 44 x 44 px for expand, retry, and table toggle controls.

## Accessibility

Figma must include a table fallback annotation next to every chart component:

| Date | Remaining funds | Accrued | Status |
| --- | ---: | ---: | --- |
| May 01 | 1,200 XLM | 0 XLM | Active |
| May 15 | 640 XLM | 560 XLM | Active |
| Jun 01 | 120 XLM | 1,080 XLM | Review soon |

Implementation note for later frontend tickets:

- Expose chart data through a semantic table or `aria-describedby` summary.
- Do not use color alone; pair line color with dash pattern and legend labels.
- Keyboard focus is required for expand/table toggle controls, not individual decorative line segments.
- Reduced-motion variant: no animated draw-on line by default.

## Figma Redlines

- Desktop chart frame: 640 x 280 px inside Stream detail card.
- Mobile sparkline frame: 320 x 96 px.
- Legend minimum gap: 12 px.
- Legend item: line sample 32 px wide plus text label.
- Chart card padding: 24 px desktop, 16 px mobile.
- Axis label text: 12-14 px minimum; no label below 12 px.

## Product TBD

- Is time-to-empty in v1 or deferred?
- Which source owns remaining-funds values: local schedule math, Horizon-observed activity, Soroban contract read, or a backend aggregate?
- Is Stellar price conversion out of v1? This spec assumes yes; mark v2 TBD if requested.
