# Error Recovery Pages Spec

## Intent

These frames help users recover from dead links and temporary service disruptions without panic, blame, or overly technical blockchain language. The UI should feel steady and trustworthy because the product handles money-adjacent actions.

## Included Frames

| Frame | Use when | Message posture | Primary action | Secondary action |
| --- | --- | --- | --- | --- |
| `404` | A link is bad, outdated, or no longer available | `You may have a bad link` | `Go to home` | `Contact support` |
| `5xx` | StreamPay is failing on our side | `We're fixing it` | `Try again` | `Visit status page` |
| `Stellar service unavailable` | Horizon, Soroban, RPC, or network dependency is temporarily unavailable | `The network service is temporarily unavailable, your funds are not gone` | `Try again` | `Contact support` |
| `Mobile outage variant` | Small-screen adaptation of the Stellar service outage frame | Same as desktop outage | `Try again` | `Status page` |

## Tone and Copy Principles

Use:

- Calm, short headings.
- Practical next steps.
- Reassurance without guarantees.
- Plain language before product or chain terms.

Avoid:

- `Oops`, `you broke it`, `invalid user`, or other shaming language.
- Technical blame copy such as `Horizon RPC timeout` or `Soroban simulation failed`.
- Guarantees about instant recovery or absolute custody outcomes.
- Instructions that imply users should troubleshoot the chain themselves.

## Recommended Copy

### 404

Heading:

`This page could not be found`

Body:

`The link may be old, incomplete, or no longer available. You can head back to StreamPay home and keep working from there.`

Primary:

`Go to home`

Secondary:

`Contact support`

Supporting note:

`If you followed a link from an email or shared document, ask for a fresh link.`

### 5xx

Heading:

`Something went wrong on our side`

Body:

`StreamPay is having trouble loading this page right now. Our team is already looking into it.`

Primary:

`Try again`

Secondary:

`Visit status page`

Support note:

`If this keeps happening, support can help with the page you were trying to reach.`

### Stellar or Horizon service unavailable

Heading:

`Stellar service is temporarily unavailable`

Body:

`StreamPay cannot reach part of the Stellar service right now. Your funds are not gone. Recent activity may take longer to refresh until the service is back.`

Primary:

`Try again`

Secondary:

`Contact support`

Optional helper link or note:

`You can also check the status page for live updates.`

### Mobile variant note

Keep the same copy but shorten the body to:

`We cannot refresh part of the Stellar service right now. Your funds are not gone, and recent activity may take longer to update.`

## Visual Direction

### Shared structure

- Skip link at top: `Skip to StreamPay home`.
- Brand header with lightweight StreamPay identity.
- One centered recovery panel with icon, heading, body, actions, and short helper note.
- Small side or lower panel for lifecycle reassurance where relevant.
- Dark recovery surface on a softer atmospheric background to keep emotional temperature low.

### Distinguishing signals

- `404`: neutral illustration treatment, dashed path, broken-link metaphor, lighter emphasis. This should feel like navigation drift, not system danger.
- `5xx`: warm warning accent and visible `we're fixing it` posture. This should feel owned by StreamPay.
- `Stellar outage`: network constellation or orbit motif with a service pulse badge. This should feel external, temporary, and reassuring about funds.

## Accessibility Annotations

### Focus order

1. Skip link: `Skip to StreamPay home`
2. Brand link: `StreamPay`
3. Main heading
4. Primary action
5. Secondary action
6. Helper support/status link if present

### Keyboard and screen reader notes

- Page should expose one `main` region with the heading as the first content landmark.
- Skip link becomes visible on focus.
- Focus indicator must be distinct on both dark and light surfaces.
- Button and link labels must stand on their own outside visual context.
- Error icons are decorative support, not the only message carrier.

### WCAG self-check target

- Body text contrast: minimum `4.5:1`.
- Large heading contrast: minimum `3:1`, but target `4.5:1` anyway.
- Stressed-state buttons and status pills must preserve contrast.
- No motion is required for v1 frames; if motion is added in prototype, offer reduced-motion alternative.

## What Not To Show

- Stack traces.
- Internal hostnames or cluster names.
- Raw Horizon, Soroban, JSON-RPC, or database error strings.
- User wallet public key unless already necessary in surrounding UI.
- Blame-oriented phrases such as `invalid request`, `bad user input`, or `you did something wrong`.
- Promises like `funds are safe forever` or `nothing can be lost`.

## Stream Lifecycle References

Reference the lifecycle in a compact support strip or annotation:

- `Draft`
- `Active`
- `Paused`
- `Ended`

Purpose:

- Remind implementers that these error pages should fit the rest of the StreamPay journey.
- Support future docs that cover empty, loading, error, and success across the lifecycle.

## Component and Redline Notes

### Recovery panel

- Desktop width: `560 px`.
- Desktop padding: `32 px`.
- Mobile width: `100%` inside `24 px` page gutters.
- Radius: `28 px`.
- Primary button height: `52 px`.
- Secondary button height: `52 px`.
- Minimum tap target: `44 x 44 px`.

### Typography

- Hero heading: `48 px` desktop, `34 px` mobile, bold.
- Body: `18 px` desktop, `16 px` mobile.
- Label/meta text: `14 px`.

### Color tokens in export

- `Ink`: `#0F172A`
- `Paper`: `#FFFFFF`
- `App panel`: `#0B1220`
- `App panel soft`: `#111C33`
- `Muted`: `#5B6475`
- `Line`: `#CBD5E1`
- `Primary green`: `#22C55E`
- `404 accent`: `#7C8BFF`
- `5xx accent`: `#F59E0B`
- `Stellar accent`: `#2DD4BF`
- `Danger text reserve`: `#B91C1C`

## Design Crit Agenda

- Verify that `404` reads as navigation/pathing and not a service incident.
- Verify that `5xx` clearly signals StreamPay ownership and active recovery.
- Verify that the Stellar/Horizon frame reassures users about funds without making legal or technical guarantees.
- Confirm support and status-page destinations.
- Confirm whether mobile frame is needed in the first stakeholder review.

## Phase 2 Gaps

- Final production copy after product/legal review of funds reassurance language.
- Real status-page URL and support destination.
- Interactive prototype review for keyboard behavior and skip-link visibility.
- Final component token mapping into the frontend design system.

## Handoff Notes

- This issue remains design-only; frontend implementation is deferred.
- Export all frames with names matching the deliverables list.
- Keep implementation linkage in Figma via a dedicated `Implementation` placeholder frame or note.
