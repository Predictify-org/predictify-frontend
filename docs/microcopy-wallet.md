# Wallet Microcopy Tone Guide

This document defines the voice and tone for all user-facing strings in the wallet connection flow. Every string should follow these principles before being shipped.

## Tone Principles

### 1. Empathic Acknowledgement

Lead with a human-friendly acknowledgement that something didn't go as expected. Avoid blaming the user.

| Instead of | Use |
|------------|-----|
| "Failed" | "We couldn't connect your wallet" |
| "Error" | "Something went wrong" |
| "Invalid" | "That didn't work" |

### 2. Concrete Cause

Explain *what* happened in plain language. Users need to understand the problem before they can fix it.

| Instead of | Use |
|------------|-----|
| "Not supported" | "We couldn't find a wallet extension" |
| "Timeout" | "The wallet took too long to respond" |
| "Rejected" | "You cancelled the connection" |

### 3. Next Action

Always tell the user what to do next. An error without a next step is a dead end.

| Instead of | Use |
|------------|-----|
| "Try again" | "Try connecting again" |
| "Install extension" | "Install one from your browser's store, then try again" |
| "Check network" | "Switch your wallet to match this app and try again" |

## Readability

- **Target grade level:** ≤ 7 (Flesch-Kincaid)
- **Sentence length:** ≤ 20 words per sentence
- **Vocabulary:** Plain English; avoid jargon unless the term is standard wallet terminology (e.g., "extension", "network")

## WCAG 2.1 AA Compliance

- **No colour-only meaning:** All status indicators use icons + text (WCAG 1.4.1)
- **Screen-reader labels:** Every interactive element has an `aria-label` or visible text
- **Live regions:** Dynamic content uses `aria-live="polite"` for connection status
- **Focus management:** Dialog traps focus; close button is keyboard-accessible

## String Map

All strings live in `components/connect-wallet-modal.messages.ts`. This file:

1. Groups strings by semantic purpose (status, errors, labels)
2. Exports a `friendlyConnectionError()` helper for normalising raw SDK errors
3. Is the single source of truth — no string should appear inline in components

### Adding a New String

1. Add the string constant to `connect-wallet-modal.messages.ts`
2. Follow the three-part pattern: acknowledgement + cause + action
3. Keep it under 20 words
4. Import and use in the component — never hardcode

### Example: Writing a New Error Message

**Scenario:** User's wallet is on the wrong Stellar network.

```
Acknowledgement: "Your wallet is on a different network."
Cause:           "This app runs on testnet, but your wallet is set to mainnet."
Action:          "Switch your wallet's network and try again."
```

Combined (≤ 20 words):
> "Your wallet is on a different network. Switch it to match this app and try again."

## Edge Cases

| Scenario | Message |
|----------|---------|
| Unknown wallet ID | "Something went wrong while connecting. Please try again." |
| Extension locked | "Your wallet extension is locked. Unlock it and try connecting again." |
| Network mismatch | "Your wallet is on a different network. Switch it to match this app and try again." |
| User dismissed popup | "You cancelled the connection. If this was a mistake, try connecting again." |
| Timeout | "The wallet took too long to respond. Check that the extension isn't paused and try again." |
| Extension not installed | "We couldn't find a wallet extension. Install one from your browser's store, then try again." |

## Testing

Every error path must be covered by a snapshot or integration test that:

1. Asserts the correct message key is displayed
2. Verifies the message is not a raw SDK error string
3. Confirms `aria-live` regions announce the message

Run tests with:
```bash
pnpm test -- --testPathPattern=connect-wallet-modal
```

## References

- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Plain Language Guidelines](https://www.plainlanguage.gov/guidelines/)
- [Stellar Wallet Kit Docs](https://github.com/CreitTech/stellar-wallets-kit)
- [Wallet Integration Guide](./WALLET.md)

---

**Last Updated:** June 2026
**Status:** Active
**Version:** 1.0
