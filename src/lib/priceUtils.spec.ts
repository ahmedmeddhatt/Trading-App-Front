import {
  getPriceFreshness,
  formatPriceAge,
  FRESHNESS_COLORS,
  type FreshnessStatus,
} from "./priceUtils";

const NOW = 1_700_000_000_000; // fixed "now" in ms

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── getPriceFreshness ────────────────────────────────────────────────────────

describe("getPriceFreshness", () => {
  it("returns 'missing' for null", () => {
    expect(getPriceFreshness(null)).toBe("missing");
  });

  it("returns 'missing' for undefined", () => {
    expect(getPriceFreshness(undefined)).toBe("missing");
  });

  it("returns 'fresh' for timestamp 3 minutes ago", () => {
    const ts = NOW - 3 * 60 * 1000;
    expect(getPriceFreshness(ts)).toBe("fresh");
  });

  it("returns 'stale' for timestamp 10 minutes ago", () => {
    const ts = NOW - 10 * 60 * 1000;
    expect(getPriceFreshness(ts)).toBe("stale");
  });

  it("returns 'dead' for timestamp 2 hours ago", () => {
    const ts = NOW - 2 * 60 * 60 * 1000;
    expect(getPriceFreshness(ts)).toBe("dead");
  });

  it("returns 'fresh' for future timestamp (clock skew)", () => {
    const future = NOW + 5 * 60 * 1000;
    expect(getPriceFreshness(future)).toBe("fresh");
  });

  it("accepts ISO string timestamps", () => {
    const isoStr = new Date(NOW - 3 * 60 * 1000).toISOString();
    expect(getPriceFreshness(isoStr)).toBe("fresh");
  });
});

// ─── formatPriceAge ───────────────────────────────────────────────────────────

describe("formatPriceAge", () => {
  it("returns 'never' for null", () => {
    expect(formatPriceAge(null)).toBe("never");
  });

  it("returns 'never' for undefined", () => {
    expect(formatPriceAge(undefined)).toBe("never");
  });

  it("returns 'just now' or short form for 30 seconds ago", () => {
    const ts = NOW - 30 * 1000;
    const result = formatPriceAge(ts);
    expect(result).toMatch(/just now|30 seconds ago/i);
  });

  it("returns minutes for 5 minutes ago", () => {
    const ts = NOW - 5 * 60 * 1000;
    expect(formatPriceAge(ts)).toBe("5 minutes ago");
  });

  it("returns hours for 2 hours ago", () => {
    const ts = NOW - 2 * 60 * 60 * 1000;
    expect(formatPriceAge(ts)).toBe("2 hours ago");
  });

  it("returns days for 6 days ago", () => {
    const ts = NOW - 6 * 24 * 60 * 60 * 1000;
    expect(formatPriceAge(ts)).toBe("6 days ago");
  });

  it("still returns minutes at 59 min 59 sec (boundary)", () => {
    const ts = NOW - (60 * 60 * 1000 - 1000); // 59m 59s
    const result = formatPriceAge(ts);
    expect(result).toMatch(/minutes ago/);
    expect(result).not.toMatch(/hours ago/);
  });

  it("returns 'just now' for 0 seconds ago", () => {
    expect(formatPriceAge(NOW)).toBe("just now");
  });
});

// ─── FRESHNESS_COLORS ─────────────────────────────────────────────────────────

describe("FRESHNESS_COLORS", () => {
  const statuses: FreshnessStatus[] = ["missing", "fresh", "stale", "dead"];

  it("has an entry for every status", () => {
    statuses.forEach((s) => {
      expect(FRESHNESS_COLORS[s]).toBeTruthy();
    });
  });

  it("each value is a non-empty Tailwind class string", () => {
    statuses.forEach((s) => {
      expect(typeof FRESHNESS_COLORS[s]).toBe("string");
      expect(FRESHNESS_COLORS[s].length).toBeGreaterThan(0);
    });
  });

  it("'fresh' maps to a green class", () => {
    expect(FRESHNESS_COLORS.fresh).toMatch(/green|emerald/);
  });

  it("'dead' maps to a red class", () => {
    expect(FRESHNESS_COLORS.dead).toMatch(/red/);
  });

  it("'stale' maps to an amber/yellow class", () => {
    expect(FRESHNESS_COLORS.stale).toMatch(/amber|yellow/);
  });
});
