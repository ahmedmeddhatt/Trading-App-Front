/**
 * Shared date/time formatting utilities.
 * All time displays use 12-hour format (AM/PM) consistently.
 */

/** Format a timestamp as 12-hour time: "3:45 PM" */
export function fmt12h(date: Date | string | number, locale = "en-US"): string {
  return new Date(date).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format a date as "Apr 16" */
export function fmtDateShort(date: Date | string | number, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** Format a date as "Apr 16, 2026" */
export function fmtDateLong(date: Date | string | number, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

/** Format a date as "Apr 16, 2026 · 3:45 PM" */
export function fmtDateTime(date: Date | string | number, locale = "en-US"): string {
  return `${fmtDateLong(date, locale)} · ${fmt12h(date, locale)}`;
}
