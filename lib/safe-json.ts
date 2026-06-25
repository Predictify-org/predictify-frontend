/**
 * Best-effort JSON parsing helpers.
 *
 * Throwing on malformed input is rarely what UI or route-handler code
 * wants; in most places we would rather log and fall back to a default.
 * These helpers keep that pattern consistent across the codebase.
 *
 * Added as a sibling module; no existing call sites are rewired here.
 */

/**
 * Parse a JSON string, returning `fallback` when parsing fails.
 *
 * @example
 *   safeParseJson<{ id: string }>('{"id":"a"}', { id: '' }).id // "a"
 *   safeParseJson('not json', { ok: false }).ok               // false
 */
export function safeParseJson<T>(input: string | null | undefined, fallback: T): T {
  if (input == null || input === '') return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

/**
 * Stringify a value, returning `fallback` when stringification fails
 * (e.g. circular references, BigInts without a replacer).
 */
export function safeStringifyJson(value: unknown, fallback: string = ''): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/**
 * Stringify a value that may contain `bigint`s by serialising them as
 * decimal strings. The bigints lose their type tag but stay losslessly
 * representable.
 */
export function stringifyWithBigInts(value: unknown): string {
  return JSON.stringify(value, (_key, val) =>
    typeof val === 'bigint' ? val.toString() : val,
  );
}
