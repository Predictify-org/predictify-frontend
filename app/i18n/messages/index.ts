/**
 * Message catalog loader.
 *
 * Returns the flat key→string map for a given locale code.  Falls back to the
 * English base if the requested locale has no catalog yet.
 *
 * Adding a new locale:
 *  1. Translate every key in `en.ts` in `app/i18n/messages/<code>.ts`.
 *  2. Register the catalog in `CATALOGS` here and add its language label to
 *     `SUPPORTED_LANGUAGES` in `app/i18n/index.ts`.
 *  3. Run `pnpm test -- app/i18n` to check key and placeholder parity.
 */

import type { Messages } from "../types";
import en from "./en";
import es from "./es";
import fr from "./fr";

/** Map of every compiled locale catalog, keyed by BCP-47 code. */
const CATALOGS: Record<string, Messages> = {
  en,
  es,
  fr,
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
