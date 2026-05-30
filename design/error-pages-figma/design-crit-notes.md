# Design Crit Notes

## Review Goal

Approve a stakeholder-ready v1 for three static error-recovery pages that balance trust, clarity, and calm recovery.

## Required Reviewers

- Product stakeholder: pending
- Engineering stakeholder: pending

## Current Decisions In This Pack

- `404` is framed as a likely bad or expired link, not a system failure.
- `5xx` is framed as a StreamPay-side issue with clear ownership.
- Stellar/Horizon/Soroban outages are framed as temporary service disruptions with reassurance that funds are not gone.
- Each frame uses one primary action and one secondary action.
- The exports include a mobile outage adaptation because outage recovery is likely to happen on the go.

## Crit Questions

1. Does each frame make the source of the problem clear without relying on technical language?
2. Is the funds reassurance line calm enough for fintech use without over-promising?
3. Should the secondary action be `Contact support` or `Visit status page` by default on the outage frame?
4. Are we comfortable shipping a skip-link note and focus order annotation as part of the design handoff?
5. Do the visual distinctions between `404`, `5xx`, and network outage feel obvious in under five seconds?

## Copy Revision Watchouts

- Avoid hard promises like `your funds are safe`.
- Avoid chain-specific jargon in headings.
- Avoid apology loops that sound uncertain or panicked.
- Keep status-page and support actions mutually useful rather than redundant.

## Dependencies To Confirm Early

- Brand approval for atmospheric background and accent palette.
- Product/legal review of the phrase `Your funds are not gone`.
- Support channel destination and SLA expectations.
- Status page URL and whether it is public.

## Design Review Log

### Round 1

- Status: not yet conducted in-repo.
- Planned participants: one PM, one engineer.
- Prep materials: `error-pages-figma.pdf`, `error-pages-spec.md`, export PNGs.

### Revision Notes Placeholder

- Pending stakeholder review.
