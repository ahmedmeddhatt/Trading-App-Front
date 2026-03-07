"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, Activity, LogOut, ChevronLeft, History, Calendar,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { apiClient } from "@/lib/apiClient";
import { usePriceStream } from "@/hooks/usePriceStream";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";
import TradeForm from "@/features/trade/components/TradeForm";
import TransactionHistoryDrawer from "@/features/trade/components/TransactionHistoryDrawer";
import { useMarketStatus } from "@/hooks/useMarketStatus";
import { formatPriceAge } from "@/lib/priceUtils";
import { rangeToFromTo, type DateRange } from "@/lib/rangeToFromTo";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StockSignals {
  daily: string | null;
  weekly: string | null;
  monthly: string | null;
}

interface StockDetail {
  symbol: string;
  name?: string;
  sector?: string;
  marketCap?: number;
  pe?: number;
  price: number | null;
  changePercent: number | null;
  lastUpdate: string | null;
  signals?: StockSignals;
  recommendation?: string | null;
  priceHistory?: Array<{ timestamp: string; price: number }>;
}

interface HistoryPoint {
  price: number;
  timestamp: number;
}

// ─── Signal Badge ─────────────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<string, string> = {
  "Strong Buy": "bg-emerald-900 text-emerald-300",
  "Buy": "bg-green-900 text-green-300",
  "Neutral": "bg-gray-800 text-gray-400",
  "Sell": "bg-red-900 text-red-400",
  "Strong Sell": "bg-red-950 text-red-500",
};

