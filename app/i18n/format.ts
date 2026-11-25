import { getStoredLanguage } from "./index";
import { AVAILABLE_LOCALES } from "./messages/index";

type DateValue = Date | number | string;

function toDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}

function getLocale(locale: string): string {
  const baseLocale = locale.split("-")[0].toLowerCase();
  if (!AVAILABLE_LOCALES.includes(baseLocale)) return "en";
  try {
    new Intl.NumberFormat(locale);
    return locale;
  } catch {
    return "en";
  }
}

export function formatNumber(
  value: number,
  locale: string = getStoredLanguage(),
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(getLocale(locale), {
    useGrouping: "always",
    ...options,
  }).format(value);
}

export function formatCurrency(
  value: number,
  currency = "USD",
  locale: string = getStoredLanguage(),
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">
): string {
  return new Intl.NumberFormat(getLocale(locale), {
    useGrouping: "always",
    ...options,
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(
  value: DateValue,
  locale: string = getStoredLanguage(),
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(getLocale(locale), options).format(toDate(value));
}

export function formatRelative(
  value: DateValue,
  locale: string = getStoredLanguage(),
  baseDate: DateValue = Date.now()
): string {
  const timestamp = toDate(value).getTime();
  const difference = timestamp - toDate(baseDate).getTime();
  const seconds = Math.round(difference / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const [unit, unitSeconds] =
    units.find(([, unitSize]) => Math.abs(seconds) >= unitSize) ??
    (["second", 1] as const);

  // `numeric: "always"` keeps output predictable across ICU versions (e.g.
  // French "dans 2 jours" rather than the locale-specific "après-demain").
  return new Intl.RelativeTimeFormat(getLocale(locale), {
    numeric: "always",
  }).format(Math.round(seconds / unitSeconds), unit);
}
