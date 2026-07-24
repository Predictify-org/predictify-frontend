/**
 * i18n — Type definitions for the message catalog.
 *
 * `Messages` is the canonical shape of a translation bundle.  Each key is a
 * dot-separated namespace path (e.g. `"nav.dashboard"`) and each value is a
 * string that may contain `{variable}` placeholders.
 *
 * Keeping this as a flat record (rather than a nested tree) makes it trivial
 * to iterate over all keys, detect missing translations, and keep per-locale
 * files diff-friendly.
 */

/**
 * A flat record of translation keys to message strings.
 * Message strings may contain named interpolation placeholders: `{name}`.
 *
 * @example
 * const msg: Messages = {
 *   "greeting.welcome": "Welcome, {name}!",
 *   "nav.dashboard": "Dashboard",
 * };
 */
export type Messages = Record<string, string>;

/**
 * A union of every key present in the English base catalog.
 * Import from `@/app/i18n` – it is re-exported there after being derived
 * automatically from the `en` messages object.
 */
export type MessageKey = string & { readonly __brand: "MessageKey" };

/**
 * Variables map passed to the `t()` function for placeholder interpolation.
 *
 * @example
 * t("greeting.welcome", { name: "Alice" }) // → "Welcome, Alice!"
 */
export type InterpolationValues = Record<string, string | number>;
