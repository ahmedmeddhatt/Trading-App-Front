"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  LogOut,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";
import { usePriceStream } from "@/hooks/usePriceStream";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { DateRange } from "@/features/portfolio/components/TimelineChart";
import type { AllocationSlice } from "@/features/portfolio/components/AllocationCharts";

const TimelineChart = dynamic(
  () => import("@/features/portfolio/components/TimelineChart"),
  { ssr: false }
);
const AllocationCharts = dynamic(
  () => import("@/features/portfolio/components/AllocationCharts"),
  { ssr: false }
);
const PerformerCards = dynamic(
  () => import("@/features/portfolio/components/PerformerCards"),
  { ssr: false }
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsPosition {
  symbol: string;
  totalQuantity: string | number;
  averagePrice: string | number;
  totalInvested: string | number;
  currentPrice: number | null;
  unrealizedPnL: string | number;
  realizedPnL: string | number;
  returnPercent?: string | number;
  graphData?: Array<{ price: string; timestamp: string }>;
}

interface Performer {
  symbol: string;
  unrealizedPnL: string;
  returnPercent: number;
}

interface Analytics {
  positions: AnalyticsPosition[];
  portfolioValue: {
    totalInvested: string | number;
    totalRealized: string | number;
    totalUnrealized: string | number;
    totalPnL: string | number;
  };
  bestPerformer?: Performer | null;
  worstPerformer?: Performer | null;
  winRate?: number;
  totalFeesPaid?: string;
  netPnL?: string;
  avgHoldingDays?: number;
  symbolsTraded?: number;
}

interface TimelinePoint {
  timestamp: string;
  totalValue: number;
}

interface AllocationData {
  bySector: AllocationSlice[];
  bySymbol: AllocationSlice[];
}

interface StockTransaction {
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: string;
  total?: number;
}

interface StockHistoryResponse {
  transactions: StockTransaction[];
  summary?: {
    totalBought?: number;
    totalSold?: number;
    netFlow?: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rangeToFromTo(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  const days: Record<DateRange, number> = {
    "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365,
  };
  from.setDate(from.getDate() - days[range]);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useAnalytics() {
  return useQuery<Analytics | null>({
    queryKey: ["portfolio", "analytics"],
    queryFn: () => apiClient.get<Analytics | null>("/api/portfolio/analytics"),
    retry: 1,
  });
}

function useTimeline(range: DateRange) {
  const { from, to } = rangeToFromTo(range);
  return useQuery<TimelinePoint[]>({
    queryKey: ["portfolio", "timeline", range],
    queryFn: async () => {
      const result = await apiClient.get<unknown>(`/api/portfolio/timeline?from=${from}&to=${to}`);
      return Array.isArray(result) ? (result as TimelinePoint[]) : [];
    },
    retry: 1,
  });
}

function useAllocation() {
  return useQuery<AllocationData>({
    queryKey: ["portfolio", "allocation"],
    queryFn: () => apiClient.get<AllocationData>("/api/portfolio/allocation"),
    retry: 1,
  });
}

function useStockHistory(symbol: string | null) {
  return useQuery<StockHistoryResponse>({
    queryKey: ["portfolio", "stock-history", symbol],
    queryFn: () =>
      apiClient.get<StockHistoryResponse>(`/api/portfolio/stock/${symbol}/history`),
    enabled: !!symbol,
    retry: 1,
  });
}

// ─── Sparkline hook + component ──────────────────────────────────────────────

interface PriceHistoryPoint {
  price: number;
  timestamp: number;
}

function useSparkline(symbol: string) {
  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const to = new Date().toISOString().slice(0, 10);
  return useQuery<PriceHistoryPoint[]>({
    queryKey: ["sparkline", symbol],
    queryFn: async () => {
      const result = await apiClient.get<unknown>(
        `/api/prices/history/${symbol}?from=${from}&to=${to}`
      );
      return Array.isArray(result) ? (result as PriceHistoryPoint[]) : [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
}

function Sparkline({ symbol }: { symbol: string }) {
  const { data = [] } = useSparkline(symbol);
  if (data.length < 2) return null;
  const isGreen = data[data.length - 1].price >= data[0].price;
  const chartData = data.map((d) => ({ price: d.price }));
  return (
    <div style={{ width: 80, height: 32, display: "inline-block" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={isGreen ? "#34d399" : "#f87171"}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

function fmt(val: string | number) {
  return fmtCurrency.format(parseFloat(String(val)));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  positive,
  sub,
}: {
  label: string;
  value: string;
  positive?: boolean;
  sub?: string;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p
        className={`text-xl font-bold ${
          positive === undefined
            ? "text-white"
            : positive
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function WinRateBadge({ positions }: { positions: AnalyticsPosition[] }) {
  const winning = positions.filter(
    (p) => parseFloat(String(p.unrealizedPnL)) >= 0
  ).length;
  const rate = positions.length > 0 ? (winning / positions.length) * 100 : 0;
  return (
    <StatCard
      label="Win Rate"
      value={`${rate.toFixed(0)}%`}
      positive={rate >= 50}
      sub={`${winning} / ${positions.length} positions`}
    />
  );
}

function HistoryRow({ tx }: { tx: StockTransaction }) {
  const isBuy = tx.type === "BUY";
  const total = tx.total ?? tx.price * tx.quantity;
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-bold ${
            isBuy
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {tx.type}
        </span>
        <span className="text-gray-400">{tx.quantity} shares</span>
        <span className="text-gray-600">@ {fmt(tx.price)}</span>
      </div>
      <div className="text-right">
        <p className="text-white font-medium">{fmt(total)}</p>
        <p className="text-gray-600">
          {new Date(tx.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function ExpandedHistory({ symbol }: { symbol: string }) {
  const { data, isLoading } = useStockHistory(symbol);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="animate-spin text-gray-500" size={16} />
      </div>
    );
  }

  const transactions = data?.transactions ?? [];

  if (!data || transactions.length === 0) {
    return (
      <p className="text-gray-600 text-xs text-center py-4">
        No transaction history.
      </p>
    );
  }

  return (
    <div>
      {transactions.map((tx, i) => (
        <HistoryRow key={i} tx={tx} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>("1M");
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const { data: portfolio, isLoading, isError } = usePortfolio();
  const { data: analytics } = useAnalytics();
  const { data: timeline, isLoading: timelineLoading } = useTimeline(range);
  const { data: allocation } = useAllocation();

  const positionSymbols = (portfolio?.positions ?? []).map((p) => p.symbol);
  const { prices } = usePriceStream(positionSymbols);

  const analyticsMap = useMemo(
    () =>
      new Map(
        (analytics?.positions ?? []).map((p) => [p.symbol, p])
      ),
    [analytics]
  );

  const handleLogout = async () => {
    await apiClient.post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
  };

  // Apply allocation filters to positions
  const filteredPositions = useMemo(() => {
    const positions = portfolio?.positions ?? [];
    if (!activeSector && !activeSymbol) return positions;
    return positions.filter((p) => {
      if (activeSymbol) return p.symbol === activeSymbol;
      if (activeSector) {
        const ap = analyticsMap.get(p.symbol);
        // sector filter: if we have sector from allocation bySector
        const inSector = allocation?.bySector.some(
          (s) => s.name === activeSector && allocation.bySymbol.some((bs) => bs.name === p.symbol)
        );
        return inSector ?? true;
      }
      return true;
    });
  }, [portfolio, activeSector, activeSymbol, analyticsMap, allocation]);

  // Summary values
  const pv = analytics?.portfolioValue;
  const totalInvested = pv
    ? parseFloat(String(pv.totalInvested))
    : (portfolio?.totalValue ?? 0);
  const unrealized = pv
    ? parseFloat(String(pv.totalUnrealized))
    : (portfolio?.totalPnl ?? 0);
  const realized = pv ? parseFloat(String(pv.totalRealized)) : null;
  const totalPnl = pv
    ? parseFloat(String(pv.totalPnL))
    : (portfolio?.totalPnl ?? 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-400" size={20} />
          <span className="font-bold text-lg tracking-tight">TradeDesk</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Overview
          </Link>
          <Link href="/portfolio" className="text-white font-medium">
            Portfolio
          </Link>
          <Link
            href="/stocks"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Stocks
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Invested"
            value={`EGP ${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <StatCard
            label="Unrealized P&L"
            value={`${unrealized >= 0 ? "+" : ""}EGP ${Math.abs(unrealized).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            positive={unrealized >= 0}
          />
          <StatCard
            label={realized !== null ? "Realized P&L" : "Total P&L"}
            value={`${(realized ?? totalPnl) >= 0 ? "+" : ""}EGP ${Math.abs(realized ?? totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            positive={(realized ?? totalPnl) >= 0}
          />
          {analytics?.positions && analytics.positions.length > 0 ? (
            <WinRateBadge positions={analytics.positions} />
          ) : (
            <StatCard
              label="Total P&L"
              value={`${totalPnl >= 0 ? "+" : ""}EGP ${Math.abs(totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              positive={totalPnl >= 0}
            />
          )}
        </div>

        {/* Fee / net P&L / holding stats */}
        {analytics && (analytics.totalFeesPaid !== undefined || analytics.netPnL !== undefined || analytics.avgHoldingDays !== undefined || analytics.symbolsTraded !== undefined) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.totalFeesPaid !== undefined && (
              <StatCard
                label="Total Fees Paid"
                value={`EGP ${parseFloat(analytics.totalFeesPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              />
            )}
            {analytics.netPnL !== undefined && (
              <StatCard
                label="Net P&L (after fees)"
                value={`${parseFloat(analytics.netPnL) >= 0 ? "+" : ""}EGP ${Math.abs(parseFloat(analytics.netPnL)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                positive={parseFloat(analytics.netPnL) >= 0}
              />
            )}
            {analytics.avgHoldingDays !== undefined && (
              <StatCard
                label="Avg Holding Period"
                value={`${analytics.avgHoldingDays.toFixed(1)} days`}
              />
            )}
            {analytics.symbolsTraded !== undefined && (
              <StatCard
                label="Symbols Traded"
                value={analytics.symbolsTraded.toString()}
              />
            )}
          </div>
        )}

        {/* Performer cards */}
        {(analytics?.bestPerformer || analytics?.worstPerformer) && (
          <PerformerCards
            best={analytics.bestPerformer}
            worst={analytics.worstPerformer}
          />
        )}

        {/* Timeline */}
        <TimelineChart
          data={timeline ?? []}
          range={range}
          onRangeChange={setRange}
          loading={timelineLoading}
        />

        {/* Allocation charts */}
        {allocation && (
          <AllocationCharts
            bySector={allocation.bySector}
            bySymbol={allocation.bySymbol}
            activeSector={activeSector}
            activeSymbol={activeSymbol}
            onSectorFilter={setActiveSector}
            onSymbolFilter={setActiveSymbol}
          />
        )}

        {/* Positions table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
              Positions
              {(activeSector || activeSymbol) && (
                <span className="ml-2 text-blue-400">
                  (filtered:{" "}
                  <button
                    onClick={() => {
                      setActiveSector(null);
                      setActiveSymbol(null);
                    }}
                    className="underline hover:text-blue-300"
                  >
                    clear
                  </button>
                  )
                </span>
              )}
            </h2>
            <span className="text-gray-600 text-xs">
              {filteredPositions.length} position
              {filteredPositions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-500" size={24} />
            </div>
          )}

          {isError && (
            <div className="text-center py-12 text-red-400 text-sm">
              Failed to load portfolio.
            </div>
          )}

          {!isLoading && !isError && filteredPositions.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No positions yet.
            </div>
          )}

          {!isLoading && filteredPositions.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Avg Cost</th>
                  <th className="text-right px-4 py-3">Current Price</th>
                  <th className="text-right px-4 py-3">Market Value</th>
                  <th className="text-right px-4 py-3">Unrealized P&L</th>
                  <th className="text-right px-4 py-3">Return %</th>
                  <th className="text-center px-4 py-3 hidden lg:table-cell">30d</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos) => {
                  const ap = analyticsMap.get(pos.symbol);
                  const live = prices[pos.symbol];
                  const currentPrice =
                    live?.price ?? ap?.currentPrice ?? pos.currentPrice;
                  const qty = ap
                    ? parseFloat(String(ap.totalQuantity))
                    : pos.quantity;
                  const avgCost = ap
                    ? parseFloat(String(ap.averagePrice))
                    : pos.avgCost;
                  const invested = ap
                    ? parseFloat(String(ap.totalInvested))
                    : avgCost * qty;
                  const marketValue = currentPrice * qty;
                  const pnl = ap
                    ? parseFloat(String(ap.unrealizedPnL))
                    : marketValue - invested;
                  const pnlPct =
                    ap?.returnPercent != null
                      ? parseFloat(String(ap.returnPercent))
                      : invested > 0
                      ? (pnl / invested) * 100
                      : 0;
                  const isPos = pnl >= 0;
                  const isExpanded = expandedSymbol === pos.symbol;

                  return (
                    <>
                      <tr
                        key={pos.symbol}
                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() =>
                          setExpandedSymbol(isExpanded ? null : pos.symbol)
                        }
                      >
                        <td className="px-4 py-3 font-bold text-white">
                          <Link
                            href={`/stocks/${pos.symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-400 transition-colors"
                          >
                            {pos.symbol}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {qty}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {fmt(avgCost)}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {fmt(currentPrice)}
                          {live && (
                            <span className="block text-xs text-emerald-500 font-normal">
                              live
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {fmt(marketValue)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            isPos ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          <span className="flex items-center justify-end gap-1">
                            {isPos ? (
                              <TrendingUp size={13} />
                            ) : (
                              <TrendingDown size={13} />
                            )}
                            {isPos ? "+" : ""}
                            {fmt(Math.abs(pnl))}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            isPos ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {pnlPct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <Sparkline symbol={pos.symbol} />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={`${pos.symbol}-history`}
                          className="bg-gray-800/30"
                        >
                          <td colSpan={9} className="px-6 py-3">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">
                              Transaction History — {pos.symbol}
                            </p>
                            <ExpandedHistory symbol={pos.symbol} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
