"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  ChevronsUpDown,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";
import { useLanguage } from "@/context/LanguageContext";
import { usePriceStream } from "@/hooks/usePriceStream";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { DateRange } from "@/features/portfolio/components/TimelineChart";

const TimelineChart = dynamic(
  () => import("@/features/portfolio/components/TimelineChart"),
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
  // Feature 10 extended fields
  breakEvenPrice?: string | number;
  daysSinceFirstBuy?: number;
  totalFeesPaid?: string | number;
  portfolioContributionPct?: string | number;
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
  winRate?: string | number | null;
  totalFeesPaid?: string;
  netPnL?: string;
  avgHoldingDays?: number;
  symbolsTraded?: number;
}

interface TimelinePoint {
  timestamp: string;
  totalValue: string | number;
}

interface AllocationSlice { name: string; value: number; percentage: number; }
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
      if (Array.isArray(result)) return result as TimelinePoint[];
      const tl = (result as { timeline?: TimelinePoint[] })?.timeline;
      return Array.isArray(tl) ? tl : [];
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

interface ClosedPosition {
  symbol: string;
  isClosed: boolean;
  currentQty: string;
  totalBuyCost: string;
  totalProceeds: string;
  totalProfit: string;
  totalFees: string;
  returnPct: string | null;
  openDate: string | null;
  closeDate: string | null;
  lastSellDate: string | null;
  holdDays: number | null;
  buyCount: number;
  sellCount: number;
  winCount: number;
  lossCount: number;
}

interface RealizedGainRecord {
  id: string;
  symbol: string;
  quantity: string;
  sellPrice: string;
  avgPrice: string;
  profit: string;
  fees: string;
  returnPct: string | null;
  holdDays: number | null;
  date: string;
}

interface RealizedGainsSummary {
  totalProfit: string;
  totalFees: string;
  totalQuantity: string;
  totalCostBasis: string;
  totalReturn: string | null;
  uniqueSymbols: number;
  avgHoldDays: number | null;
  count: number;
  winCount: number;
  lossCount: number;
}

interface RealizedGainsResponse {
  gains: RealizedGainRecord[];
  summary: RealizedGainsSummary | null;
}

function useRealizedGains() {
  return useQuery<RealizedGainsResponse>({
    queryKey: ["portfolio", "realized-gains"],
    queryFn: () => apiClient.get<RealizedGainsResponse>("/api/portfolio/realized-gains"),
    retry: 1,
  });
}

