# StreamPay x Stellar — Logo, Wordmark, and Header Co-branding (Figma Handoff)

**Issue:** #65 Figma: StreamPay logo, wordmark, and header on Stellar (clear space and co-branding rules)

## Source of truth (Figma)

- **Team index (single source of truth):** [ADD LINK]
- **Home hero file:** [ADD LINK]
- **App shell / navigation file:** [ADD LINK]
- **PDF export for non-Figma stakeholders:** [ADD LINK]

## Scope

- UI/UX and product design documentation for StreamPay wordmark, logo lockups, and header application.
- **No frontend implementation** in this repository for this issue.

## Header application (app shell)

### Breakpoints to document

- **Mobile:** 360px
- **Desktop:** 1280px

### Required header elements (annotate in Figma)

- Primary navigation
- Wallet chip (connected/disconnected states)
- StreamPay wordmark / logo placement
- Optional Stellar co-branding placement
- Optional “beta” callout (if required by brand/legal)

### Theme surfaces

- **Light surface** header (required)
- **Dark surface** header (optional; include if the product supports dark theme)

## Logo / wordmark rules

### Logo lockups to define

- StreamPay wordmark alone
- StreamPay wordmark + logo mark (if used)
- StreamPay + Stellar co-branding lockup (primary)

### Clear space

Document clear space in Figma using an explicit unit derived from the mark (choose one and keep consistent):

- **Option A:** `x = height of the “S” in StreamPay`
- **Option B:** `x = cap height of wordmark`

Then set minimum padding around the logo/lockup:

- **Minimum clear space:** `>= 1x` on all sides

### Minimum size

Document minimum sizes for:

- Wordmark height (px) for 360px header
- Wordmark height (px) for 1280px header
- Co-branding lockup minimum width/height

### Do / don’t

Include a dedicated frame in Figma:

- Do not stretch (non-uniform scaling)
- Do not rotate or skew
- Do not add shadows/glows not specified
- Do not change wordmark letter spacing
- Do not place on insufficient-contrast backgrounds

## Accessibility (WCAG)

### Contrast requirements

- All text and iconography in the header must meet **WCAG AA**:
  - Normal text: **4.5:1**
  - Large text (18pt+ or 14pt bold+): **3:1**

### Focus and keyboard

- Document focus states for header interactive elements (nav items, wallet chip).
- Confirm visible focus meets AA expectations on both light/dark surfaces.

### Phase 2 gaps

If any contrast/focus requirements cannot be met due to brand constraints:

- Document as “Phase 2” gaps in Figma with rationale.

## Exports (handoff)

### Asset formats

- **SVG:** preferred for logo/wordmark/lockups
- **PNG:** fallback for environments that require raster

### Export naming

Use a predictable naming scheme in Figma exports:

- `streampay-wordmark.svg`
- `streampay-lockup.svg`
- `streampay-stellar-cobrand-lockup.svg`
- `streampay-favicon-32.png` (if applicable)

### Favicon / PWA (optional)

If the product ships a favicon and PWA icons, document sizes/frames:

- Favicon: 16x16, 32x32, 48x48
- Apple touch icon: 180x180
- PWA icons: 192x192, 512x512

## Legal / brand open questions (track in Figma cover)

Add a cover note in Figma listing open items for brand/legal:

- Whether “Built on Stellar” vs “Stellar” co-branding is required/preferred
- Whether “beta” label is required and exact capitalization
- Whether StreamPay or Stellar marks require ®/™ usage in-app
- Any minimum prominence requirements for Stellar attribution

## Review

- One round of feedback with brand owner
- Design crit: at least one product + one engineering stakeholder
- Link review notes in the Figma file (or in a short doc linked from the file)
