/**
 * Per-recipient receipt customisation.
 *
 * Lets a recipient brand the receipt they receive with their own logo,
 * accent colour and a short thank-you message. The theme is fully
 * validated and normalised here so that UI components can render it
 * without re-checking untrusted input.
 */

/** Raw, possibly-untrusted customisation supplied by a recipient. */
export type ReceiptThemeInput = {
  /** Absolute https URL of a logo image. */
  logoUrl?: string | null;
  /** Hex accent colour, e.g. "#1f6feb". */
  accentColor?: string | null;
  /** Short message shown on the receipt, e.g. "Thanks for your support!". */
  message?: string | null;
};

/** Validated, render-ready receipt theme. */
export type ReceiptTheme = {
  logoUrl?: string;
  accentColor: string;
  message?: string;
};

/** Default StreamPay brand accent used when a recipient sets none. */
export const DEFAULT_ACCENT_COLOR = "#1f6feb";

/** Messages longer than this are truncated to keep receipts tidy. */
export const MAX_MESSAGE_LENGTH = 140;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** True for a syntactically valid 3- or 6-digit hex colour. */
export function isValidAccentColor(value: string | null | undefined): boolean {
  return typeof value === "string" && HEX_COLOR.test(value.trim());
}

/** True only for absolute https URLs (blocks http, data:, javascript:, …). */
export function isSafeLogoUrl(value: string | null | undefined): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalise untrusted recipient input into a render-ready theme.
 * Invalid logo URLs and colours fall back to safe defaults, and the
 * message is trimmed and length-capped.
 */
export function normalizeReceiptTheme(input: ReceiptThemeInput = {}): ReceiptTheme {
  const theme: ReceiptTheme = {
    accentColor: isValidAccentColor(input.accentColor)
      ? input.accentColor!.trim().toLowerCase()
      : DEFAULT_ACCENT_COLOR,
  };

  if (isSafeLogoUrl(input.logoUrl)) {
    theme.logoUrl = input.logoUrl!.trim();
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (message) {
    theme.message =
      message.length > MAX_MESSAGE_LENGTH
        ? `${message.slice(0, MAX_MESSAGE_LENGTH - 1).trimEnd()}…`
        : message;
  }

  return theme;
}
