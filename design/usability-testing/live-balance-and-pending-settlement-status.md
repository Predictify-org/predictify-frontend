# Figma Handoff: Polite `aria-live` for Live Balance & Settlement
> *Scope*: UI/UX and product design (Figma, interaction, content). No Next.js or React implementation is included in this specification.

### 1. Accessibility (A11y) Strategy: Throttle vs. `aria-atomic`
Live streams in StreamPay accrue value continuously. If a screen reader reads every micro-transaction tick, it creates a severe usability issue (chatter).

**The agreed pattern for engineering handoff:**
- **Decouple Visuals from Screen Readers**: The rapidly changing visual ticker (e.g., `10.000001 XLM`) must have `aria-hidden="true"`.
- **The "Calm" Live Region**: Implement a visually hidden `<span>` or `<div>` with `aria-live="polite"` and `aria-atomic="true"`.
- **Throttling**: Do not update the `aria-live` DOM node on every frame. Batch updates to trigger either:
    1. Every 30–60 seconds.
    2. When the user focuses on the balance card.
    3. When a significant status change occurs (e.g., Draft → Active).

### 2. Figma Frame Annotations (Good vs. Bad)
**Frame A: "Noisy (Bad) Anti-Pattern"**
- **Visual**: Balance updating every 100ms (10.01... 10.02... 10.03).
- **A11y Annotation [RED]**: `aria-live="assertive"` placed directly on the rolling number.
- **Designer Note for Eng**: *DO NOT DO THIS*. This traps screen reader users in an endless loop of balance announcements, making the rest of the application impossible to navigate.

**Frame B: "Good (Calm) Pattern"**
- **Visual**: Balance updating every 100ms visually.
- **A11y Annotation [GREEN]**: Rolling numbers wrapped in `aria-hidden="true"`.
- **Hidden State Annotation [BLUE]**: `<div class="sr-only" aria-live="polite" aria-atomic="true">Current accrued balance is 10.05 XLM. Last updated 10 seconds ago.</div>`
- **Designer Note for Eng**: Use a debounced hook to update the screen-reader-only text at a calm interval. Add a "Refresh balance summary" icon button for users who want on-demand readings.

### 3. Microcopy & Stellar/Horizon Status Text
To maintain trust with users managing financial streams, avoid implying instant finality. Status text should align with the StreamPay lifecycle (Draft → Active → Paused → Ended).
- **Pending Settlement**: "Transaction submitted to the Stellar network. Awaiting confirmation."
- **Confirmed**: "Stream is active." (Do *not* use "Instantly finalized").
- **[Product TBD]**: Soroban smart contract sub-states. (Copy placeholder: *Waiting for product/legal confirmation on Soroban state phrasing*).
- **[Product TBD]**: On-chain escrow specific states. (Copy placeholder: *Escrow state TBD*).
- **[Product TBD]**: Vesting schedule specific states. (Copy placeholder: *Vesting state TBD*).

### 4. Design QA & Review Checklist
- [x] **Design Review**: Synced on strategy. Throttled visually-hidden `aria-live` region selected as the optimal path over raw updates.
- [x] **WCAG Self-Check**: * *Contrast:* All status badges (Active, Paused, Pending) meet 4.5:1 ratio.
    - *Focus/Keyboard:* Focus states spec'd for the proposed "Read balance aloud" utility button.
    - *Phase 2 Gaps:* Exact throttle timing (15s vs 30s) needs to be tested with actual screen reader users in a future usability test.
- [x] **Handoff**: Assets named. A11y overlays exported as PNGs. TBD markers clearly highlighted in red for product managers.
- [ ] **Follow-up**: Open frontend implementation issue in `StreamPay-Frontend` linking to these Figma frames.