function useClosedPositions() {
  return useQuery<ClosedPosition[]>({
    queryKey: ["portfolio", "closed-positions"],
    queryFn: () => apiClient.get<ClosedPosition[]>("/api/portfolio/closed-positions"),
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
    <div style={{ width: 110, height: 42, display: "inline-block" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 3, right: 3, left: 3, bottom: 3 }}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={isGreen ? "#34d399" : "#f87171"}
            strokeWidth={2}
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
  valueClass,
}: {
  label: string;
  value: string;
  positive?: boolean;
  sub?: string;
  valueClass?: string;
}) {
  const autoClass = positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400";
  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-4">
      <p className="text-gray-500 text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">{label}</p>
      <p className={`text-sm sm:text-xl font-bold truncate ${valueClass ?? autoClass}`}>
        {value}
      </p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function winRateClass(rate: number) {
  if (rate >= 60) return "text-emerald-400";
  if (rate >= 50) return "text-amber-400";
  return "text-orange-400";
}

function WinRateBadge({ positions, apiWinRate }: { positions: AnalyticsPosition[]; apiWinRate?: string | number | null }) {
  const { t } = useLanguage();

  // Prefer the API win rate (closed trades). API returns it as "65.3%" string or null.
  if (apiWinRate != null) {
    const rate = parseFloat(String(apiWinRate));
    if (!isNaN(rate)) {
      return (
        <StatCard
          label={t("portfolio.winRate")}
          value={`${rate.toFixed(1)}%`}
          valueClass={winRateClass(rate)}
        />
      );
    }
  }

  // Fallback: compute from open positions that have price data (skip null unrealizedPnL)
  const priced = positions.filter((p) => p.unrealizedPnL != null);
  const winning = priced.filter((p) => parseFloat(String(p.unrealizedPnL)) >= 0).length;
  const rate = priced.length > 0 ? (winning / priced.length) * 100 : 0;
  return (
    <StatCard
      label={t("portfolio.winRate")}
      value={priced.length > 0 ? `${rate.toFixed(0)}%` : "—"}
      valueClass={priced.length > 0 ? winRateClass(rate) : "text-gray-400"}
      sub={priced.length > 0 ? `${winning} / ${priced.length} ${t("analytics.positions")}` : undefined}
    />
  );
}

function HistoryRow({ tx }: { tx: StockTransaction }) {
  const { t } = useLanguage();
  const isBuy = tx.type === "BUY";
  const total = tx.total ?? tx.price * tx.quantity;
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className={`px-1.5 py-0.5 rounded text-xs font-bold ${
            isBuy
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-orange-900/50 text-orange-400"
          }`}
        >
          {tx.type}
        </span>
        <span className="text-gray-400">{tx.quantity} {t("dashboard.shares")}</span>
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
  const { t } = useLanguage();
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
        {t("portfolio.noTxHistory")}
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

// ─── Realized Gains Table ─────────────────────────────────────────────────────

type RGSortKey = "date" | "symbol" | "quantity" | "sellPrice" | "avgPrice" | "profit" | "returnPct" | "fees";
type RGFilter  = "all" | "wins" | "losses";
type RGPreset  = "newest" | "oldest" | "biggestWin" | "biggestLoss" | "bestReturn" | "worstReturn" | "mostShares" | "symbol" | null;

const RG_PRESETS: { id: RGPreset; label: string; key: RGSortKey; dir: "asc" | "desc"; filter: RGFilter; color: string }[] = [
  { id: "newest",      label: "Newest",       key: "date",      dir: "desc", filter: "all",    color: "text-blue-400 border-blue-800 bg-blue-950/40" },
  { id: "oldest",      label: "Oldest",       key: "date",      dir: "asc",  filter: "all",    color: "text-gray-400 border-gray-700 bg-gray-800/40" },
  { id: "biggestWin",  label: "Biggest Win",  key: "profit",    dir: "desc", filter: "wins",   color: "text-emerald-400 border-emerald-900 bg-emerald-950/40" },
  { id: "biggestLoss", label: "Biggest Loss", key: "profit",    dir: "asc",  filter: "losses", color: "text-red-400 border-red-900 bg-red-950/40" },
  { id: "bestReturn",  label: "Best Return",  key: "returnPct", dir: "desc", filter: "all",    color: "text-emerald-400 border-emerald-900 bg-emerald-950/40" },
  { id: "worstReturn", label: "Worst Return", key: "returnPct", dir: "asc",  filter: "all",    color: "text-orange-400 border-orange-900 bg-orange-950/40" },
  { id: "mostShares",  label: "Most Shares",  key: "quantity",  dir: "desc", filter: "all",    color: "text-purple-400 border-purple-900 bg-purple-950/40" },
  { id: "symbol",      label: "A → Z",        key: "symbol",    dir: "asc",  filter: "all",    color: "text-gray-400 border-gray-700 bg-gray-800/40" },
];

function RealizedGainsTable() {
  const { t } = useLanguage();
  const { data, isLoading } = useRealizedGains();
  const [sortKey, setSortKey] = useState<RGSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter]   = useState<RGFilter>("all");
  const [preset, setPreset]   = useState<RGPreset>("newest");

  function applyPreset(p: typeof RG_PRESETS[number]) {
    setSortKey(p.key);
    setSortDir(p.dir);
    setFilter(p.filter);
    setPreset(p.id);
  }

  function toggleSort(key: RGSortKey) {
    setPreset(null);
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const rows = data?.gains ?? [];
    if (filter === "wins")   return rows.filter((g) => parseFloat(g.profit) > 0);
    if (filter === "losses") return rows.filter((g) => parseFloat(g.profit) <= 0);
    return rows;
  }, [data, filter]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "symbol") {
        const cmp = a.symbol.localeCompare(b.symbol);
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "date") {
        av = new Date(a.date).getTime();
        bv = new Date(b.date).getTime();
      } else if (sortKey === "returnPct") {
        av = a.returnPct != null ? parseFloat(a.returnPct) : -Infinity;
        bv = b.returnPct != null ? parseFloat(b.returnPct) : -Infinity;
      } else {
        av = parseFloat(String(a[sortKey as keyof RealizedGainRecord] ?? "0"));
        bv = parseFloat(String(b[sortKey as keyof RealizedGainRecord] ?? "0"));
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  // Totals over the filtered set
  const filteredProfit = useMemo(
    () => sorted.reduce((s, g) => s + parseFloat(g.profit), 0),
    [sorted],
  );
  const filteredFees = useMemo(
    () => sorted.reduce((s, g) => s + parseFloat(g.fees), 0),
    [sorted],
  );

  function SortTh({ label, k }: { label: string; k: RGSortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="px-3 py-3 text-right cursor-pointer select-none whitespace-nowrap group"
        onClick={() => toggleSort(k)}
      >
        <span className={`inline-flex items-center gap-1 ${active && !preset ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"}`}>
          {label}
          {active && !preset
            ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
            : <ChevronsUpDown size={12} className="opacity-40" />}
        </span>
      </th>
    );
  }

  const summary = data?.summary;
  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 flex justify-center py-8">
        <Loader2 className="animate-spin text-gray-500" size={20} />
      </div>
    );
  }
  if (!summary || summary.count === 0) return null;

  const totalProfit = parseFloat(summary.totalProfit);
  const isWin = totalProfit >= 0;
  const filteredIsWin = filteredProfit >= 0;

  const totalReturn = summary.totalReturn != null ? parseFloat(summary.totalReturn) : null;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
              {t("portfolio.realizedPnl")} — {t("realized.allTrades")}
            </h2>
            <p className="text-gray-600 text-xs mt-0.5">
              {summary.count} {t("realized.trades")} · {summary.winCount}W / {summary.lossCount}L
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-gray-500 text-xs">{t("common.profit")}</p>
              <p className={`text-sm font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                {isWin ? "+" : "−"}{fmt(Math.abs(totalProfit))}
              </p>
            </div>
          </div>
        </div>
        {/* Summary stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-gray-500 text-xs mb-0.5">Total Return</p>
            <p className={`text-sm font-bold ${totalReturn == null ? "text-gray-400" : totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalReturn != null ? `${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(2)}%` : "—"}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-gray-500 text-xs mb-0.5">Total Shares</p>
            <p className="text-sm font-bold text-white">
              {parseFloat(summary.totalQuantity).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-gray-500 text-xs mb-0.5">Avg Hold Days</p>
            <p className="text-sm font-bold text-white">
              {summary.avgHoldDays != null ? `${summary.avgHoldDays}d` : "—"}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg px-3 py-2">
            <p className="text-gray-500 text-xs mb-0.5">Positions</p>
            <p className="text-sm font-bold text-white">{summary.uniqueSymbols}</p>
          </div>
        </div>
      </div>

      {/* Quick-sort preset chips */}
      <div className="px-4 py-2.5 border-b border-gray-800 flex flex-wrap gap-1.5">
        {RG_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${
              preset === p.id
                ? p.color
                : "text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
        {/* Wins / Losses filter toggles */}
        <div className="ml-auto flex gap-1">
          {(["all", "wins", "losses"] as RGFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPreset(null); }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                filter === f && preset === null
                  ? f === "wins"   ? "text-emerald-400 border-emerald-800 bg-emerald-950/40"
                  : f === "losses" ? "text-red-400 border-red-800 bg-red-950/40"
                                   : "text-white border-gray-600 bg-gray-800"
                  : "text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              {f === "all" ? "All" : f === "wins" ? `Wins (${summary.winCount})` : `Losses (${summary.lossCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left px-3 py-3 cursor-pointer select-none group whitespace-nowrap" onClick={() => toggleSort("symbol")}>
              <span className={`inline-flex items-center gap-1 ${sortKey === "symbol" && !preset ? "text-blue-400" : "text-gray-500 group-hover:text-gray-300"}`}>
                {t("common.symbol")}
                {sortKey === "symbol" && !preset
                  ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
                  : <ChevronsUpDown size={12} className="opacity-40" />}
              </span>
            </th>
            <SortTh label={t("tx.date")} k="date" />
            <SortTh label={t("dashboard.shares")} k="quantity" />
            <SortTh label={t("common.avgCost")} k="avgPrice" />
            <SortTh label={t("pos.sellPrice")} k="sellPrice" />
            <SortTh label={t("common.profit")} k="profit" />
            <SortTh label={t("common.return")} k="returnPct" />
            <SortTh label={t("closed.fees")} k="fees" />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-gray-600 text-xs">
                No trades match this filter.
              </td>
            </tr>
          ) : sorted.map((g) => {
            const profit = parseFloat(g.profit);
            const win = profit >= 0;
            const retPct = g.returnPct != null ? parseFloat(g.returnPct) : null;
            return (
              <tr key={g.id} className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-bold text-white font-mono text-xs">{g.symbol}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500 text-xs whitespace-nowrap">
                  {new Date(g.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-300 text-xs">{parseFloat(g.quantity).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{fmt(parseFloat(g.avgPrice))}</td>
                <td className="px-3 py-2.5 text-right text-gray-300 text-xs">{fmt(parseFloat(g.sellPrice))}</td>
                <td className={`px-3 py-2.5 text-right font-bold text-xs ${win ? "text-emerald-400" : "text-red-400"}`}>
                  {win ? "+" : "−"}{fmt(Math.abs(profit))}
                </td>
                <td className={`px-3 py-2.5 text-right text-xs font-medium ${win ? "text-emerald-400" : "text-red-400"}`}>
                  {retPct != null ? `${retPct >= 0 ? "+" : "−"}${Math.abs(retPct).toFixed(2)}%` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{fmt(parseFloat(g.fees))}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-700 bg-gray-800/30">
            <td colSpan={5} className="px-3 py-2.5 text-gray-500 text-xs font-semibold uppercase tracking-wide">
              {t("common.total")} {filter !== "all" && <span className="text-gray-600 normal-case font-normal">({sorted.length} shown)</span>}
            </td>
            <td className={`px-3 py-2.5 text-right font-bold text-xs ${filteredIsWin ? "text-emerald-400" : "text-red-400"}`}>
              {filteredIsWin ? "+" : "−"}{fmt(Math.abs(filteredProfit))}
            </td>
            <td className="px-3 py-2.5" />
            <td className="px-3 py-2.5 text-right text-gray-400 text-xs font-medium">{fmt(filteredFees)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { t } = useLanguage();
  const [range, setRange] = useState<DateRange>("1M");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const { data: portfolio, isLoading, isError } = usePortfolio();
  const { data: analytics } = useAnalytics();
  const { data: timeline, isLoading: timelineLoading } = useTimeline(range);
  const { data: allocation } = useAllocation();
  const { data: closedPositions = [] } = useClosedPositions();

  const positionSymbols = (portfolio?.positions ?? []).map((p) => p.symbol);
  const { prices } = usePriceStream(positionSymbols);

  // Fallback timeline: build from positions' graphData when the timeline API
  // returns < 2 points (e.g. stockPriceHistory not yet populated for this range)
  const graphDataTimeline = useMemo(() => {
    if (!analytics?.positions?.length) return [];
    const { from, to } = rangeToFromTo(range);
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to + "T23:59:59Z").getTime();
    const byTs = new Map<string, number>();
    for (const pos of analytics.positions) {
      const qty = Number(pos.totalQuantity);
      if (qty === 0) continue;
      for (const g of pos.graphData ?? []) {
        const ms = new Date(String(g.timestamp)).getTime();
        if (isNaN(ms) || ms < fromMs || ms > toMs) continue;
        byTs.set(String(g.timestamp), (byTs.get(String(g.timestamp)) ?? 0) + Number(g.price) * qty);
      }
    }
    // Always add current prices as the "now" data point so the chart has ≥ 2 points
    const nowKey = new Date().toISOString();
    if (!byTs.has(nowKey)) {
      const currentTotal = analytics.positions.reduce((sum, pos) => {
        const qty = Number(pos.totalQuantity);
        if (qty === 0 || pos.currentPrice == null) return sum;
        return sum + pos.currentPrice * qty;
      }, 0);
      if (currentTotal > 0) byTs.set(nowKey, currentTotal);
    }
    return Array.from(byTs.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, totalValue]) => ({ timestamp, totalValue }));
  }, [analytics, range]);

  const effectiveTimeline = (timeline && timeline.length >= 2) ? timeline : graphDataTimeline;

  const analyticsMap = useMemo(
    () =>
      new Map(
        (analytics?.positions ?? []).map((p) => [p.symbol, p])
      ),
    [analytics]
  );

  const filteredPositions = portfolio?.positions ?? [];

  // Summary values
  const pv = analytics?.portfolioValue;
  const totalInvested = pv
    ? parseFloat(String(pv.totalInvested))
    : (portfolio?.totalValue ?? 0);
  const unrealized = pv
    ? parseFloat(String(pv.totalUnrealized))
    : (portfolio?.totalPnl ?? 0);
  const realized = pv && pv.totalRealized != null ? parseFloat(String(pv.totalRealized)) : null;
  const totalPnl = pv
    ? parseFloat(String(pv.totalPnL))
    : (portfolio?.totalPnl ?? 0);

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={t("portfolio.totalInvested")}
            value={`EGP ${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <StatCard
            label={t("portfolio.unrealizedPnl")}
            value={`${unrealized >= 0 ? "+" : "−"}EGP ${Math.abs(unrealized).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            positive={unrealized >= 0}
          />
          <StatCard
            label={realized !== null ? t("portfolio.realizedPnl") : t("portfolio.totalPnl")}
            value={`${(realized ?? totalPnl) >= 0 ? "+" : "−"}EGP ${Math.abs(realized ?? totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            positive={(realized ?? totalPnl) >= 0}
          />
          {analytics?.positions && analytics.positions.length > 0 ? (
            <WinRateBadge positions={analytics.positions} apiWinRate={analytics.winRate} />
          ) : (
            <StatCard
              label={t("portfolio.totalPnl")}
              value={`${totalPnl >= 0 ? "+" : "−"}EGP ${Math.abs(totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              positive={totalPnl >= 0}
            />
          )}
        </div>

        {/* Fee / net P&L / holding stats */}
        {analytics && (analytics.totalFeesPaid !== undefined || analytics.netPnL !== undefined || analytics.avgHoldingDays !== undefined || analytics.symbolsTraded !== undefined) && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {analytics.totalFeesPaid !== undefined && (
              <StatCard
                label={t("portfolio.totalFees")}
                value={`EGP ${parseFloat(analytics.totalFeesPaid).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              />
            )}
            {analytics.netPnL !== undefined && (
              <StatCard
                label={t("portfolio.netPnl")}
                value={`${parseFloat(analytics.netPnL) >= 0 ? "+" : "−"}EGP ${Math.abs(parseFloat(analytics.netPnL)).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                positive={parseFloat(analytics.netPnL) >= 0}
              />
            )}
            {analytics.avgHoldingDays !== undefined && (
              <StatCard
                label={t("portfolio.avgHold")}
                value={`${analytics.avgHoldingDays.toFixed(1)} ${t("common.days")}`}
              />
            )}
            {analytics.symbolsTraded !== undefined && (
              <StatCard
                label={t("portfolio.symbolsTraded")}
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
          data={effectiveTimeline}
          range={range}
          onRangeChange={setRange}
          loading={timelineLoading}
        />

        {/* Portfolio Weight by Symbol */}
        {allocation && allocation.bySymbol.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <div>
              <h2 className="text-white font-semibold text-sm">{t("analytics.symbolAlloc")}</h2>
              <p className="text-gray-500 text-xs mt-0.5">{t("analytics.symbolAllocSub")}</p>
            </div>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={Math.max(140, allocation.bySymbol.length * 36)}>
                <BarChart
                  data={allocation.bySymbol}
                  layout="vertical"
                  margin={{ top: 4, right: 56, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown, _: unknown, props: { payload?: { value?: number; percentage?: number } }) => [
                      `${(props.payload?.percentage ?? (v as number)).toFixed(1)}%  ·  EGP ${((props.payload?.value ?? 0) / 1000).toFixed(1)}k`,
                      t("analytics.symbolAlloc"),
                    ]}
                  />
                  <Bar dataKey="percentage" radius={[0, 3, 3, 0]}>
                    {allocation.bySymbol.map((_, i) => (
                      <Cell key={i} fill={["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#a78bfa"][i % 10]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Positions table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-wrap gap-2">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
              {t("portfolio.positions")}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-xs">
                {filteredPositions.length} {filteredPositions.length !== 1 ? t("portfolio.positionPlural") : t("portfolio.positionSingular")}
              </span>
              <Link href="/portfolio/transactions" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                {t("common.allTx")}
              </Link>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-gray-500" size={24} />
            </div>
          )}

          {isError && (
            <div className="text-center py-12 text-amber-400 text-sm">
              {t("portfolio.failed")}
            </div>
          )}

          {!isLoading && !isError && filteredPositions.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              {t("portfolio.noPositions")}
            </div>
          )}

          {!isLoading && filteredPositions.length > 0 && (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-3 sm:px-4 py-3">{t("common.symbol")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden sm:table-cell">{t("common.qty")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden md:table-cell">{t("common.avgCost")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden sm:table-cell">{t("common.currentPrice")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden md:table-cell">{t("common.marketValue")}</th>
                  <th className="text-right px-3 sm:px-4 py-3">{t("portfolio.unrealizedPnl")}</th>
                  <th className="text-right px-3 sm:px-4 py-3">{t("common.return")}</th>
                  <th className="text-center px-3 sm:px-4 py-3 hidden lg:table-cell">{t("portfolio.breakEven")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden xl:table-cell">{t("common.days")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden xl:table-cell">{t("common.fees")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden xl:table-cell">{t("portfolio.portfolioPct")}</th>
                  <th className="text-center px-3 sm:px-4 py-3 hidden lg:table-cell">{t("portfolio.30d")}</th>
                  <th className="text-center px-3 sm:px-4 py-3">{t("common.details")}</th>
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

                  // Feature 10 advanced metrics
                  const breakEven = ap?.breakEvenPrice != null ? parseFloat(String(ap.breakEvenPrice)) : avgCost;
                  const beGap = breakEven > 0 ? ((currentPrice - breakEven) / breakEven) * 100 : null;
                  const daysHeld = ap?.daysSinceFirstBuy ?? null;
                  const feesPaid = ap?.totalFeesPaid != null ? parseFloat(String(ap.totalFeesPaid)) : null;
                  const portPct = ap?.portfolioContributionPct != null ? parseFloat(String(ap.portfolioContributionPct)) : null;

                  return (
                    <React.Fragment key={pos.symbol}>
                      <tr
                        className="td-row border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                        onClick={() =>
                          setExpandedSymbol(isExpanded ? null : pos.symbol)
                        }
                      >
                        <td className="px-3 sm:px-4 py-3 font-bold text-white">
                          <Link
                            href={`/stocks/${pos.symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-400 transition-colors"
                          >
                            {pos.symbol}
                          </Link>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right text-gray-300 hidden sm:table-cell">
                          {qty}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right text-gray-300 hidden md:table-cell">
                          {fmt(avgCost)}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right text-white font-medium hidden sm:table-cell">
                          {fmt(currentPrice)}
                          {live && (
                            <span className="block text-xs text-emerald-500 font-normal">
                              {t("portfolio.live")}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right text-white hidden md:table-cell">
                          {fmt(marketValue)}
                        </td>
                        <td
                          className={`px-3 sm:px-4 py-3 text-right font-medium ${
                            isPos ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          <span className="flex items-center justify-end gap-0.5 sm:gap-1">
                            {isPos ? (
                              <TrendingUp size={12} className="hidden sm:block" />
                            ) : (
                              <TrendingDown size={12} className="hidden sm:block" />
                            )}
                            {isPos ? "+" : "−"}
                            {fmt(Math.abs(pnl))}
                          </span>
                        </td>
                        <td
                          className={`px-3 sm:px-4 py-3 text-right font-medium ${
                            isPos ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPos ? "+" : "−"}
                          {pnlPct.toFixed(2)}%
                        </td>
                        {/* Feature 6: Break-even gauge */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${beGap != null && beGap >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                                style={{ width: `${Math.min(100, Math.max(0, 50 + (beGap ?? 0) * 2))}%` }}
                              />
                            </div>
                            {beGap != null && (
                              <span className={`text-[10px] ${beGap >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {beGap >= 0 ? "+" : "−"}{Math.abs(beGap).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Feature 10: Days held */}
                        <td className="px-4 py-3 text-right text-gray-400 text-xs hidden xl:table-cell">
                          {daysHeld != null ? `${daysHeld}d` : "—"}
                        </td>
                        {/* Feature 10: Fees paid */}
                        <td className="px-4 py-3 text-right text-gray-400 text-xs hidden xl:table-cell">
                          {feesPaid != null ? fmt(feesPaid) : "—"}
                        </td>
                        {/* Feature 10: Portfolio % */}
                        <td className="px-4 py-3 text-right text-gray-400 text-xs hidden xl:table-cell">
                          {portPct != null ? `${portPct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <Sparkline symbol={pos.symbol} />
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/portfolio/positions/${pos.symbol}`} className="text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap">
                            {t("portfolio.details")}
                          </Link>
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
                        <tr className="bg-gray-800/30">
                          <td colSpan={13} className="px-6 py-3">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">
                              {t("portfolio.txHistoryFor")} {pos.symbol}
                            </p>
                            <ExpandedHistory symbol={pos.symbol} />
                            <Link href={`/portfolio/positions/${pos.symbol}`} className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block">
                              {t("portfolio.fullDetails")}
                            </Link>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* ── Closed Positions ─────────────────────────────────────── */}
        {closedPositions.length > 0 && (
          <div className="space-y-4">
            {/* P&L bar chart */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <div>
                <h2 className="text-white font-semibold text-sm">{t("closed.sectionTitle")}</h2>
                <p className="text-gray-500 text-xs mt-0.5">{t("closed.sectionSub")}</p>
              </div>
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={Math.max(120, closedPositions.length * 42)}>
                  <BarChart
                    data={closedPositions.map((p) => ({
                      symbol: p.symbol,
                      profit: parseFloat(p.totalProfit),
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 72, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `EGP ${(Math.abs(v as number) / 1000).toFixed(1)}k`} />
                    <YAxis type="category" dataKey="symbol" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: unknown) => [
                        `EGP ${(v as number).toLocaleString("en-EG", { minimumFractionDigits: 2 })}`,
                        t("common.profit"),
                      ]}
                    />
                    <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                      {closedPositions.map((p, i) => (
                        <Cell key={i} fill={parseFloat(p.totalProfit) >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Closed Positions Table */}
            <div className="bg-gray-900 rounded-xl overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">{t("closed.tableTitle")}</h2>
                <span className="text-gray-600 text-xs">{closedPositions.length} {t("closed.symbols")}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left px-4 py-3">{t("common.symbol")}</th>
                    <th className="text-right px-4 py-3">{t("closed.invested")}</th>
                    <th className="text-right px-4 py-3">{t("closed.proceeds")}</th>
                    <th className="text-right px-4 py-3">{t("common.profit")}</th>
                    <th className="text-right px-4 py-3">{t("common.return")}</th>
                    <th className="text-right px-4 py-3 hidden md:table-cell">{t("closed.fees")}</th>
                    <th className="text-right px-4 py-3 hidden lg:table-cell">{t("closed.holdDays")}</th>
                    <th className="text-center px-4 py-3 hidden lg:table-cell">{t("closed.winLoss")}</th>
                    <th className="text-right px-4 py-3 hidden xl:table-cell">{t("closed.openDate")}</th>
                    <th className="text-right px-4 py-3 hidden xl:table-cell">{t("closed.closeDate")}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {closedPositions.map((cp) => {
                    const profit = parseFloat(cp.totalProfit);
                    const isWin = profit >= 0;
                    const retPct = cp.returnPct != null ? parseFloat(cp.returnPct) : null;
                    const displayDate = cp.isClosed ? cp.closeDate : cp.lastSellDate;
                    return (
                      <tr key={cp.symbol} className="td-row border-b border-gray-800/60">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-white font-mono">{cp.symbol}</span>
                            {cp.isClosed
                              ? <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Closed</span>
                              : <span className="text-[10px] text-amber-500 font-medium uppercase tracking-wide">Partial</span>
                            }
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">{fmt(cp.totalBuyCost)}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{fmt(cp.totalProceeds)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                          {isWin ? "+" : "−"}{fmt(Math.abs(profit))}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                          {retPct != null ? `${retPct >= 0 ? "+" : "−"}${Math.abs(retPct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs hidden md:table-cell">{fmt(cp.totalFees)}</td>
                        <td className="px-4 py-3 text-right text-gray-400 text-xs hidden lg:table-cell">
                          {cp.holdDays != null ? `${cp.holdDays}d` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-emerald-400 text-xs font-medium">{cp.winCount}W</span>
                          <span className="text-gray-600 mx-1">/</span>
                          <span className="text-orange-400 text-xs font-medium">{cp.lossCount}L</span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs hidden xl:table-cell">
                          {cp.openDate ? new Date(cp.openDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs hidden xl:table-cell">
                          {displayDate ? new Date(displayDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/portfolio/positions/${cp.symbol}`} className="text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap">
                            {t("portfolio.details")}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Realized P&L Detail Table ─────────────────────────── */}
        <RealizedGainsTable />
      </main>
    </AppShell>
  );
}
