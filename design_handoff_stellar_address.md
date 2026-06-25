# Design Handoff: Stellar Address Display & Trust Patterns

**Figma File:** [StreamPay Core App UI - Recipient Patterns](https://figma.com/file/mock-streampay-recipient-patterns)  
**Related Files:** [Glossary](https://figma.com/file/mock-glossary), [Stream Detail](https://figma.com/file/mock-stream-detail)  
**Design Review Notes:** [Confluence: Stellar Recipient Design Crit](https://confluence.streampay.test/design-crit/stellar-recipient)

## 1. User Pastes a Stellar Public Address
> [!NOTE]
> **Context:** When a user manually inputs a Stellar address, the UI validates the input format and provides visual confirmation of the entry.

**Artboard:**
![Pasted Stellar Address](/home/nursca/.gemini/antigravity/brain/b8252d6f-e50b-4dab-8e0c-f1677955172a/stellar_address_paste_ui_1777395985570.png)

**Component Specs:**
*   **Truncation:** Short-form addresses should use the pattern `G...[Last 4 chars]` (e.g., `GD5W...0P4A`) when space is limited. Full addresses should only be shown if horizontal space permits without breaking layout, otherwise middle-truncated.
*   **Copy Button:** Includes a persistent copy-to-clipboard icon inside the input field.
*   **A11y:** `aria-label="Stellar address, starts with G D 5 W, ends with 0 P 4 A. Click to copy full address."`

## 2. User Picks from Recents
> [!TIP]
> **Context:** Streamlines sending to frequently used contacts. Reduces the risk of mistyping addresses.

**Artboard:**
![Recent Recipients](/home/nursca/.gemini/antigravity/brain/b8252d6f-e50b-4dab-8e0c-f1677955172a/stellar_address_recents_ui_1777396003753.png)

**Component Specs:**
*   **List Item:** Shows abstract avatar (if no custom avatar available), truncated address, and relative timestamp.
*   **A11y:** Focus states must trap within the dropdown or list until a selection is made or closed via `ESC`. `aria-activedescendant` is used for arrow key navigation.

## 3. Verified Recipient & Fraud Caution
> [!WARNING]
> **Context:** When sending funds, particularly to newly pasted addresses from external sources (e.g., untrusted chat), display a clear fraud warning. Verified addresses get a trust badge.

**Artboard:**
![Verified Recipient & Caution](/home/nursca/.gemini/antigravity/brain/b8252d6f-e50b-4dab-8e0c-f1677955172a/stellar_address_verified_ui_1777396018803.png)

**Component Specs:**
*   **Verified Badge:** Gold/Green checkmark with a tooltip.
*   **Microcopy:** *“ALWAYS VERIFY RECIPIENT DETAILS BEFORE SENDING. Transacting on the Stellar network is final. Guard your funds against potential fraud and phishing attempts.”*
*   *(Product TBD: Ensure this microcopy aligns with Soroban/escrow finality capabilities once implemented. Currently implies instant finality).*

---

## Technical Sync & Engineering Handoff
*Sync completed with engineering on v1 address fields. The API will return:*
*   `publicKey`: The full Stellar `G...` address.
*   `memo` (Optional): Required for some exchanges, to be handled in a separate phase if not specified.
*   `verifiedStatus`: Boolean or Enum (`NONE`, `VERIFIED`, `SUSPICIOUS`).
*   `avatarUrl` (Optional): URI for the user's abstract or custom avatar.

## WCAG Self-Check
*   **Contrast:** All text meets AA (4.5:1) minimum against dark mode backgrounds. Accent colors tested for readability.
*   **Keyboard:** Full tab progression tested for input -> copy button -> submit.
*   **Phase 2 Gaps:** Screen reader announcements for real-time address validation (e.g., checksum verification) are currently omitted. Engineering will need to implement live `aria-live="polite"` regions when the validation library is added.

## Exported Assets
*   `ic_copy_stellar.svg`
*   `badge_verified_trust.svg`
*   `icon_warning_fraud.svg`
