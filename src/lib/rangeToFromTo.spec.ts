import { rangeToFromTo, type DateRange } from "./rangeToFromTo";

const TODAY = new Date("2025-06-15T12:00:00.000Z");

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000;
}

describe("rangeToFromTo", () => {
  it("'1W' → from is exactly 7 days before today", () => {
    const { from, to } = rangeToFromTo("1W");
    expect(daysBetween(from, to)).toBe(7);
  });

  it("'1M' → from is exactly 30 days before today", () => {
    const { from, to } = rangeToFromTo("1M");
    expect(daysBetween(from, to)).toBe(30);
  });

  it("'3M' → from is exactly 90 days before today", () => {
    const { from, to } = rangeToFromTo("3M");
    expect(daysBetween(from, to)).toBe(90);
  });

  it("'6M' → from is exactly 180 days before today", () => {
    const { from, to } = rangeToFromTo("6M");
    expect(daysBetween(from, to)).toBe(180);
  });

  it("'1Y' → from is exactly 365 days before today", () => {
    const { from, to } = rangeToFromTo("1Y");
    expect(daysBetween(from, to)).toBe(365);
  });

  it("output format is YYYY-MM-DD (no time component)", () => {
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
    const { from, to } = rangeToFromTo("1M");
    expect(from).toMatch(ISO_DATE_RE);
    expect(to).toMatch(ISO_DATE_RE);
  });

  it("'to' is today's date", () => {
    const { to } = rangeToFromTo("1W");
    expect(to).toBe("2025-06-15");
  });

  it("'from' for 1W is 7 days before today", () => {
    const { from } = rangeToFromTo("1W");
    expect(from).toBe("2025-06-08");
  });

  it("all ranges: 'to' is always today, not yesterday or tomorrow", () => {
    const ranges: DateRange[] = ["1W", "1M", "3M", "6M", "1Y"];
    ranges.forEach((r) => {
      expect(rangeToFromTo(r).to).toBe("2025-06-15");
    });
  });
});
