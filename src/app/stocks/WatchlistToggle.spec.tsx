import React, { useState, useEffect } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const WATCHLIST_KEY = "tradedesk_watchlist";

// ─── Minimal WatchlistToggle (mirrors stocks page watchlist logic) ────────────

function WatchlistToggle({ symbol }: { symbol: string }) {
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      if (raw) setWatchlist(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const toggle = () => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const inWatchlist = watchlist.has(symbol);

  return (
    <button
      onClick={toggle}
      aria-label={inWatchlist ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
      data-testid={`watchlist-${symbol}`}
    >
      <span data-testid={`star-${symbol}`} className={inWatchlist ? "filled" : "empty"}>
        ★
      </span>
    </button>
  );
}

function renderToggle(symbol: string) {
  return render(<WatchlistToggle symbol={symbol} />);
}

beforeEach(() => {
  localStorage.clear();
});

describe("WatchlistToggle", () => {
  it("renders with empty star when symbol not in watchlist", () => {
    renderToggle("COMI");
    expect(screen.getByTestId("star-COMI").className).toContain("empty");
  });

  it("adds symbol to watchlist on click (filled star)", async () => {
    const user = userEvent.setup();
    renderToggle("COMI");
    await user.click(screen.getByTestId("watchlist-COMI"));
    expect(screen.getByTestId("star-COMI").className).toContain("filled");
  });

  it("removes symbol from watchlist on second click", async () => {
    const user = userEvent.setup();
    renderToggle("COMI");
    await user.click(screen.getByTestId("watchlist-COMI"));
    await user.click(screen.getByTestId("watchlist-COMI"));
    expect(screen.getByTestId("star-COMI").className).toContain("empty");
  });

  it("persists watchlist to localStorage", async () => {
    const user = userEvent.setup();
    renderToggle("COMI");
    await user.click(screen.getByTestId("watchlist-COMI"));
    const stored = JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]") as string[];
    expect(stored).toContain("COMI");
  });

  it("reads from localStorage on mount", () => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(["HRHO"]));
    renderToggle("HRHO");
    expect(screen.getByTestId("star-HRHO").className).toContain("filled");
  });

  it("toggling one symbol does not affect others", async () => {
    const user = userEvent.setup();
    render(
      <>
        <WatchlistToggle symbol="COMI" />
        <WatchlistToggle symbol="HRHO" />
      </>
    );
    await user.click(screen.getByTestId("watchlist-COMI"));
    expect(screen.getByTestId("star-COMI").className).toContain("filled");
    expect(screen.getByTestId("star-HRHO").className).toContain("empty");
  });

  it("aria-label updates when toggled", async () => {
    const user = userEvent.setup();
    renderToggle("COMI");
    expect(screen.getByLabelText(/Add COMI/i)).toBeInTheDocument();
    await user.click(screen.getByTestId("watchlist-COMI"));
    expect(screen.getByLabelText(/Remove COMI/i)).toBeInTheDocument();
  });
});
