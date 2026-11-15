import type { Locale } from '../config/app.config';

/** Formats a finite number; returns null for null/NaN so callers can show "Not computable" (never 0). */
export function formatNumber(value: number | null | undefined, locale: Locale, maximumFractionDigits = 1): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function formatDate(iso: string | null | undefined, locale: Locale, withTime = false): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, withTime
    ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }
    : { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

/** Only http(s) URLs are rendered as links. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Number for scientific display: values with |x| < 1 keep 3 significant digits (0.0196, never 0),
 * larger ones use up to 2 decimals (1 decimal from 100 up). Thousands are always grouped.
 * null/NaN -> null so callers show "Not computable" (never 0).
 */
export function formatSmart(value: number | null | undefined, locale: Locale): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const options: Intl.NumberFormatOptions = abs === 0 ? {} : abs < 1
    ? { maximumSignificantDigits: 3 }
    : { maximumFractionDigits: abs >= 100 ? 1 : 2 };
  return new Intl.NumberFormat(locale, { useGrouping: 'always' as unknown as boolean, ...options }).format(value);
}

/** Integer with locale thousands separators (always grouped). */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { useGrouping: 'always' as unknown as boolean, maximumFractionDigits: 0 }).format(value);
}

/** Whole days between two ISO dates/datetimes; null if either is unreadable. */
export function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const x = new Date(a).getTime();
  const y = new Date(b).getTime();
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return Math.round(Math.abs(y - x) / 86_400_000);
}
