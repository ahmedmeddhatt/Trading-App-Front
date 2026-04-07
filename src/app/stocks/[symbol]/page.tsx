"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, ChevronLeft, History, Calendar, BarChart2, Activity,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
  LineChart, Line, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, Bar, Area, ReferenceLine, Legend, Cell,
} from "recharts";
import { apiClient } from "@/lib/apiClient";
import SignalBadge from "@/components/SignalBadge";
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

interface TechnicalData {
  symbol: string;
  currentPrice: number;
  error?: string;
  indicators: {
    sma20: number | null; sma50: number | null; sma200: number | null;
    ema12: number | null; ema26: number | null;
    macd: { value: number | null; signal: number | null; histogram: number | null; trend: string };
    rsi14: { value: number | null; zone: string };
    bollingerBands: { upper: number | null; middle: number | null; lower: number | null; bandwidth: number | null; percentB: number | null };
    roc10: number | null; momentum20: number | null;
  };
  trendAnalysis: {
    shortTerm: string; mediumTerm: string; longTerm: string;
    priceVsSma20: number; priceVsSma50: number | null; priceVsSma200: number | null;
    goldenCross: boolean; deathCross: boolean;
  };
  supportResistance: { supports: number[]; resistances: number[] };
  overallSignal: { score: number; action: string; basis: string[]; confidence: string };
  priceHistory: Array<{
    timestamp: string; price: number;
    sma20: number | null; sma50: number | null; ema12: number | null; ema26: number | null;
    bollingerUpper: number | null; bollingerLower: number | null;
    macdValue: number | null; macdSignal: number | null; macdHistogram: number | null; rsi: number | null;
  }>;
}

// ─── AI Signal Types ──────────────────────────────────────────────────────────

