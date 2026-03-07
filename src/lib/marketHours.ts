/**
 * EGX (Egyptian Stock Exchange) market hours utility.
 * Trading hours: Sunday–Thursday 10:00–14:30 Cairo time (UTC+2, no DST).
 * Client-side only — uses browser Date adjusted to UTC+2.
 */

export type MarketLabel = "Open" | "Pre-Market" | "Post-Market" | "Closed" | "Weekend";

export interface MarketStatus {
  label: MarketLabel;
  isOpen: boolean;
  /** ms until next open (0 if currently open) */
  nextOpenMs: number;
  /** ms until close (if open), else 0 */
  closesInMs: number;
}

const UTC_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2

/** Returns Cairo local Date from UTC Date */
function toCairo(date: Date): Date {
  return new Date(date.getTime() + UTC_OFFSET_MS);
}

/** Minutes since midnight in Cairo time */
function cairoMinutesSinceMidnight(date: Date): number {
  const cairo = toCairo(date);
  return cairo.getUTCHours() * 60 + cairo.getUTCMinutes();
}

/** Cairo weekday: 0=Sun, 1=Mon … 6=Sat */
function cairoDayOfWeek(date: Date): number {
  return toCairo(date).getUTCDay();
}

const OPEN_MINUTES = 10 * 60;       // 10:00
const CLOSE_MINUTES = 14 * 60 + 30; // 14:30
const PRE_MARKET_MINUTES = 9 * 60 + 30; // 09:30 (30 min before open)

/** Returns ms until the next market open from the given Date */
function msUntilNextOpen(now: Date): number {
  const cairo = toCairo(now);
  const day = cairo.getUTCDay(); // 0=Sun … 6=Sat
  const minutes = cairo.getUTCHours() * 60 + cairo.getUTCMinutes() + cairo.getUTCSeconds() / 60;

  // Find how many days until the next trading day (Sun–Thu)
  const isTradingDay = day >= 0 && day <= 4; // Sun=0 … Thu=4

  // Build a Date for today's open in Cairo time (as UTC)
  const cairoMidnightUTC = new Date(Date.UTC(
    cairo.getUTCFullYear(),
    cairo.getUTCMonth(),
    cairo.getUTCDate(),
    0, 0, 0
  ));
  // Subtract the UTC+2 offset to get the actual UTC time for Cairo midnight
  const cairoMidnightActualUTC = new Date(cairoMidnightUTC.getTime() - UTC_OFFSET_MS);

  const todayOpenUTC = new Date(cairoMidnightActualUTC.getTime() + OPEN_MINUTES * 60 * 1000);

  if (isTradingDay && now < todayOpenUTC) {
    return todayOpenUTC.getTime() - now.getTime();
  }

  // Calculate days to next trading day
  let daysAhead = 1;
  let nextDay = (day + 1) % 7;
  while (nextDay === 5 || nextDay === 6) { // skip Fri=5, Sat=6
    daysAhead++;
    nextDay = (nextDay + 1) % 7;
  }

  const nextOpenUTC = new Date(cairoMidnightActualUTC.getTime() + daysAhead * 86400_000 + OPEN_MINUTES * 60 * 1000);
  return nextOpenUTC.getTime() - now.getTime();
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const day = cairoDayOfWeek(now);
  const minutes = cairoMinutesSinceMidnight(now);

  // Weekend: Fri (5) or Sat (6)
  if (day === 5 || day === 6) {
    return {
      label: "Weekend",
      isOpen: false,
      nextOpenMs: msUntilNextOpen(now),
      closesInMs: 0,
    };
  }

  // Trading day (Sun–Thu)
  if (minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES) {
    // Open
    const cairo = toCairo(now);
    const cairoMidnightActualUTC = new Date(
      Date.UTC(cairo.getUTCFullYear(), cairo.getUTCMonth(), cairo.getUTCDate()) - UTC_OFFSET_MS
    );
    const closeUTC = new Date(cairoMidnightActualUTC.getTime() + CLOSE_MINUTES * 60 * 1000);
    return {
      label: "Open",
      isOpen: true,
      nextOpenMs: 0,
      closesInMs: closeUTC.getTime() - now.getTime(),
    };
  }

  if (minutes >= PRE_MARKET_MINUTES && minutes < OPEN_MINUTES) {
    return {
      label: "Pre-Market",
      isOpen: false,
      nextOpenMs: msUntilNextOpen(now),
      closesInMs: 0,
    };
  }

  // Before pre-market or after close
  return {
    label: minutes >= CLOSE_MINUTES ? "Post-Market" : "Closed",
    isOpen: false,
    nextOpenMs: msUntilNextOpen(now),
    closesInMs: 0,
  };
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
