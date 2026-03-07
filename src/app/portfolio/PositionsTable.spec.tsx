/**
 * Tests for the expandable positions table embedded in /portfolio.
 * We test a minimal self-contained component that mirrors the table logic
 * rather than importing the full page (which has SSR/dynamic imports).
 */
import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { rest } from "msw";
import { server } from "@/mocks/server";
import { mockHistory, mockPositions } from "@/mocks/data";
import { apiClient } from "@/lib/apiClient";

// ─── Minimal positions table (mirrors portfolio page logic) ──────────────────

interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface StockHistoryResponse {
  transactions: { type: string; quantity: number; price: number; timestamp: string; total?: number }[];
}

function InlineHistory({ symbol }: { symbol: string }) {
  const { data, isLoading } = useQuery<StockHistoryResponse>({
    queryKey: ["portfolio", "stock-history", symbol],
    queryFn: () => apiClient.get(`/api/portfolio/stock/${symbol}/history`),
    retry: false,
  });
  if (isLoading) return <div data-testid="history-loading">Loading…</div>;
  const txs = data?.transactions ?? [];
  if (!txs.length) return <div>No transaction history.</div>;
  return (
    <div data-testid={`history-${symbol}`}>
      {txs.map((tx, i) => (
        <div key={i}>{tx.type} {tx.quantity}@{tx.price}</div>
      ))}
    </div>
  );
}

function PositionsTable({ positions }: { positions: Position[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (sym: string) =>
    setExpanded((prev) => (prev === sym ? null : sym));

  return (
    <table>
      <tbody>
        {positions.map((pos) => {
          const isPos = pos.pnl >= 0;
          const isExpanded = expanded === pos.symbol;
          return (
            <React.Fragment key={pos.symbol}>
              <tr
                data-testid={`row-${pos.symbol}`}
                onClick={() => toggle(pos.symbol)}
              >
                <td>{pos.symbol}</td>
                <td
                  data-testid={`pnl-${pos.symbol}`}
                  className={isPos ? "text-emerald-400" : "text-red-400"}
                >
                  {isPos ? "+" : ""}{pos.pnl.toFixed(2)}
                </td>
                <td>{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
              </tr>
              {isExpanded && (
                <tr data-testid={`expanded-${pos.symbol}`}>
                  <td colSpan={3}>
                    <InlineHistory symbol={pos.symbol} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function renderTable(positions = mockPositions) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <PositionsTable positions={positions} />
    </QueryClientProvider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PositionsTable", () => {
  it("renders one row per position", () => {
    renderTable();
    expect(screen.getByTestId("row-COMI")).toBeInTheDocument();
    expect(screen.getByTestId("row-HRHO")).toBeInTheDocument();
  });

  it("expanding a row shows transaction history", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByTestId("row-COMI"));
    expect(screen.getByTestId("expanded-COMI")).toBeInTheDocument();
  });

  it("clicking the same row again collapses it", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByTestId("row-COMI"));
    expect(screen.getByTestId("expanded-COMI")).toBeInTheDocument();
    await user.click(screen.getByTestId("row-COMI"));
    expect(screen.queryByTestId("expanded-COMI")).not.toBeInTheDocument();
  });

  it("only one row expanded at a time", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByTestId("row-COMI"));
    expect(screen.getByTestId("expanded-COMI")).toBeInTheDocument();
    await user.click(screen.getByTestId("row-HRHO"));
    expect(screen.queryByTestId("expanded-COMI")).not.toBeInTheDocument();
    expect(screen.getByTestId("expanded-HRHO")).toBeInTheDocument();
  });

  it("positive P&L has green class", () => {
    renderTable();
    // COMI pnl = 500 (positive)
    const pnlCell = screen.getByTestId("pnl-COMI");
    expect(pnlCell.className).toMatch(/emerald/);
  });

  it("negative P&L has red class", () => {
    renderTable();
    // HRHO pnl = -500 (negative)
    const pnlCell = screen.getByTestId("pnl-HRHO");
    expect(pnlCell.className).toMatch(/red/);
  });

  it("loads transaction history on expand", async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByTestId("row-COMI"));
    await waitFor(() => {
      expect(screen.getByTestId("history-COMI")).toBeInTheDocument();
    });
    // Should show BUY transaction from mockHistory
    expect(screen.getByText(/BUY/)).toBeInTheDocument();
  });

  it("shows empty history message when no transactions", async () => {
    server.use(
      rest.get("/api/portfolio/stock/:symbol/history", (_req, res, ctx) =>
        res(ctx.json({ success: true, data: { transactions: [] } }))
      )
    );
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByTestId("row-COMI"));
    await waitFor(() => {
      expect(screen.getByText(/No transaction history/)).toBeInTheDocument();
    });
  });
});
