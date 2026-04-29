WCAG Self-Check — Streams list search & filters (v1)

Scope
- Review current mockups and design notes for WCAG AA compliance focusing on color contrast, keyboard focus, ARIA, and touch target sizes.
- Purpose: surface immediate issues and list phase-2 items requiring token or design changes.

Checklist & Findings

1) Color contrast (AA)
- Body text on white: `#111827` on `#ffffff` — likely passes AA/AAA for normal and large text. (Recommend automated check)
- Secondary text `#6b7280` on `#f3f4f6` — needs verification. Risk: may be near AA threshold for 14px. Action: verify with a contrast tool; consider darkening to meet 4.5:1.
- Chip active colors (`#0ea5a4`, `#f97316`) on white — check contrast of chip label text; if white text is used on colored chip, ensure 4.5:1.
- Disabled/placeholder text `#6b7280` on light backgrounds — likely borderline; verify and adjust tokens if needed.

Action items:
- Run automated contrast checks against all text/background combinations in Figma (or using axe/contrast-checker).
- If any token fails, propose adjusted token values in Figma and mark as Phase 2 if brand approval required.

2) Keyboard & focus
- Search combobox: ensure visible focus ring on input and when listbox opens. Action: document focus styles in Figma (outline, 2px, high-contrast color).
- Sort dropdown and chips: ensure focusable via Tab; show clear focus indication and `:focus-visible` states.
- Live region: when filters applied, update a polite `aria-live` region with "Showing N streams". Action: document required JS behavior for engineering.

3) ARIA & semantics
- Combobox: use `role="combobox"`, `aria-controls` to listbox id, `aria-expanded`, keyboard behavior per WAI-ARIA APG.
- Listbox: `role="listbox"`, items `role="option"` with `aria-selected`.
- Chips: `role="button"` with `aria-pressed` true/false for toggle states.

4) Touch targets & spacing
- Minimum target: 44x44px for chips, filter button, and Apply/Clear buttons in mobile sheet — annotated in `FIGMA_SKELETON.md` and `HANDOFF_README.md`.
- Row heights: desktop default 64px, compact 48px; mobile rows should maintain tappable area around content.

5) Empty states & motion
- Ensure color contrast and readable copy in empty / no-results states.
- Avoid auto-updating content without focus/announcement.

Phase-2 items (deferred or require brand/legal)
- Any brand token adjustments that affect global identity should be routed to brand review and considered Phase 2.
- Soroban / on-chain id filtering accessibility patterns — defer to v2 and note in Figma cover page.

Deliverables
- Actionable list for engineering: ARIA attributes, live-region text, keyboard interactions (attach to handoff README).
- Proposed token adjustments (if any) marked in Figma and documented here.
- Final automated contrast report (run after designer applies token tweaks).

Recommendations (short term)
- Run an automated contrast checker on the exported frames or directly in Figma using a plugin.
- Add focus state frames to Components page in Figma showing keyboard navigation.
- Annotate live-region example copy: "Showing {n} streams" and where to place it in the DOM.

Owner & Next Steps
- Owner (design): add contrast-checked token suggestions to Figma and update mockups.
- Owner (engineering): confirm feasibility of live-region and keyboard behaviors; implement during frontend work (tracked in separate frontend issue).