interface AISignalData {
  signal: string;
  confidence: string;
  score: number;
  reasons: string[];
  summary: string;
  risks: string[];
  targetAction: string;
  horizon: string;
  source: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useStockDetail(symbol: string) {
  return useQuery<StockDetail>({
    queryKey: ["stock", symbol],
    queryFn: () => apiClient.get<StockDetail>(`/api/stocks/${symbol}`),
    retry: 1,
  });
}

function useUserHorizon() {
  const { data } = useQuery<{ investmentHorizon?: string }>({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get<{ investmentHorizon?: string }>("/api/auth/me"),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  return data?.investmentHorizon ?? "MID_TERM";
}

function useAISignal(symbol: string, horizon = "MID_TERM") {
  return useQuery<AISignalData>({
    queryKey: ["ai-signal", symbol, horizon],
    queryFn: () => apiClient.get<AISignalData>(`/api/stocks/${symbol}/signal?horizon=${horizon}`),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

function useTechnicalAnalysis(symbol: string) {
  return useQuery<TechnicalData>({
    queryKey: ["technical", symbol],
    queryFn: () => apiClient.get<TechnicalData>(`/api/stocks/${symbol}/technical`),
    staleTime: 5 * 60 * 1000,
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
      if (!Array.isArray(result)) return [];
      return (result as Array<{ price: unknown; timestamp: unknown }>).map((h) => ({
        price: parseFloat(String(h.price)),
        timestamp: new Date(h.timestamp as string).getTime(),
      }));
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [range, setRange] = useState<DateRange>("1M");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "technical">("overview");

  const { data: stock, isLoading: stockLoading, isError: stockError, refetch: refetchStock } = useStockDetail(symbol);
  const { data: history = [], isLoading: histLoading } = useStockHistory(symbol, range);
  const { data: techData, isLoading: techLoading } = useTechnicalAnalysis(symbol);
  const userHorizon = useUserHorizon();
  const { data: aiSignal, isLoading: aiSignalLoading } = useAISignal(symbol, userHorizon);
  const { data: portfolio } = usePortfolio();
  const { prices } = usePriceStream([symbol]);
  const priceData = prices[symbol] ?? null;
  const marketStatus = useMarketStatus();

  const position = portfolio?.positions.find((p) => p.symbol === symbol);
  const displayPrice = priceData?.price ?? stock?.price ?? null;
  const displayChange = priceData?.changePercent ?? stock?.changePercent ?? null;
  const isPositive = displayChange !== null ? displayChange >= 0 : null;

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

  return (
    <AppShell>
      {/* Back navigation sub-header */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <Link href="/stocks" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors p-1 -ml-1 rounded-lg hover:bg-gray-800">
          <ChevronLeft size={18} />
          <span className="text-sm">Stocks</span>
        </Link>
        {position && (
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <History size={14} />
            <span>History</span>
          </button>
        )}
      </div>

      {/* Stock header */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto">
          {stockLoading ? (
            <div className="space-y-2">
              <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
            </div>
          ) : stockError ? (
            <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-900/40 rounded-xl px-4 py-3">
              <span className="text-amber-400 text-sm font-medium">Failed to load stock.</span>
              <button onClick={() => refetchStock()} className="text-xs text-blue-400 hover:text-blue-300 underline">Retry</button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="bg-blue-900 text-blue-300 px-2.5 py-1 rounded font-mono font-bold text-sm">
                    {symbol}
                  </span>
                  {stock?.name && (
                    <h1 className="text-lg sm:text-2xl font-bold">{stock.name}</h1>
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
                <p className={`text-2xl sm:text-3xl font-bold ${isPositive === true ? "text-emerald-400" : isPositive === false ? "text-red-400" : "text-white"}`}>
                  {displayPrice !== null ? fmtEGP(displayPrice) : "—"}
                </p>
                {displayChange !== null && isPositive !== null && (
                  <div className={`flex items-center justify-end gap-1 text-sm font-medium mt-0.5 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {isPositive ? "+" : "−"}{Math.abs(displayChange).toFixed(2)}%
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

      {/* Tab Bar */}
      <div className="border-b border-gray-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "technical", label: "Technical Analysis", icon: BarChart2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as "overview" | "technical")}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
        {activeTab === "technical" ? (
          <TechnicalAnalysisTab data={techData} isLoading={techLoading} symbol={symbol} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 cols */}
        <div className="lg:col-span-2 space-y-4">

          {/* AI Signal Analysis */}
          {aiSignal && (
            <div className="bg-gray-900 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">AI Analysis</h3>
                <span className="text-[10px] text-gray-600">
                  {aiSignal.source === "ai" ? "Powered by Gemini" : "Technical Analysis"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <SignalBadge
                  signal={aiSignal.signal}
                  reasons={aiSignal.reasons}
                  summary={aiSignal.summary}
                  confidence={aiSignal.confidence}
                  size="md"
                />
                <span className="text-gray-500 text-sm">{aiSignal.summary}</span>
              </div>
              {aiSignal.reasons.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-400">
                  {aiSignal.reasons.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
              {aiSignal.risks.length > 0 && (
                <div className="border-t border-gray-800 pt-2">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Risks</p>
                  <ul className="text-xs text-amber-400/80 space-y-0.5">
                    {aiSignal.risks.map((r, i) => (
                      <li key={i}>⚠ {r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiSignal.targetAction && (
                <div className="bg-gray-800/50 rounded-lg px-3 py-2 text-xs text-gray-300">
                  <span className="text-gray-500">Action: </span>{aiSignal.targetAction}
                </div>
              )}
            </div>
          )}
          {aiSignalLoading && (
            <div className="bg-gray-900 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-24 mb-3" />
              <div className="h-6 bg-gray-800 rounded w-32 mb-2" />
              <div className="space-y-1">
                <div className="h-3 bg-gray-800 rounded w-full" />
                <div className="h-3 bg-gray-800 rounded w-3/4" />
              </div>
            </div>
          )}

          {/* EgxPilot Signal cards */}
          {stock && (stock.signals?.daily || stock.signals?.weekly || stock.signals?.monthly || stock.recommendation) && (
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Daily Signal", value: stock.signals?.daily ?? stock.recommendation },
                { label: "Weekly Signal", value: stock.signals?.weekly },
                { label: "Monthly Signal", value: stock.signals?.monthly },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-gray-500 text-xs mb-2">{label}</p>
                  <SignalBadge signal={value} />
                </div>
              ))}
            </div>
          )}

          {/* Fundamentals */}
          {stock && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

              {stock.marketCap && (
                <InfoCard
                  label="Market Cap"
                  value={`EGP ${(stock.marketCap / 1e9).toFixed(2)}B`}
                />
              )}
              {stock.pe != null && <InfoCard label="P/E Ratio" value={Number(stock.pe).toFixed(2)} />}
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

            <div className="h-48 sm:h-72">
              {histLoading ? (
                <div className="h-full bg-gray-800 rounded animate-pulse" />
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-700 text-sm border border-dashed border-gray-800 rounded-lg">
                  No price history available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stockPriceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
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
                      width={66}
                      tickFormatter={(v) => fmtEGP(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12, padding: "8px 12px" }}
                      labelStyle={{ color: "#9ca3af" }}
                      itemStyle={{ color: chartColor }}
                      formatter={(v: unknown) => [fmtEGP((v as number) ?? 0), "Price"]}
                      cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={chartColor}
                      strokeWidth={2.5}
                      fill="url(#stockPriceGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: chartColor, stroke: "#111827", strokeWidth: 2 }}
                    />
                  </AreaChart>
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
                  value={`${position.pnl >= 0 ? "+" : "−"}${fmtEGP(Math.abs(position.pnl))} (${position.pnl >= 0 ? "+" : "−"}${Math.abs(position.pnlPercent).toFixed(2)}%)`}
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
        </div>
        )}
      </main>

      <TransactionHistoryDrawer
        symbol={symbol}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

    </AppShell>
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

// ─── Technical Analysis Tab ───────────────────────────────────────────────────

const ACTION_STYLES: Record<string, string> = {
  "Strong Buy": "bg-emerald-600 text-white",
  "Buy": "bg-emerald-900/60 text-emerald-300",
  "Neutral": "bg-gray-700 text-gray-300",
  "Sell": "bg-amber-900/60 text-amber-300",
  "Strong Sell": "bg-amber-700 text-white",
};

const TREND_COLOR: Record<string, string> = {
  uptrend: "text-emerald-400",
  downtrend: "text-amber-400",
  sideways: "text-gray-400",
};

const TREND_ARROW: Record<string, string> = {
  uptrend: "↑",
  downtrend: "↓",
  sideways: "→",
};

const ZONE_COLOR: Record<string, string> = {
  overbought: "text-amber-400",
  oversold: "text-emerald-400",
  neutral: "text-gray-400",
};

function TechnicalAnalysisTab({ data, isLoading, symbol }: { data: TechnicalData | undefined; isLoading: boolean; symbol: string }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Computing technical indicators...</p>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex items-center justify-center py-24 text-center">
        <div>
          <BarChart2 size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">{data?.error ?? "No technical data available"}</p>
          <p className="text-gray-600 text-sm mt-1">Price history data is still accumulating for {symbol}</p>
        </div>
      </div>
    );
  }

  const { indicators, trendAnalysis, supportResistance, overallSignal, priceHistory } = data;
  const score = overallSignal.score;
  const scoreWidth = Math.min(100, Math.max(0, (score + 100) / 2));

  // Prepare chart data
  const priceChartData = priceHistory.slice(-100).map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: p.price,
    sma20: p.sma20,
    sma50: p.sma50,
    bollingerUpper: p.bollingerUpper,
    bollingerLower: p.bollingerLower,
  }));

  const macdChartData = priceHistory.slice(-60).map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    macd: p.macdValue,
    signal: p.macdSignal,
    histogram: p.macdHistogram,
  }));

  const rsiChartData = priceHistory.slice(-60).map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    rsi: p.rsi,
  }));

  return (
    <div className="space-y-6 py-4">
      {/* Overall Signal Card */}
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Overall Signal</p>
            <div className={`inline-flex px-4 py-2 rounded-xl text-xl font-bold ${ACTION_STYLES[overallSignal.action] ?? "bg-gray-700 text-white"}`}>
              {overallSignal.action}
            </div>
            <p className="text-gray-500 text-sm mt-2">
              Confidence: <span className={`font-medium ${overallSignal.confidence === "High" ? "text-emerald-400" : overallSignal.confidence === "Medium" ? "text-amber-400" : "text-gray-400"}`}>
                {overallSignal.confidence}
              </span>
            </p>
          </div>
          <div className="flex-1 min-w-48">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Sell −100</span>
              <span className={`font-bold ${score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-gray-400"}`}>
                Score: {score > 0 ? "+" : score < 0 ? "−" : ""}{Math.abs(score)}
              </span>
              <span>Buy +100</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${score > 20 ? "bg-emerald-500" : score < -20 ? "bg-red-500" : "bg-amber-500"}`}
                style={{ width: `${scoreWidth}%` }}
              />
            </div>
            <div className="mt-3 space-y-1">
              {overallSignal.basis.map((b, i) => (
                <p key={i} className="text-xs text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> {b}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Indicator Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* RSI */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">RSI (14)</p>
          <p className="text-xl font-bold text-white">{indicators.rsi14.value?.toFixed(1) ?? "—"}</p>
          <span className={`text-xs font-medium ${ZONE_COLOR[indicators.rsi14.zone]}`}>
            {indicators.rsi14.zone.charAt(0).toUpperCase() + indicators.rsi14.zone.slice(1)}
          </span>
        </div>
        {/* MACD */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">MACD</p>
          <p className="text-xl font-bold text-white">{indicators.macd.value?.toFixed(2) ?? "—"}</p>
          <span className={`text-xs font-medium ${indicators.macd.trend === "bullish" ? "text-emerald-400" : indicators.macd.trend === "bearish" ? "text-amber-400" : "text-gray-400"}`}>
            {indicators.macd.trend.charAt(0).toUpperCase() + indicators.macd.trend.slice(1)}
          </span>
        </div>
        {/* Bollinger */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Bollinger %B</p>
          <p className="text-xl font-bold text-white">{indicators.bollingerBands.percentB?.toFixed(1) ?? "—"}%</p>
          <span className="text-xs text-gray-500">BW: {indicators.bollingerBands.bandwidth?.toFixed(1) ?? "—"}%</span>
        </div>
        {/* SMA20 gap */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">vs SMA20</p>
          <p className={`text-xl font-bold ${trendAnalysis.priceVsSma20 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trendAnalysis.priceVsSma20 >= 0 ? "+" : "−"}{Math.abs(trendAnalysis.priceVsSma20).toFixed(2)}%
          </p>
          <span className="text-xs text-gray-500">SMA: {fmtEGP(indicators.sma20 ?? 0)}</span>
        </div>
        {/* Momentum */}
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Momentum 20</p>
          <p className={`text-xl font-bold ${(indicators.momentum20 ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {indicators.momentum20 != null ? fmtEGP(indicators.momentum20) : "—"}
          </p>
          <span className="text-xs text-gray-500">ROC10: {indicators.roc10?.toFixed(2) ?? "—"}%</span>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">Trend Analysis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: "Short Term (SMA20)", trend: trendAnalysis.shortTerm },
            { label: "Medium Term (SMA50)", trend: trendAnalysis.mediumTerm },
            { label: "Long Term (SMA200)", trend: trendAnalysis.longTerm },
          ].map(({ label, trend }) => (
            <div key={label} className="flex sm:flex-col items-center sm:text-center justify-between bg-gray-800/40 sm:bg-transparent rounded-lg px-3 py-2 sm:p-0">
              <p className="text-gray-500 text-xs mb-2">{label}</p>
              <p className={`text-2xl font-bold ${TREND_COLOR[trend] ?? "text-gray-400"}`}>
                {TREND_ARROW[trend] ?? "?"} {" "}
                <span className="text-sm font-normal capitalize">{trend}</span>
              </p>
            </div>
          ))}
        </div>
        {(trendAnalysis.goldenCross || trendAnalysis.deathCross) && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${trendAnalysis.goldenCross ? "bg-emerald-900/20 border border-emerald-800/40" : "bg-amber-900/20 border border-amber-800/40"}`}>
            <span className="text-lg">{trendAnalysis.goldenCross ? "✨" : "💀"}</span>
            <p className={`text-sm font-medium ${trendAnalysis.goldenCross ? "text-emerald-400" : "text-amber-400"}`}>
              {trendAnalysis.goldenCross ? "Golden Cross" : "Death Cross"} — SMA50 recently crossed {trendAnalysis.goldenCross ? "above" : "below"} SMA200
            </p>
          </div>
        )}
      </div>

      {/* Price + SMA + Bollinger Chart */}
      {priceChartData.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Price + Moving Averages + Bollinger Bands</h3>
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={priceChartData} margin={{ top: 8, right: 56, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v, i) => (i % Math.ceil(priceChartData.length / 8) === 0 ? v : "")} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]} tickFormatter={(v) => fmtEGP(v)} width={72} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown, name: unknown) => [fmtEGP(v as number), name === "price" ? "Price" : name === "sma20" ? "SMA20" : name === "sma50" ? "SMA50" : name === "bollingerUpper" ? "BB Upper" : "BB Lower"]}
              />
              <Legend formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
              {/* Bollinger band fill */}
              <Area type="monotone" dataKey="bollingerUpper" stroke="#8b5cf640" fill="#8b5cf610" strokeWidth={1} dot={false} name="BB Upper" legendType="none" />
              <Area type="monotone" dataKey="bollingerLower" stroke="#8b5cf640" fill="#8b5cf610" strokeWidth={1} dot={false} name="BB Lower" legendType="none" />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="price"
                activeDot={{ r: 5, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.8} dot={false} strokeDasharray="5 4" name="sma20" />
              <Line type="monotone" dataKey="sma50" stroke="#10b981" strokeWidth={1.8} dot={false} strokeDasharray="7 3" name="sma50" />
              {/* Support/Resistance lines */}
              {supportResistance.supports.slice(0, 3).map((s, i) => (
                <ReferenceLine key={`s${i}`} y={s} stroke="#10b98160" strokeDasharray="3 3"
                  label={{ value: `S${i + 1}`, fill: "#10b981", fontSize: 9, position: "right" }} />
              ))}
              {supportResistance.resistances.slice(0, 3).map((r, i) => (
                <ReferenceLine key={`r${i}`} y={r} stroke="#ef444460" strokeDasharray="3 3"
                  label={{ value: `R${i + 1}`, fill: "#ef4444", fontSize: 9, position: "right" }} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-blue-500 inline-block" /> Price</span>
            <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-amber-400 inline-block" /> SMA20</span>
            <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-emerald-400 inline-block" /> SMA50</span>
            <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-purple-500 inline-block opacity-50" /> Bollinger Bands</span>
            <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-emerald-500 inline-block" /> Support</span>
            <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-orange-500 inline-block" /> Resistance</span>
          </div>
        </div>
      )}

      {/* MACD Chart */}
      {macdChartData.filter((d) => d.macd != null).length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">MACD (12, 26, 9)</h3>
          <p className="text-xs text-gray-600 mb-4">
            MACD: {indicators.macd.value?.toFixed(3) ?? "—"} &nbsp;|&nbsp;
            Signal: {indicators.macd.signal?.toFixed(3) ?? "—"} &nbsp;|&nbsp;
            Histogram: <span className={indicators.macd.histogram != null && indicators.macd.histogram >= 0 ? "text-emerald-400" : "text-orange-400"}>
              {indicators.macd.histogram?.toFixed(3) ?? "—"}
            </span>
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={macdChartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v, i) => (i % 10 === 0 ? v : "")} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#374151" />
              <Bar dataKey="histogram" name="Histogram" radius={[3, 3, 0, 0]}>
                {macdChartData.map((entry, i) => (
                  <Cell key={i} fill={(entry.histogram ?? 0) >= 0 ? "#10b981" : "#f97316"} fillOpacity={0.85} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
              <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={2} dot={false} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* RSI Chart */}
      {rsiChartData.filter((d) => d.rsi != null).length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">RSI (14)</h3>
          <p className="text-xs text-gray-600 mb-4">
            Current: <span className={`font-bold ${ZONE_COLOR[indicators.rsi14.zone]}`}>{indicators.rsi14.value?.toFixed(2) ?? "—"}</span>
            &nbsp;— Zone: <span className={ZONE_COLOR[indicators.rsi14.zone]}>{indicators.rsi14.zone}</span>
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={rsiChartData} margin={{ top: 8, right: 80, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v, i) => (i % 10 === 0 ? v : "")} />
              <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} tickCount={5} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                formatter={(v: unknown) => [(v as number).toFixed(2), "RSI"]} />
              <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: "Overbought (70)", fill: "#f59e0b", fontSize: 9, position: "right" }} />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 4"
                label={{ value: "Oversold (30)", fill: "#10b981", fontSize: 9, position: "right" }} />
              <Line type="monotone" dataKey="rsi" stroke="#a78bfa" strokeWidth={2.5} dot={false}
                activeDot={{ r: 5, fill: "#a78bfa", stroke: "#111827", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Support & Resistance */}
      {(supportResistance.supports.length > 0 || supportResistance.resistances.length > 0) && (
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Support & Resistance Levels</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-emerald-400 font-medium mb-2 uppercase tracking-wider">Support Levels</p>
              {supportResistance.supports.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                  <span className="text-xs text-gray-500">S{i + 1}</span>
                  <span className="text-sm font-mono font-medium text-emerald-400">{fmtEGP(s)}</span>
                  <span className="text-xs text-gray-600">
                    {data.currentPrice > 0 ? `${(((s - data.currentPrice) / data.currentPrice) * 100).toFixed(2)}%` : ""}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-orange-400 font-medium mb-2 uppercase tracking-wider">Resistance Levels</p>
              {supportResistance.resistances.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                  <span className="text-xs text-gray-500">R{i + 1}</span>
                  <span className="text-sm font-mono font-medium text-orange-400">{fmtEGP(r)}</span>
                  <span className="text-xs text-gray-600">
                    {data.currentPrice > 0 ? `+${(((r - data.currentPrice) / data.currentPrice) * 100).toFixed(2)}%` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All indicators summary table */}
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">All Indicators</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {[
            { label: "SMA 20", value: indicators.sma20 ? fmtEGP(indicators.sma20) : "—" },
            { label: "SMA 50", value: indicators.sma50 ? fmtEGP(indicators.sma50) : "—" },
            { label: "SMA 200", value: indicators.sma200 ? fmtEGP(indicators.sma200) : "—" },
            { label: "EMA 12", value: indicators.ema12 ? fmtEGP(indicators.ema12) : "—" },
            { label: "EMA 26", value: indicators.ema26 ? fmtEGP(indicators.ema26) : "—" },
            { label: "RSI 14", value: indicators.rsi14.value?.toFixed(2) ?? "—", badge: indicators.rsi14.zone, badgeColor: ZONE_COLOR[indicators.rsi14.zone] },
            { label: "MACD Value", value: indicators.macd.value?.toFixed(4) ?? "—" },
            { label: "MACD Signal", value: indicators.macd.signal?.toFixed(4) ?? "—" },
            { label: "MACD Histogram", value: indicators.macd.histogram?.toFixed(4) ?? "—" },
            { label: "BB Upper", value: indicators.bollingerBands.upper ? fmtEGP(indicators.bollingerBands.upper) : "—" },
            { label: "BB Middle (SMA20)", value: indicators.bollingerBands.middle ? fmtEGP(indicators.bollingerBands.middle) : "—" },
            { label: "BB Lower", value: indicators.bollingerBands.lower ? fmtEGP(indicators.bollingerBands.lower) : "—" },
            { label: "BB %B", value: indicators.bollingerBands.percentB?.toFixed(2) ?? "—", sub: "%" },
            { label: "BB Bandwidth", value: indicators.bollingerBands.bandwidth?.toFixed(2) ?? "—", sub: "%" },
            { label: "ROC 10", value: indicators.roc10?.toFixed(4) ?? "—" },
            { label: "Momentum 20", value: indicators.momentum20 ? fmtEGP(indicators.momentum20) : "—" },
          ].map(({ label, value, badge, badgeColor }) => (
            <div key={label} className="bg-gray-800 rounded-lg px-3 py-2">
              <p className="text-gray-500 mb-1">{label}</p>
              <p className="text-white font-mono font-medium">{value}</p>
              {badge && <span className={`text-xs ${badgeColor}`}>{badge}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
