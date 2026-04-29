# Hero CTA A/B Variant Spec

## Intent

Test whether the primary CTA label on the StreamPay home hero affects wallet-connect completion. Three artboards share the same layout; only the CTA label differs. This is design prep only — no PostHog/GA4 instrumentation in this issue.

## Source of truth (Figma)

- **Hero CTA variants file:** [ADD LINK]
- **Home hero base layout:** [ADD LINK]
- **Brand lockup reference (issue #65):** [ADD LINK]
- **PDF export for non-Figma stakeholders:** [ADD LINK]

## Scope

- UI/UX and product design documentation for hero CTA label variants.
- **No frontend implementation** in this repository for this issue.
- **No feature-flag PR or analytics instrumentation** in this issue.

---

## Variant definitions

All three artboards use the identical hero layout:

- Eyebrow: `Payment streaming on Stellar`
- Heading: `Manage payment streams with clear, consistent actions.`
- Body: `Connect your wallet to start, pause, stop, settle, and withdraw from streams with confidence.`
- Secondary CTA (unchanged across variants): `View Stream Actions` (outline button, `#stream-actions`)

Only the **primary CTA label** changes:

| Variant | Primary CTA label | Hypothesis | Tone rationale |
|---------|-------------------|------------|----------------|
| **A** | `Connect Stellar wallet` | Naming the network upfront signals trust and specificity for Stellar-native users; may reduce ambiguity vs generic wallet language. | Explicit, chain-aware. Calm and precise — matches StreamPay fintech tone. |
| **B** | `Link wallet` | Shorter, lower-friction verb ("link" vs "connect") may feel lighter and increase tap-through for users unfamiliar with Stellar terminology. | Approachable, minimal jargon. Risk: may under-signal the on-chain nature of the action. |
| **C** | `Get started` | Broadest funnel entry; neutral language may attract users who are unsure what "wallet" means yet. | Onboarding-oriented. Risk: vague about what happens next — user may expect a tour, not a wallet connection. |

### Default recommendation for v1

**Variant A (`Connect Stellar wallet`)** is the recommended default for v1 shipping without an active experiment, based on:

1. **Fintech trust:** Money-adjacent CTAs should be specific about what the user is about to do. "Connect Stellar wallet" names the network and the action.
2. **Chain-aware tone:** StreamPay operates on Stellar; surfacing the network name in the primary CTA aligns with the product identity.
3. **Non-committal:** Does not promise "instant" settlement or imply funds move automatically — consistent with copy guardrails.

If PM and growth decide to run an A/B test later, Variant B is the strongest challenger (shorter label, lower jargon).

---

## A/B test design (for future experiment issue)

### Primary metric

- **Connect completion rate:** percentage of users who successfully complete the wallet-connect flow after clicking the primary CTA.

### Secondary metrics

- Time from page load to CTA click.
- Drop-off rate between CTA click and wallet-connect completion.
- Streams created within 7 days of first connect (downstream activation).

### Sample size

- Estimated **1,200 unique visitors per variant** (3,600 total) for a 95% CI on a ±3 pp difference in connect completion, assuming a baseline of ~12% connect rate.
- Adjust after first week of data; consult growth/data team.

### Ethics and PII

- **No PII in success metrics.** Connect completion, click-through, and downstream activation are all aggregate behavioral metrics.
- Wallet addresses are not logged as experiment dimensions.
- Variant assignment must be random and not based on user identity.

### Non-goals

- This experiment does not measure trust, sentiment, or brand perception.
- This experiment does not validate the secondary CTA.
- This experiment does not launch PostHog/GA4 — that is a separate infrastructure issue.

---

## Figma artboard structure

### Layout (identical across all 3 artboards)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              PAYMENT STREAMING ON STELLAR                 │  ← Eyebrow (uppercase, accent color)
│                                                          │
│     Manage payment streams with clear,                   │  ← Heading (clamp 2rem–3.5rem)
│     consistent actions.                                  │
│                                                          │
│     Connect your wallet to start, pause, stop,           │  ← Body (muted-light)
│     settle, and withdraw from streams with confidence.   │
│                                                          │
│     [PRIMARY CTA]    [View Stream Actions]               │  ← CTA pair (pill buttons)
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Artboard naming in Figma

- `Hero / Variant A — Connect Stellar wallet`
- `Hero / Variant B — Link wallet`
- `Hero / Variant C — Get started`

### Annotation frame

Each artboard includes an annotation frame (off to the right) with:

1. **Variant label** (A / B / C)
2. **CTA copy** (exact label text)
3. **Hypothesis** (one-line)
4. **Primary metric** (connect completion rate)
5. **Non-goals** (does not measure trust/sentiment; does not validate secondary CTA; does not launch analytics)
6. **Sample size** (1,200 per variant)
7. **Ethics note** (no PII; aggregate only)
8. **A11y note** (single unambiguous primary action per variant)

---

## Design system tokens (reference)

These tokens are already defined in `globals.css`. Use them in Figma for visual consistency:

| Element | Token | Value |
|---------|-------|-------|
| Background | `--background` | `#0a0a0f` |
| Foreground | `--foreground` | `#e4e4e7` |
| Accent (CTA fill) | `--accent` | `#22c55e` |
| Accent hover | `--accent-hover` | `#16a34a` |
| CTA text | explicit | `#03150a` |
| Muted body | `--muted-light` | `#a1a1aa` |
| Border (secondary CTA) | `--border` | `#27272a` |
| Button radius | `--radius-full` | `9999px` |
| Touch target min | `--touch-target` | `44px` |
| Focus ring | `--accent` | `2px solid #22c55e, offset 2px` |

### Typography

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Eyebrow | `0.875rem` | 600 | `letter-spacing: 0.08em`, uppercase |
| Heading | `clamp(2rem, 5vw, 3.5rem)` | 700 | `line-height: 1.05`, `max-width: 14ch` |
| Body | `1.05rem` | 400 | `line-height: 1.6`, `max-width: 42rem` |
| Primary CTA | `inherit` | 700 | `padding: 0.875rem 1.25rem` |
| Secondary CTA | `inherit` | 600 | `padding: 0.875rem 1.25rem` |

---

## Accessibility (WCAG)

### Contrast

- Primary CTA: `#03150a` on `#22c55e` — **9.4:1** (passes AAA)
- Secondary CTA: `#e4e4e7` on `#0a0a0f` with `#27272a` border — **13.5:1** (passes AAA)
- Eyebrow: `#22c55e` on `#0a0a0f` — **6.7:1** (passes AA)
- Body: `#a1a1aa` on `#0a0a0f` — **6.9:1** (passes AA)

### Focus and keyboard

- Primary CTA must show a visible focus ring (`2px solid #22c55e`, offset 2px).
- Tab order: primary CTA → secondary CTA → stream actions section.
- Each CTA is a single unambiguous interactive element — no dual-purpose buttons.

### Touch target

- Both CTAs have `min-height: 2.75rem` (44px) and `padding: 0.875rem 1.25rem`.
- Meets WCAG 2.5.5 (target size minimum).

### Phase 2 gaps

- **Reduced-motion:** CTA hover transition (160ms ease) should be respected by `prefers-reduced-motion`. Annotate in Figma.
- **High-contrast mode:** Verify primary CTA fills and border visibility in Windows High Contrast. Document result.

---

## Copy guardrails

### Use

- `Connect Stellar wallet` — specific, chain-aware, fintech-appropriate.
- `Link wallet` — short, low-jargon alternative.
- `Get started` — broadest, onboarding-oriented.
- `View Stream Actions` — unchanged secondary CTA across all variants.

### Avoid (in CTAs and hero copy)

- `Instant settlement` / `Instant connect` — on-chain actions are not instant.
- `Safe` / `Secure` / `Guaranteed` — do not make trust claims in CTAs.
- `Start streaming now` — implies immediacy that may not hold for Soroban/escrow flows.
- Any promise about Soroban or escrow behavior before API sign-off.
- PII-adjacent language ("Sign up", "Register", "Create account") — StreamPay uses wallet connect, not accounts.

### Soroban / on-chain TBD

- Do not reference Soroban, Horizon, or specific chain terminology in CTA labels until product/legal approve naming.
- The word "Stellar" in Variant A is pre-approved (matches eyebrow and metadata).
- If "Stellar" is replaced with "Soroban" or another chain name, re-run copy review with brand/legal.

---

## Stream lifecycle context

The hero CTA is the entry point into StreamPay's stream lifecycle. After wallet connect, the user enters the stream management flow:

```
Wallet connect → Draft stream → Active stream → Paused stream → Ended stream
                                      ↘              ↗
                                       Settlement → Withdrawal
```

Each lifecycle stage maps to a `StatusBadge` (draft / active / paused / ended) and a corresponding action (`Start` / `Pause` / `Start` / `Withdraw`). The hero CTA should set the tone that users are managing real on-chain streams — not just viewing a dashboard.

This context must be annotated on a reference frame in the Figma file (not repeated per variant) so reviewers understand what "Connect Stellar wallet" leads into.

---

## States to document in Figma

For each variant, document all CTA states:

| State | Primary CTA | Secondary CTA |
|-------|-------------|---------------|
| Default | Green fill, dark text | Transparent, border |
| Hover | `--accent-hover` fill | Border brightens |
| Focus | Focus ring visible | Focus ring visible |
| Active / pressed | Slightly darker fill | Slightly darker border |
| Disabled | `--stream-disabled-*` tokens | `--stream-disabled-*` tokens |
| Loading | Spinner replaces label; button disabled | N/A |

Also document:

- **Empty state:** Hero with no wallet connected (default state).
- **Connected state:** Hero after wallet connect — CTA changes to "View streams" or is hidden (separate issue).
- **Error state:** Wallet connect failed — CTA shows retry affordance.
- **Loading state:** Wallet connect in progress — CTA shows spinner, label changes to "Connecting…".

---

## Responsive breakpoints

| Breakpoint | Layout change |
|------------|---------------|
| Mobile (≤ 640px) | CTA pair stacks vertically; heading scales to `clamp(2rem, 5vw, 3.5rem)` lower bound |
| Tablet (641–1024px) | CTA pair side-by-side; standard hero layout |
| Desktop (> 1024px) | Same as tablet; max-width 48rem hero content |

---

## Handoff exports

### Named export assets

| Asset name | Format | Notes |
|------------|--------|-------|
| `hero-variant-a-connect-stellar-wallet` | PNG (2x) | Primary CTA label: "Connect Stellar wallet" |
| `hero-variant-b-link-wallet` | PNG (2x) | Primary CTA label: "Link wallet" |
| `hero-variant-c-get-started` | PNG (2x) | Primary CTA label: "Get started" |
| `hero-cta-button-primary` | SVG | Primary button component (label as text node) |
| `hero-cta-button-secondary` | SVG | Secondary button component |
| `hero-cta-annotations` | PNG | Annotation frame with hypotheses and metrics |

### Redlines

- CTA pair gap: `0.75rem` (12px)
- CTA pair alignment: centered, `flex-wrap: wrap`
- Hero content max-width: `48rem`
- Hero text alignment: center

### Component specs

- Primary CTA: `button.button--primary` — full-radius pill, `#22c55e` fill, `#03150a` text, `font-weight: 700`
- Secondary CTA: `button.button--secondary` — full-radius pill, transparent, `#27272a` border, `#e4e4e7` text, `font-weight: 600`
- Both: `min-height: 44px`, `padding: 0.875rem 1.25rem`

---

## Review checklist

- [ ] Design crit with at least one product + one engineering stakeholder
- [ ] Link review notes in Figma file or short doc
- [ ] WCAG self-check: contrast + focus/keyboard verified
- [ ] Phase 2 gaps documented with rationale
- [ ] Named export assets listed; no orphan screens
- [ ] Copy reviewed against guardrails (no "instant", no PII)
- [ ] Soroban/chain naming TBD flagged for brand/legal
- [ ] Hypothesis, primary metric, and non-goals annotation present on each artboard
- [ ] Stream lifecycle reference frame included in Figma file
- [ ] Usability testing scope confirmed (in scope or explicitly deferred)

---

## Usability testing

**Status:** Not in scope for this issue. The hero CTA variant test is a label-level A/B test, not a flow-level usability study. If usability testing is requested for the hero or wallet-connect flow, attach:

- One-page task script (e.g. "You've heard about StreamPay from a colleague. Go to the site and set up your first stream.")
- Session count: minimum **5 participants** for qualitative findings; **12+** for statistical significance on task-completion metrics.
- Key findings template: task success rate, time on task, error count, and one open-response theme per participant.

Track usability testing as a separate issue; do not block CTA variant handoff on it.

---

## Product TBD

- Whether A/B experiment runs immediately or variant A ships as default.
- Whether "Stellar" remains in the CTA if Soroban branding supersedes.
- Exact wallet-connect flow copy (separate from hero CTA).
- Whether connected-state hero CTA changes (tracked separately).
- Whether error/retry states are in v1 scope for the hero.

---

## Closeout template

```
Figma link: [URL]

Recommended default for v1: Variant [A/B/C]

Why: [2-line rationale tying back to fintech trust, Stellar tone, and copy guardrails]

Example: "Variant A (Connect Stellar wallet). Naming the network in the CTA
is specific and trustworthy for money-adjacent actions. It avoids vague
funnel language and does not promise instant settlement."
```

---

## Timeline

- **96 hours** to review-ready Figma v1.
- Escalate brand/legal dependencies early (Soroban naming, "Stellar" usage in CTA).
- Hand off to growth or PM for future experiment issue.

---

*Commit convention: `design(figma): hero CTA variants and A/B hypothesis (Stellar connect, design-only)`*
