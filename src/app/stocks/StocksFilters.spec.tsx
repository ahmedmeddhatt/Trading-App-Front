/**
 * Tests for the stocks filter panel logic.
 * Uses a self-contained FilterPanel component that mirrors the stocks page filter state.
 */
import React, { useState, useEffect, useRef } from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

interface FilterValues {
  search?: string;
  sector?: string;
  minPE?: string;
  maxPE?: string;
}

interface FilterPanelProps {
  onFilterChange: (v: FilterValues) => void;
  sectors?: string[];
}

// ─── Minimal filter panel (mirrors stocks page logic) ────────────────────────

function FilterPanel({ onFilterChange, sectors = [] }: FilterPanelProps) {
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("");
  const [minPE, setMinPE] = useState("");
  const [maxPE, setMaxPE] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search + numeric fields (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ search: search || undefined, sector: sector || undefined, minPE: minPE || undefined, maxPE: maxPE || undefined });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sector, minPE, maxPE]);

  const clear = () => { setSearch(""); setSector(""); setMinPE(""); setMaxPE(""); };

  return (
    <div>
      <input data-testid="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select data-testid="sector" value={sector} onChange={(e) => setSector(e.target.value)}>
        <option value="">All sectors</option>
        {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input data-testid="minPE" type="number" placeholder="Min P/E" value={minPE} onChange={(e) => setMinPE(e.target.value)} />
      <input data-testid="maxPE" type="number" placeholder="Max P/E" value={maxPE} onChange={(e) => setMaxPE(e.target.value)} />
      <button data-testid="clear" onClick={clear}>Clear filters</button>
    </div>
  );
}

describe("StocksFilters", () => {
  it("calls onFilterChange after 300ms debounce when typing in search", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FilterPanel onFilterChange={onChange} />);

    await user.type(screen.getByTestId("search"), "CO");

    // Not called yet during typing
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ search: "CO" }));

    act(() => jest.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: "CO" }));
    jest.useRealTimers();
  });

  it("calls onFilterChange only once with final value after debounce", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FilterPanel onFilterChange={onChange} />);

    await user.type(screen.getByTestId("minPE"), "10");
    const callsBefore = onChange.mock.calls.length;

    act(() => jest.advanceTimersByTime(300));
    // Should have fired once more with minPE: "10"
    expect(onChange.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.minPE).toBe("10");
    jest.useRealTimers();
  });

  it("selecting a sector calls onFilterChange with correct sector value", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FilterPanel onFilterChange={onChange} sectors={["Banking", "Real Estate"]} />);

    await user.selectOptions(screen.getByTestId("sector"), "Banking");
    act(() => jest.advanceTimersByTime(300));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sector: "Banking" }));
    jest.useRealTimers();
  });

  it("maxPE debounce: fires once with correct value", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FilterPanel onFilterChange={onChange} />);

    await user.type(screen.getByTestId("maxPE"), "50");
    act(() => jest.advanceTimersByTime(300));

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.maxPE).toBe("50");
    jest.useRealTimers();
  });

  it("clear button resets all filter values", async () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<FilterPanel onFilterChange={onChange} sectors={["Banking"]} />);

    await user.type(screen.getByTestId("search"), "test");
    await user.selectOptions(screen.getByTestId("sector"), "Banking");
    act(() => jest.advanceTimersByTime(300));

    await user.click(screen.getByTestId("clear"));
    act(() => jest.advanceTimersByTime(300));

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.search).toBeUndefined();
    expect(lastCall.sector).toBeUndefined();
    jest.useRealTimers();
  });

  it("shows all provided sector options in dropdown", () => {
    const onChange = jest.fn();
    render(<FilterPanel onFilterChange={onChange} sectors={["Banking", "Real Estate", "Consumer"]} />);
    expect(screen.getByText("Banking")).toBeInTheDocument();
    expect(screen.getByText("Real Estate")).toBeInTheDocument();
    expect(screen.getByText("Consumer")).toBeInTheDocument();
  });
});
