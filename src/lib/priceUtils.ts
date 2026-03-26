export type FreshnessStatus = "missing" | "fresh" | "stale" | "dead";

export const FRESHNESS_THRESHOLDS = {
  fresh: 5 * 60 * 1000,   // < 5 min
  stale: 60 * 60 * 1000,  // < 1 hour
  // >= 1 hour → dead
} as const;

export const FRESHNESS_COLORS: Record<FreshnessStatus, string> = {
  missing: "text-gray-500",
  fresh:   "text-emerald-400",
  stale:   "text-amber-400",
  dead:    "text-amber-400",
};

/**
 * Classify a price timestamp into a freshness bucket.
 * @param lastUpdate - ISO string or ms timestamp, or null/undefined
 */
export function getPriceFreshness(lastUpdate: string | number | null | undefined): FreshnessStatus {
  if (lastUpdate == null) return "missing";

  const ts = typeof lastUpdate === "string" ? new Date(lastUpdate).getTime() : lastUpdate;
  if (isNaN(ts)) return "missing";

  const age = Date.now() - ts;
  if (age < 0) return "fresh"; // clock skew — treat as fresh
  if (age < FRESHNESS_THRESHOLDS.fresh) return "fresh";
  if (age < FRESHNESS_THRESHOLDS.stale) return "stale";
  return "dead";
}

/**
 * Human-readable relative age string.
 */
export function formatPriceAge(lastUpdate: string | number | null | undefined): string {
  if (lastUpdate == null) return "never";

  const ts = typeof lastUpdate === "string" ? new Date(lastUpdate).getTime() : lastUpdate;
  if (isNaN(ts)) return "never";

  const age = Math.max(0, Date.now() - ts); // clamp to 0 for clock skew
  const seconds = Math.floor(age / 1000);

  if (seconds < 60) return seconds <= 5 ? "just now" : `${seconds} seconds ago`;

  const minutes = Math.floor(age / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

  const hours = Math.floor(age / 3_600_000);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

  const days = Math.floor(age / 86_400_000);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}
