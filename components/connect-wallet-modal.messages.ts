/**
 * Centralised wallet modal microcopy.
 *
 * Every user-facing string lives here so that:
 *   1. Future i18n is a single-import swap.
 *   2. Strings are never duplicated between the modal and toast surfaces.
 *   3. Tone is consistent and reviewable in one place.
 *
 * Tone principles (see docs/microcopy-wallet.md):
 *   - Empathic acknowledgement ("We couldn't …")
 *   - Concrete cause ("Your … extension isn't installed")
 *   - Next action ("Install … and try again")
 *   - Plain-language, WCAG 2.1 AA readable (grade ≤ 7)
 */

// ─── Connection status ────────────────────────────────────────────────────────

export const walletConnectedTitle = "Wallet Connected";
export const walletConnectedDescription = "Your wallet is linked and ready to use.";
export const connectWalletTitle = "Connect Your Wallet";
export const connectWalletDescription = "Pick a wallet to start making secure predictions.";

// ─── In-progress states ──────────────────────────────────────────────────────

export const connectingLabel = "Connecting\u2026";
export const connectedLabel = "Connected";
export const disconnectButtonLabel = "Disconnect";

// ─── Last-used badge ─────────────────────────────────────────────────────────

export const lastUsedBadgeLabel = "Last used wallet";
export const lastUsedBadgeText = "Last used";

// ─── Copy address ────────────────────────────────────────────────────────────

export const copyAddressLabel = "Copy wallet address";
export const addressCopiedLabel = "Address copied";

// ─── Connection errors ───────────────────────────────────────────────────────

/**
 * Generic fallback when the wallet returns an unrecognised error.
 * Kept minimal — callers should prefer specific messages below.
 */
export const connectionErrorFallback = "Something went wrong while connecting. Please try again.";

/**
 * User cancelled the wallet popup (e.g. dismissed the extension prompt).
 */
export const connectionErrorUserRejected =
  "You cancelled the connection. If this was a mistake, try connecting again.";

/**
 * Wallet extension is not installed in the browser.
 */
export const connectionErrorExtensionNotFound =
  "We couldn't find a wallet extension. Install one from your browser's store, then try again.";

/**
 * Wallet extension is installed but locked / not logged in.
 */
export const connectionErrorExtensionLocked =
  "Your wallet extension is locked. Unlock it and try connecting again.";

/**
 * Network mismatch between the app and the wallet (testnet vs mainnet).
 */
export const connectionErrorNetworkMismatch =
  "Your wallet is on a different network. Switch it to match this app and try again.";

/**
 * The connection request timed out (no response from the wallet extension).
 */
export const connectionErrorTimeout =
  "The wallet took too long to respond. Check that the extension isn't paused and try again.";

/**
 * The wallet returned an unknown / unexpected error.
 */
export const connectionErrorUnexpected =
  "Something unexpected happened while connecting. Please try again or use a different wallet.";

// ─── Disconnection errors ────────────────────────────────────────────────────

export const disconnectionErrorFallback =
  "We couldn't disconnect your wallet. Try closing and reopening this dialog.";

export const disconnectionErrorUnexpected =
  "Something unexpected happened while disconnecting. Please try again.";

// ─── Generic (used by useWallet hook fallback) ────────────────────────────────

export const hookErrorConnecting = "Connection failed. Please try again.";
export const hookErrorDisconnecting = "Disconnection failed. Please try again.";
export const hookErrorNoWallet = "No wallet is connected. Please connect one first.";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Maps a raw wallet-kit error string to a user-friendly message.
 *
 * The wallet SDK sometimes returns short error codes; this function
 * normalises them to the warm, action-oriented copy defined above.
 */
export function friendlyConnectionError(rawError: string | null | undefined): string {
  const lower = (rawError ?? "").toLowerCase();

  if (lower.includes("reject") || lower.includes("cancel") || lower.includes("denied")) {
    return connectionErrorUserRejected;
  }
  if (lower.includes("not found") || lower.includes("not installed") || lower.includes("not available")) {
    return connectionErrorExtensionNotFound;
  }
  if (lower.includes("lock") || lower.includes("unlock") || lower.includes("logged out")) {
    return connectionErrorExtensionLocked;
  }
  if (lower.includes("network") || lower.includes("mismatch") || lower.includes("testnet") || lower.includes("mainnet")) {
    return connectionErrorNetworkMismatch;
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return connectionErrorTimeout;
  }
  if (lower.includes("error connecting") || lower.includes("error disconnecting")) {
    return connectionErrorFallback;
  }

  return connectionErrorFallback;
}

/**
 * Maps a raw wallet-kit error string to a user-friendly disconnection message.
 */
export function friendlyDisconnectionError(rawError: string | null | undefined): string {
  const lower = (rawError ?? "").toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Disconnection timed out. Try refreshing the page.";
  }

  return disconnectionErrorFallback;
}
