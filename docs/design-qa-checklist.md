# StreamPay Design QA Checklist
**Version:** 1.0  
**Scope:** Streams and money screens (Streams list, Stream detail, Settle, Withdraw, Stop, Pause, Activity)  
**Usage:** Run before any stream or money screen moves from design → dev handoff. Link this doc from every major Figma file cover page.  
**Format:** Yes / No / N/A — annotate any No with a rationale and phase-2 ticket reference.

---

## How to use

1. Duplicate this checklist into the Figma file's cover page (as a linked Notion doc or embedded text frame).
2. Assign one designer as DRI per screen.
3. Mark each item **Yes**, **No**, or **N/A**.
4. Any **No** must include a short note and a follow-up ticket number before handoff is approved.
5. Pilot run: complete this checklist on the **Streams list** or **Settle** screen first; adjust wording; re-export; announce in #design.

---

## Section 1 — Accessibility (a11y) · 8 items

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 1 | All text meets WCAG AA contrast (4.5:1 body, 3:1 large text / UI components). Checked with a contrast tool (e.g. Figma A11y Annotation Kit, Stark, or Colour Contrast Analyser). | | |
| 2 | Every interactive element (button, link, input, badge) has a visible focus ring designed and annotated — not just browser default. | | |
| 3 | Colour is never the sole means of conveying status. Each `StatusBadge` (draft / active / paused / ended) uses both colour **and** a text label. | | |
| 4 | Touch / click targets are ≥ 44 × 44 px for all interactive controls (stream row actions, modal close, CTA buttons). | | |
| 5 | Reading and focus order is annotated in Figma dev mode for every screen — matches the intended DOM / tab order. | | |
| 6 | All icons used without adjacent visible text have an `aria-label` annotation (e.g. close button on `Modal`, status icons). | | |
| 7 | Motion / animation: reduced-motion variant is noted for any entrance/exit animation (e.g. `Modal` scale-in / fade-in). | | |
| 8 | Any phase-2 a11y gaps (e.g. live-region announcements for stream status changes) are documented with rationale and ticket reference. | | |

---

## Section 2 — Irreversible Money Actions · 6 items

> Applies to: **Settle**, **Withdraw**, **Stop** — and any future Soroban/escrow release action.  
> These actions cannot be undone on-chain. Design must make that unmistakably clear.

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 9 | A confirmation step (modal or inline) is designed for every irreversible action (Settle, Withdraw, Stop). The confirmation copy names the action and the amount/recipient explicitly. | | |
| 10 | Destructive / irreversible actions use a visually distinct treatment (e.g. red/warning colour, separate button style) — not the same style as reversible actions (Pause, Start). | | |
| 11 | The confirmation modal for Settle / Withdraw / Stop includes a plain-language warning: "This action cannot be undone." Copy is reviewed and approved by product. | | |
| 12 | Amount and recipient are shown in the confirmation step — user can verify before submitting (no hidden values). | | |
| 13 | Loading / pending state is designed for the post-confirmation submit (on-chain tx in flight): button disabled, spinner or skeleton shown, copy updated (e.g. "Settling…"). | | |
| 14 | Success and error outcomes are both designed for every irreversible action — not just the happy path. Error copy is non-committal about chain state where Horizon/Soroban API is not yet final (see Section 6). | | |

---

## Section 3 — All Interactive States · 5 items

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 15 | Every button has all five states designed: default, hover, focus, active/pressed, disabled. | | |
| 16 | Every form input (if present) has: default, focus, filled, error, and disabled states. | | |
| 17 | Stream row (`StreamRow`) next-action button states are shown for each stream status: draft → Start, active → Pause, paused → Start, ended → Withdraw. | | |
| 18 | `Modal` open and close animations are annotated; backdrop click-to-dismiss behaviour is documented. | | |
| 19 | Skeleton loading state (`StreamListSkeleton`) matches the populated layout — same row count, same column widths — so there is no layout shift on load. | | |

---

## Section 4 — 8px Grid and Spacing · 3 items

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 20 | All spacing values (padding, margin, gap) are multiples of 8px (or 4px for fine-grained adjustments). Verified with Figma's layout grid overlay. | | |
| 21 | Component internal padding follows the 8px grid: `StreamRow` (20px → 24px), `Modal` (24px), `Card` (20px). Deviations are intentional and annotated. | | |
| 22 | Responsive breakpoints are defined and annotated: at minimum mobile (≤ 640px), tablet (641–1024px), desktop (> 1024px). Grid columns collapse correctly. | | |

---

## Section 5 — Empty / Loading / Error States · 3 items

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 23 | Every list or data screen has three states designed: **empty** (`EmptyState` with eyebrow, title, description, and at least one CTA), **loading** (skeleton), **populated**. | | |
| 24 | Error state is designed for every screen that makes a network or chain call — includes a human-readable message, an optional retry CTA, and does not expose raw error codes to the user. | | |
| 25 | `EmptyState` copy is contextual per screen (Streams empty ≠ Activity empty) and reviewed by product/content. | | |

---

## Section 6 — Figma Dev Mode and Component Naming · 3 items

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 26 | Component names in Figma match agreed code names: `StreamRow`, `StatusBadge`, `Modal`, `EmptyState`, `Card`, `Skeleton`. No orphan or renamed variants without a code counterpart. | | |
| 27 | All exported assets are named, sliced, and listed in the handoff note (SVG icons, illustration assets). No orphan screens without a named export. | | |
| 28 | Redlines and component specs are attached or linked in Figma dev mode for every new or changed component before the dev ticket is opened. | | |

---

## Section 7 — Stellar / Soroban / Horizon / Escrow Annotations · 4 items

> These items apply where product scope includes on-chain actions. Mark N/A for pure UI screens with no chain interaction.

| # | Item | Yes / No / N/A | Notes |
|---|------|----------------|-------|
| 29 | Any copy referencing Soroban contract state, escrow release, or Horizon transaction status is annotated as **"pending API finalisation"** until the API contract is signed off. Copy must stay non-committal (e.g. "Funds may take a moment to appear" not "Funds will appear in 5 seconds"). | | |
| 30 | Stream lifecycle labels (draft → active → paused → ended) match the agreed `StreamStatus` type in code. Any new status introduced in design has a corresponding code ticket. | | |
| 31 | Vesting or escrow-specific screens (if in scope) annotate which values come from Soroban contract reads vs. Horizon ledger vs. local state — so engineers know the data source for each field. | | |
| 32 | On-chain transaction hash or ledger reference (if surfaced in UI) is truncated with a copy/expand affordance designed — not shown as a raw full-length string. | | |

---

## Sign-off

| Role | Name | Date | Signature / Figma comment link |
|------|------|------|-------------------------------|
| Designer (DRI) | | | |
| Product | | | |
| Engineer | | | |

**Checklist status:** ☐ In progress · ☐ Passed · ☐ Passed with phase-2 items  
**Live checklist link:** _(paste Figma / Notion URL here)_  
**Screenshot:** _(attach one screenshot of the piloted screen with checklist complete)_

---

## Pilot log

| Screen | Designer | Engineer | Date | Outcome |
|--------|----------|----------|------|---------|
| Streams list | | | | |
| Settle modal | | | | |

---

## Out of scope for this checklist

- Next.js / React implementation (tracked as separate frontend issues)
- Jest / RTL tests
- Usability testing sessions (attach a separate one-page script if in scope for a given sprint)

---

*Commit convention for design artifacts: `design(figma): design QA checklist for Stellar/StreamPay money and stream screens`*
