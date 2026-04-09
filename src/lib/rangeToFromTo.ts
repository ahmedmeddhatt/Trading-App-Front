export type DateRange = "1W" | "1M" | "3M" | "6M" | "1Y";

const RANGE_DAYS: Record<DateRange, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

/**
 * Convert a date-range tab label into ISO date strings suitable for
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD` query params.
 */
export function rangeToFromTo(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - RANGE_DAYS[range]);

  // Use local date parts to avoid UTC offset shifting the date back
  const pad = (n: number) => String(n).padStart(2, "0");
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return { from: toLocal(from), to: toLocal(now) };
}
