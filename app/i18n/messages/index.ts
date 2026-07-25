/**
 * Message catalog loader.
 *
 * Returns the flat key→string map for a given locale code.  Falls back to the
 * English base if the requested locale has no catalog yet.
 *
 * Adding a new locale:
 *  1. Create `app/i18n/messages/<code>.ts` exporting a `Messages` object.
 *  2. Import it here and add an entry to `CATALOGS`.
 *  3. Ensure the locale code is listed in `SUPPORTED_LANGUAGES` in
 *     `app/i18n/index.ts`.
 */

import type { Messages } from "../types";
import en from "./en";

/** Map of every compiled locale catalog, keyed by BCP-47 code. */
const CATALOGS: Record<string, Messages> = {
  en,
  // Add further locales as they become available:
  // es: () => import('./es').then(m => m.default),
};

/**
 * Returns the message catalog for `locale`, or the English fallback if no
 * catalog is registered for that locale.
 *
 * This is a synchronous lookup because all catalogs are bundled at build time.
 * If you later split catalogs into dynamic imports, update the return type to
 * `Promise<Messages>` and adjust callers accordingly.
 */
export function getMessages(locale: string): Messages {
  return CATALOGS[locale] ?? CATALOGS["en"];
}

/** All locale codes that have a compiled message catalog. */
export const AVAILABLE_LOCALES: ReadonlyArray<string> = Object.keys(CATALOGS);

export { en as defaultMessages };
