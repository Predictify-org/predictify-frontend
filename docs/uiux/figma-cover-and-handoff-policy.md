# StreamPay (Stellar) Figma Design System: Cover Page & Handoff Policy

## 1. File Naming & Versioning
- **File Naming Pattern**: `StreamPay-Stellar-v1.x` (or conform to organizational standard).
- **Semantic Versioning**: Use standard semantic versioning (e.g., `v1.0`, `v1.1` for minor updates).
- **Owner / Team**: Clearly state the design owner or team on the cover page.
- **Last Updated Date**: Keep current with every major push.

## 2. Cover Page Requirements
The primary StreamPay (Stellar) Figma file MUST have a single cover page linked from the team's Figma index. The cover page must include:
- **Project Name**: StreamPay (Stellar)
- **Repo Link**: Direct link to the `Streampay-Org/StreamPay-Frontend` GitHub repository.
- **Change Requests**: A short "how to request changes" note outlining the procedure for submitting design modifications.
- **TBD Statuses**: If Soroban experimental frames, on-chain escrow, or vesting screens are still To Be Determined (TBD), explicitly state this on the cover page.
- **Lab Markers**: Mark any experimental "Soroban" product frames as "lab".

## 3. Version Log Table
Maintain a version log table directly on the cover page tracking:
- **Date**
- **What Changed** (e.g., "Soroban/escrow labels TBD", "Added new success state for stream creation")

## 4. Permissions & Snapshots
- **Access Control**: Document exactly who has publish (edit) rights versus view-only rights (this is a process rule, not an IT implementation in this document).
- **Snapshot Policy (Optional)**: Implement a read-only snapshot (export) policy before big releases. Quarterly archive PDFs of key frames may be required for compliance depending on organizational rules.

## 5. Handoff to Engineering
- **Design Review**: Run a design critique with at least one product stakeholder and one engineering stakeholder. Link the notes in the Figma file or a short supplementary doc.
- **WCAG Self-Check**: Validate contrast, focus states, and keyboard navigability. Document any gaps deferred to "phase 2" along with the rationale.
- **Assets & Specs**: List named export assets, redlines, and component specs. Ensure there are **no orphan screens**.
- **Usability Testing** (If in scope): Attach a one-page script, session count, and key findings.

## 6. General UI/UX Guidelines
- **Trust & Clarity**: Clarity over visual novelty. Fintech and Stellar users must trust the UI with money-adjacent actions.
- **State Documentation**: Document all states in Figma: Empty, Loading, Error, and Success.
- **Lifecycle Context**: Always reference StreamPay's stream lifecycle: `draft → active → paused → ended`.

---
*Note: This is a pure design policy document. Implementation of these UI/UX guidelines in the Next.js app is tracked as separate frontend engineering work. No code commit is required in `StreamPay-Frontend` for pure design work beyond this documentation.*