function SignalBadge({ signal }: { signal?: string | null }) {
  if (!signal) return <span className="text-gray-600 text-sm">N/A</span>;
  const cls = SIGNAL_STYLES[signal] ?? "bg-gray-800 text-gray-400";
  return (
    <span className={`px-2 py-1 rounded text-sm font-semibold ${cls}`}>
      {signal}
    </span>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useStockDetail(symbol: string) {
  return useQuery<StockDetail>({
    queryKey: ["stock", symbol],
    queryFn: () => apiClient.get<StockDetail>(`/api/stocks/${symbol}`),
    retry: 1,
  });
}

function useStockHistory(symbol: string, range: DateRange) {
  const { from, to } = rangeToFromTo(range);
  return useQuery<HistoryPoint[]>({
    queryKey: ["stock-history", symbol, range],
    queryFn: async () => {
      const result = await apiClient.get<unknown>(
        `/api/prices/history/${symbol}?from=${from}&to=${to}`
      );
      return Array.isArray(result) ? (result as HistoryPoint[]) : [];
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtEGP = (val: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(val);

const RANGES: DateRange[] = ["1W", "1M", "3M", "6M", "1Y"];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase();
  const router = useRouter();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [range, setRange] = useState<DateRange>("1M");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const { data: stock, isLoading: stockLoading, isError: stockError, refetch: refetchStock } = useStockDetail(symbol);
  const { data: history = [], isLoading: histLoading } = useStockHistory(symbol, range);
  const { data: portfolio } = usePortfolio();
  const { prices } = usePriceStream([symbol]);
  const priceData = prices[symbol] ?? null;
  const marketStatus = useMarketStatus();

  const position = portfolio?.positions.find((p) => p.symbol === symbol);
  const isPositive = priceData ? priceData.changePercent >= 0 : null;

  // Chart data
  const chartData = useMemo(() =>
    history.map((h) => ({
      date: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: h.price,
      timestamp: h.timestamp,
    })),
    [history]
  );
  const chartColor =
    history.length >= 2 && history[history.length - 1].price >= history[0].price
      ? "#34d399"
      : "#f87171";

  // Day picker
  const dayData = useMemo(() => {
    if (!selectedDate) return null;
    const selected = new Date(selectedDate).toDateString();
    const dayPoints = history.filter(
      (h) => new Date(h.timestamp).toDateString() === selected
    );
    if (dayPoints.length === 0) return null;
    return {
      open: dayPoints[0].price,
      close: dayPoints[dayPoints.length - 1].price,
      high: Math.max(...dayPoints.map((h) => h.price)),
      low: Math.min(...dayPoints.map((h) => h.price)),
    };
  }, [selectedDate, history]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleLogout = async () => {
    await apiClient.post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stocks" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Activity className="text-blue-400" size={20} />
            <span className="font-bold text-lg tracking-tight">TradeDesk</span>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Overview</Link>
          <Link href="/portfolio" className="text-gray-400 hover:text-white transition-colors">Portfolio</Link>
          <Link href="/stocks" className="text-gray-400 hover:text-white transition-colors">Stocks</Link>
          {position && (
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <History size={15} />
              <span>History</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </nav>
      </header>

      {/* Stock header */}
      <div className="border-b border-gray-800 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          {stockLoading ? (
            <div className="space-y-2">
              <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
            </div>
          ) : stockError ? (
            <div className="text-red-400 text-sm">
              Failed to load stock.{" "}
              <button onClick={() => refetchStock()} className="underline hover:text-red-300">Retry</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="bg-blue-900 text-blue-300 px-2.5 py-1 rounded font-mono font-bold text-sm">
                    {symbol}
                  </span>
                  {stock?.name && (
                    <h1 className="text-2xl font-bold">{stock.name}</h1>
                  )}
                  {stock?.sector && (
                    <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">
                      {stock.sector}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      marketStatus.isOpen
                        ? "bg-emerald-900 text-emerald-400"
                        : "bg-gray-800 text-gray-500"
                    }`}
                  >
                    {marketStatus.isOpen ? "Market Open" : "Market Closed"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${isPositive === true ? "text-emerald-400" : isPositive === false ? "text-red-400" : "text-white"}`}>
                  {priceData ? fmtEGP(priceData.price) : "—"}
                </p>
                {priceData && isPositive !== null && (
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium mt-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isPositive ? "+" : ""}{priceData.changePercent.toFixed(2)}%
                  </div>
                )}
                {priceData && (
                  <p className="text-gray-600 text-xs mt-0.5">
                    Updated {formatPriceAge(priceData.timestamp)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-4">

          {/* Signal cards */}
          {stock && (stock.signals?.daily || stock.signals?.weekly || stock.signals?.monthly || stock.recommendation) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Daily Signal", value: stock.signals?.daily ?? stock.recommendation },
                { label: "Weekly Signal", value: stock.signals?.weekly },
                { label: "Monthly Signal", value: stock.signals?.monthly },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-gray-500 text-xs mb-2">{label}</p>
                  <SignalBadge signal={value} />
                </div>
              ))}
            </div>
          )}

          {/* Fundamentals */}
          {stock && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stock.sector && <InfoCard label="Sector" value={stock.sector} />}
              {stock.marketCap && (
                <InfoCard
                  label="Market Cap"
                  value={`EGP ${(stock.marketCap / 1e9).toFixed(2)}B`}
                />
              )}
              {stock.pe && <InfoCard label="P/E Ratio" value={stock.pe.toFixed(2)} />}
              {stock.recommendation && (
                <div className="bg-gray-900 rounded-xl px-4 py-3">
                  <p className="text-gray-500 text-xs">Recommendation</p>
                  <div className="mt-1"><SignalBadge signal={stock.recommendation} /></div>
                </div>
              )}
            </div>
          )}

          {/* Price History Chart */}
          <div className="bg-gray-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Price History</h2>
              <div className="flex gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      range === r
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-48">
              {histLoading ? (
                <div className="h-full bg-gray-800 rounded animate-pulse" />
              ) : chartData.length < 2 ? (
                <div className="flex items-center justify-center h-full text-gray-700 text-sm border border-dashed border-gray-800 rounded-lg">
                  No price history available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v) => fmtEGP(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#9ca3af" }}
                      itemStyle={{ color: chartColor }}
                      formatter={(v: number) => [fmtEGP(v), "Price"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={chartColor}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4, fill: chartColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Day Picker */}
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-500" />
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
                  Day Snapshot
                </label>
              </div>
              <input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
              />
              {selectedDate && (
                dayData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoCard label="Open" value={fmtEGP(dayData.open)} />
                    <InfoCard label="Close" value={fmtEGP(dayData.close)} />
                    <InfoCard label="High" value={fmtEGP(dayData.high)} />
                    <InfoCard label="Low" value={fmtEGP(dayData.low)} />
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No data available for this date.</p>
                )
              )}
            </div>
          </div>

          {/* My Position (if owned) */}
          {position && (
            <div className="bg-gray-900 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">My Position</h2>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <History size={13} />
                  View full history
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <PositionStat label="Shares" value={position.quantity.toString()} />
                <PositionStat label="Avg Cost" value={fmtEGP(position.avgCost)} />
                <PositionStat
                  label="Market Value"
                  value={fmtEGP((priceData?.price ?? position.currentPrice) * position.quantity)}
                />
                <PositionStat
                  label="Unrealized P&L"
                  value={`${position.pnl >= 0 ? "+" : ""}${fmtEGP(position.pnl)} (${position.pnlPercent.toFixed(2)}%)`}
                  positive={position.pnl >= 0}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right col: Trade form */}
        <div className="lg:col-span-1">
          <TradeForm
            symbol={symbol}
            currentPrice={priceData?.price ?? null}
            ownedQuantity={position?.quantity ?? 0}
          />
        </div>
      </main>

      <TransactionHistoryDrawer
        symbol={symbol}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-white font-medium text-sm mt-0.5">{value}</p>
    </div>
  );
}

function PositionStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`font-medium text-sm mt-0.5 ${positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400"}`}>
        {value}
      </p>
    </div>
  );
}
