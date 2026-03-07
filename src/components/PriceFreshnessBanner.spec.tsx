import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PriceFreshnessBanner from "./PriceFreshnessBanner";
import type { PriceData } from "@/hooks/usePriceStream";

const NOW = 1_700_000_000_000;

function makePriceData(symbol: string, ageMs: number): PriceData {
  return {
    symbol,
    price: 100,
    change: 0,
    changePercent: 0,
    timestamp: NOW - ageMs,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("PriceFreshnessBanner", () => {
  it("renders nothing when no stale symbols", () => {
    const prices = {
      COMI: makePriceData("COMI", 10_000), // 10s old — fresh
    };
    const { container } = render(
      <PriceFreshnessBanner prices={prices} symbols={["COMI"]} threshold={60} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when symbols have no price data yet", () => {
    const { container } = render(
      <PriceFreshnessBanner prices={{}} symbols={["COMI", "HRHO"]} threshold={60} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows banner when a symbol has a stale price", () => {
    const prices = {
      COMI: makePriceData("COMI", 5 * 60 * 1000), // 5 min old — stale at 60s threshold
    };
    render(
      <PriceFreshnessBanner prices={prices} symbols={["COMI"]} threshold={60} />
    );
    expect(screen.getByText(/1/)).toBeInTheDocument();
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
  });

  it("shows the stale symbol name in the banner", () => {
    const prices = {
      COMI: makePriceData("COMI", 5 * 60 * 1000),
    };
    render(
      <PriceFreshnessBanner prices={prices} symbols={["COMI"]} threshold={60} />
    );
    expect(screen.getByText(/COMI/)).toBeInTheDocument();
  });

  it("dismiss button hides the banner", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const prices = {
      COMI: makePriceData("COMI", 5 * 60 * 1000),
    };
    render(
      <PriceFreshnessBanner prices={prices} symbols={["COMI"]} threshold={60} />
    );
    const dismiss = screen.getByLabelText("Dismiss");
    await user.click(dismiss);
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();
  });

  it("re-appears after dismiss when additional symbols go stale", () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const stalePrice = makePriceData("COMI", 5 * 60 * 1000);
    const { rerender } = render(
      <PriceFreshnessBanner
        prices={{ COMI: stalePrice }}
        symbols={["COMI", "HRHO"]}
        threshold={60}
      />
    );

    // Dismiss — banner should disappear
    act(() => {
      screen.getByLabelText("Dismiss").click();
    });
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();

    // Now HRHO also becomes stale — stale count increases from 1 → 2
    rerender(
      <PriceFreshnessBanner
        prices={{
          COMI: stalePrice,
          HRHO: makePriceData("HRHO", 5 * 60 * 1000),
        }}
        symbols={["COMI", "HRHO"]}
        threshold={60}
      />
    );
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
  });

  it("does not re-appear after dismiss when stale count stays the same", () => {
    const stalePrice = makePriceData("COMI", 5 * 60 * 1000);
    const { rerender } = render(
      <PriceFreshnessBanner
        prices={{ COMI: stalePrice }}
        symbols={["COMI"]}
        threshold={60}
      />
    );

    act(() => {
      screen.getByLabelText("Dismiss").click();
    });
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();

    // Re-render with same stale count
    rerender(
      <PriceFreshnessBanner
        prices={{ COMI: stalePrice }}
        symbols={["COMI"]}
        threshold={60}
      />
    );
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();
  });

  it("shows count of stale symbols", () => {
    const prices = {
      COMI: makePriceData("COMI", 5 * 60 * 1000),
      HRHO: makePriceData("HRHO", 5 * 60 * 1000),
    };
    render(
      <PriceFreshnessBanner
        prices={prices}
        symbols={["COMI", "HRHO"]}
        threshold={60}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("truncates symbol list at 5 and shows +N more", () => {
    const symbols = ["A", "B", "C", "D", "E", "F"];
    const prices = Object.fromEntries(
      symbols.map((s) => [s, makePriceData(s, 5 * 60 * 1000)])
    );
    render(
      <PriceFreshnessBanner prices={prices} symbols={symbols} threshold={60} />
    );
    expect(screen.getByText(/\+1 more/)).toBeInTheDocument();
  });
});
