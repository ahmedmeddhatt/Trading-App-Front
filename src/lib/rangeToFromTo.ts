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
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - RANGE_DAYS[range]);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
