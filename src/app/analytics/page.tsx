"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, BarChart2, Loader2, AlertCircle,
  Target, Clock, DollarSign, Award, Activity, Zap, ChevronDown, ChevronUp,
  AlertTriangle, Info, CheckCircle, Shield, Calendar, ArrowRight,
  Trophy, Sparkles, MinusCircle, XCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, Legend, ReferenceLine,
  PieChart, Pie, ScatterChart, Scatter, ZAxis, Area, AreaChart,
  LabelList,
} from "recharts";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import RangeSelector from "@/components/RangeSelector";
import type { DateRange } from "@/features/portfolio/components/TimelineChart";
import { useLanguage } from "@/context/LanguageContext";

type ExtendedRange = DateRange | "ALL";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsPosition {
  symbol: string;
  totalQuantity: string | number;
  averagePrice: string | number;
  totalInvested: string | number;
  currentPrice: number | null;
  unrealizedPnL: string | number;
  realizedPnL: string | number;
  returnPercent?: string | number;
  daysSinceFirstBuy?: number;
  graphData?: Array<{ price: string; timestamp: string }>;
}

interface AnalyticsTransaction {
  symbol: string;
  type: "BUY" | "SELL";
  quantity: string;
  price: string;
  fees: string;
  date: string;
}

interface Analytics {
  positions: AnalyticsPosition[];
  portfolioValue: {
    totalInvested: string | number;
    totalRealized: string | number;
    totalUnrealized: string | number;
    totalPnL: string | number;
  };
  bestPerformer?: { symbol: string; unrealizedPnL: string; returnPercent: number } | null;
  worstPerformer?: { symbol: string; unrealizedPnL: string; returnPercent: number } | null;
  winRate?: string | number | null;
  totalFeesPaid?: string;
  netPnL?: string;
  avgHoldingDays?: number;
  symbolsTraded?: number;
  transactions?: AnalyticsTransaction[];
  priceHistory?: Record<string, { price: string; timestamp: string }[]>;
}

interface TimelinePoint { timestamp: string; totalValue: number; }

interface StockTransaction {
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: string;
  total?: number;
}

interface StockHistoryResponse {
  transactions: StockTransaction[];
  summary?: { totalBought?: number; totalSold?: number; netFlow?: number };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

import { useAssetType, withAssetType } from "@/store/useTradingMode";

function useAnalytics() {
  const to = new Date().toISOString().slice(0, 10);
  const assetType = useAssetType();
  return useQuery<Analytics | null>({
    queryKey: ["portfolio", "analytics", "ALL", assetType],
    queryFn: () => apiClient.get<Analytics | null>(withAssetType(`/api/portfolio/analytics?from=2000-01-01&to=${to}`, assetType)),
    retry: 1,
    staleTime: 60_000,
  });
}

function useTimeline() {
  const to = new Date().toISOString().slice(0, 10);
  const assetType = useAssetType();
  return useQuery<TimelinePoint[]>({
    queryKey: ["portfolio", "timeline", "ALL", assetType],
    queryFn: async () => {
      const r = await apiClient.get<unknown>(withAssetType(`/api/portfolio/timeline?from=2000-01-01&to=${to}`, assetType));
      if (Array.isArray(r)) return r as TimelinePoint[];
      const tl = (r as { timeline?: TimelinePoint[] })?.timeline;
      return Array.isArray(tl) ? tl : [];
    },
    retry: 1,
    staleTime: 60_000,
  });
}

function useStockHistory(symbol: string | null) {
  const assetType = useAssetType();
  return useQuery<StockHistoryResponse>({
    queryKey: ["portfolio", "stock-history", symbol, assetType],
    queryFn: () =>
      apiClient.get<StockHistoryResponse>(withAssetType(`/api/portfolio/stock/${symbol}/history`, assetType)),
    enabled: !!symbol,
    retry: 1,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEGP = (v: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(v);

const fmtSignedEGP = (v: number) => {
  const abs = new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(Math.abs(v));
  return v > 0 ? `+${abs}` : v < 0 ? `−${abs}` : abs;
};

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;

const RANGES: ExtendedRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

function rangeCutoffMs(range: ExtendedRange): number {
  return range === "ALL" ? 0 : Date.now() - (RANGE_DAYS[range] ?? 30) * 86400000;
}

function SectionRangeBtns({ range, setRange }: { range: ExtendedRange; setRange: (r: ExtendedRange) => void }) {
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button key={r} onClick={() => setRange(r)}
          className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${
            range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}>{r}</button>
      ))}
    </div>
  );
}

/**
 * Reconstructs positions from transactions for a given date range.
 * When range is "ALL", returns current positions as-is.
 * Otherwise, replays BUY/SELL transactions up to `toDate` and uses historical prices
 * to compute what the portfolio looked like at that time.
 */
function reconstructPositionsForRange(
  analytics: Analytics | null,
  range: ExtendedRange,
): ReturnType<typeof computeCurrentPositions> {
  if (!analytics) return [];
  const txs = analytics.transactions ?? [];
  const hasCurrent = analytics.positions.length > 0;

  // For "ALL" with active current positions, use the API-provided current snapshot
  // (it has live prices). When the user has no current positions but has past activity,
  // fall through to the full replay with cutoff=0 so they can still see their history.
  if (range === "ALL" && hasCurrent) return computeCurrentPositions(analytics.positions);
  if (txs.length === 0) return computeCurrentPositions(analytics.positions);

  const priceHistory = analytics.priceHistory ?? {};
  const cutoff = range === "ALL" ? 0 : rangeCutoffMs(range);
  const now = Date.now();

  // Sort ascending so posAtStart's `break at cutoff` is correct
  const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Replay transactions up to now to build positions that existed during the range
  const posMap = new Map<string, { qty: number; totalCost: number; firstBuyDate: number }>();
  const realizedMap = new Map<string, number>();
  // Track buys that occurred WITHIN the range — used as fallback for invested/qty when position was bought-and-sold in range
  const boughtInRangeMap = new Map<string, { qty: number; cost: number }>();

  for (const tx of sortedTxs) {
    const txMs = new Date(tx.date).getTime();
    if (txMs > now) continue;
    const qty = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);

    if (tx.type === "BUY") {
      const existing = posMap.get(tx.symbol) ?? { qty: 0, totalCost: 0, firstBuyDate: txMs };
      existing.qty += qty;
      existing.totalCost += qty * price;
      if (txMs < existing.firstBuyDate) existing.firstBuyDate = txMs;
      posMap.set(tx.symbol, existing);
      if (txMs >= cutoff) {
        const bir = boughtInRangeMap.get(tx.symbol) ?? { qty: 0, cost: 0 };
        bir.qty += qty;
        bir.cost += qty * price;
        boughtInRangeMap.set(tx.symbol, bir);
      }
    } else {
      const existing = posMap.get(tx.symbol);
      if (existing && existing.qty > 0) {
        const avgCost = existing.totalCost / existing.qty;
        const profit = (price - avgCost) * qty;
        // Only count realized gains within the range
        if (txMs >= cutoff) {
          realizedMap.set(tx.symbol, (realizedMap.get(tx.symbol) ?? 0) + profit);
        }
        existing.qty -= qty;
        existing.totalCost = existing.qty * avgCost;
        if (existing.qty <= 0.0001) { existing.qty = 0; existing.totalCost = 0; }
        posMap.set(tx.symbol, existing);
      }
    }
  }

  // Also replay up to the START of the range to know what existed then
  const posAtStart = new Map<string, { qty: number; totalCost: number }>();
  for (const tx of sortedTxs) {
    const txMs = new Date(tx.date).getTime();
    if (txMs >= cutoff) break;
    const qty = parseFloat(tx.quantity);
    const price = parseFloat(tx.price);
    if (tx.type === "BUY") {
      const existing = posAtStart.get(tx.symbol) ?? { qty: 0, totalCost: 0 };
      existing.qty += qty;
      existing.totalCost += qty * price;
      posAtStart.set(tx.symbol, existing);
    } else {
      const existing = posAtStart.get(tx.symbol);
      if (existing && existing.qty > 0) {
        const avgCost = existing.totalCost / existing.qty;
        existing.qty -= qty;
        existing.totalCost = existing.qty * avgCost;
        if (existing.qty <= 0.0001) { existing.qty = 0; existing.totalCost = 0; }
        posAtStart.set(tx.symbol, existing);
      }
    }
  }

  // Include symbols that had positions during the range (either at start or traded during)
  const relevantSymbols = new Set<string>();
  for (const tx of sortedTxs) {
    const txMs = new Date(tx.date).getTime();
    if (txMs >= cutoff && txMs <= now) relevantSymbols.add(tx.symbol);
  }
  for (const [sym, pos] of posAtStart) {
    if (pos.qty > 0) relevantSymbols.add(sym);
  }
  for (const [sym, pos] of posMap) {
    if (pos.qty > 0) relevantSymbols.add(sym);
  }

  // Current positions map for live prices
  const currentPosMap = new Map(analytics.positions.map(p => [p.symbol, p]));

  // Get historical price at start of range for each symbol
  function getPriceAt(symbol: string, targetMs: number): number | null {
    const ph = priceHistory[symbol];
    if (!ph || ph.length === 0) return null;
    let closest: { price: string; timestamp: string } | null = null;
    for (const p of ph) {
      const pMs = new Date(p.timestamp).getTime();
      if (pMs <= targetMs) closest = p;
      else break;
    }
    return closest ? parseFloat(closest.price) : null;
  }

  const results: { symbol: string; returnPct: number; unrealizedNum: number; realizedNum: number; investedNum: number;
    currentPrice: number | null; totalQuantity: string | number; averagePrice: string | number;
    totalInvested: string | number; unrealizedPnL: string | number; realizedPnL: string | number;
    returnPercent?: string | number; daysSinceFirstBuy?: number; graphData?: { price: string; timestamp: string }[];
  }[] = [];

  for (const symbol of relevantSymbols) {
    const currentPos = posMap.get(symbol);
    const startPos = posAtStart.get(symbol);
    const analyticPos = currentPosMap.get(symbol);
    const currentQty = currentPos?.qty ?? 0;
    const startQty = startPos?.qty ?? 0;
    const realized = realizedMap.get(symbol) ?? 0;
    const boughtInRange = boughtInRangeMap.get(symbol);

    // Get prices
    const livePrice = analyticPos?.currentPrice ?? getPriceAt(symbol, now);
    const startPrice = getPriceAt(symbol, cutoff);
    // Avg cost: prefer current weighted avg; if fully closed in range, use weighted avg of buys-in-range; if held entering range, use start's weighted avg
    const avgCost = currentQty > 0 && currentPos
      ? currentPos.totalCost / currentPos.qty
      : startPos && startPos.qty > 0
        ? startPos.totalCost / startPos.qty
        : boughtInRange && boughtInRange.qty > 0 ? boughtInRange.cost / boughtInRange.qty : 0;
    // Invested: still-held → current cost, opened-before-range → start cost, bought-and-sold-in-range → buys-in-range cost
    const invested = currentQty > 0
      ? currentPos!.totalCost
      : startPos && startPos.qty > 0
        ? startPos.totalCost
        : boughtInRange?.cost ?? 0;

    // Display qty: still-held → current; entered range with shares → start qty; bought-in-range only → bought qty
    const displayQty = currentQty > 0 ? currentQty : (startQty > 0 ? startQty : (boughtInRange?.qty ?? 0));
    const isClosed = currentQty <= 0.0001 && displayQty > 0;

    // Unrealized P&L: change in value of shares held during this period
    let unrealized = 0;
    if (currentQty > 0 && livePrice != null) {
      if (startPrice != null && startQty > 0) {
        // Shares held from start: value change = (livePrice - startPrice) * min(startQty, currentQty)
        const heldThrough = Math.min(startQty, currentQty);
        unrealized = (livePrice - startPrice) * heldThrough;
        // New shares bought during period: unrealized from avg cost
        const newShares = currentQty - heldThrough;
        if (newShares > 0) unrealized += (livePrice - avgCost) * newShares;
      } else {
        unrealized = (livePrice - avgCost) * currentQty;
      }
    }

    // Return % for the period
    const periodInvested = startQty > 0 && startPrice != null
      ? startQty * startPrice
      : invested;
    const totalReturn = realized + unrealized;
    const returnPct = periodInvested > 0 ? (totalReturn / periodInvested) * 100 : 0;

    const firstBuyDate = currentPos?.firstBuyDate;
    const days = firstBuyDate ? Math.floor((now - firstBuyDate) / 86400000) : undefined;

    // Get graphData filtered to range
    const graphData = (analyticPos?.graphData ?? (priceHistory[symbol] ?? []).map(p => ({ price: p.price, timestamp: p.timestamp })))
      .filter(g => new Date(g.timestamp).getTime() >= cutoff);

    results.push({
      symbol,
      returnPct,
      unrealizedNum: unrealized,
      realizedNum: realized,
      investedNum: periodInvested > 0 ? periodInvested : invested,
      currentPrice: livePrice,
      totalQuantity: displayQty.toString(),
      averagePrice: avgCost.toFixed(2),
      totalInvested: invested.toFixed(2),
      unrealizedPnL: isClosed ? "0.00" : unrealized.toFixed(2),
      realizedPnL: realized.toFixed(2),
      returnPercent: returnPct,
      daysSinceFirstBuy: days,
      graphData,
    });
  }

  return results.sort((a, b) => b.returnPct - a.returnPct);
}

/** For "ALL" range — just format current positions */
function computeCurrentPositions(positions: AnalyticsPosition[]) {
  return positions.map((p) => {
    const invested = parseFloat(String(p.totalInvested));
    const qty = parseFloat(String(p.totalQuantity));
    const currentPrice = p.currentPrice ?? 0;
    const unrealized = parseFloat(String(p.unrealizedPnL));
    const returnPct = p.returnPercent != null ? parseFloat(String(p.returnPercent)) : invested > 0 ? (unrealized / invested) * 100 : 0;
    return { ...p, returnPct, unrealizedNum: unrealized, realizedNum: parseFloat(String(p.realizedPnL)), investedNum: invested };
  }).sort((a, b) => b.returnPct - a.returnPct);
}

function filterTimeline(timeline: TimelinePoint[], range: ExtendedRange) {
  if (range === "ALL") return timeline;
  const cutoff = rangeCutoffMs(range);
  return timeline.filter(p => new Date(p.timestamp).getTime() >= cutoff);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const fmtTx = (v: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(v);

function HistoryRow({ tx }: { tx: StockTransaction }) {
  const { t } = useLanguage();
  const isBuy = tx.type === "BUY";
  const total = tx.total ?? tx.price * tx.quantity;
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${isBuy ? "bg-emerald-900/50 text-emerald-400" : "bg-orange-900/50 text-orange-400"}`}>
          {tx.type}
        </span>
        <span className="text-gray-400">{tx.quantity} {t("trade.sharesUnit")}</span>
        <span className="text-gray-600">@ {fmtTx(tx.price)}</span>
      </div>
      <div className="text-right">
        <p className="text-white font-medium">{fmtTx(total)}</p>
        <p className="text-gray-600">
          {new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}

function ExpandedHistory({ symbol }: { symbol: string }) {
  const { t } = useLanguage();
  const { data, isLoading } = useStockHistory(symbol);
  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-500" size={16} /></div>;
  }
  const transactions = data?.transactions ?? [];
  if (transactions.length === 0) {
    return <p className="text-gray-600 text-xs text-center py-4">{t("portfolio.noTxHistory")}</p>;
  }
  return (
    <div>
      {transactions.map((tx, i) => <HistoryRow key={i} tx={tx} />)}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, positive, color = "blue",
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  positive?: boolean; color?: "blue" | "green" | "red" | "amber" | "purple";
}) {
  const iconColors = {
    blue: "text-blue-400 bg-blue-900/30",
    green: "text-emerald-400 bg-emerald-900/30",
    red: "text-red-400 bg-red-900/30",
    amber: "text-amber-400 bg-amber-900/30",
    purple: "text-purple-400 bg-purple-900/30",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 flex items-start gap-3 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
      <div className={`p-2 rounded-lg ${iconColors[color]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-500 text-xs">{label}</p>
        {(() => {
          const match = value.match(/^([A-Z]{3})\s*(.+)$/);
          if (match) {
            const valColor = positive === undefined ? "text-gray-900 dark:text-white" : positive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
            return (
              <div className="mt-0.5">
                <span className="text-gray-500 text-[10px] font-medium tracking-wider uppercase">{match[1]}</span>
                <p className={`text-lg font-bold leading-tight ${valColor}`}>{match[2]}</p>
              </div>
            );
          }
          return (
            <p className={`text-lg font-bold mt-0.5 ${
              positive === undefined ? "text-gray-900 dark:text-white" : positive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>{value}</p>
          );
        })()}
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-gray-900 dark:text-white font-semibold text-sm">{title}</h2>
      {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-gray-600 text-sm">
      {message}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t, dir } = useLanguage();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Per-section independent range states — default to 1M across all sections.
  const [timelineRange, setTimelineRange] = useState<ExtendedRange>("1M");
  const [pnlRange, setPnlRange] = useState<ExtendedRange>("1M");
  const [riskRange, setRiskRange] = useState<ExtendedRange>("1M");
  const [healthRange, setHealthRange] = useState<ExtendedRange>("1M");
  const [durationRange, setDurationRange] = useState<ExtendedRange>("1M");
  const [tableRange, setTableRange] = useState<ExtendedRange>("1M");

  // Fetch ALL data once — no refetch on range change
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: allTimeline = [], isLoading: timelineLoading } = useTimeline();

  // ALL positions (no range filter) for KPI cards
  const allPositions = useMemo(() => reconstructPositionsForRange(analytics ?? null, "ALL"), [analytics]);

  const pv = analytics?.portfolioValue;
  const totalInvested = pv ? parseFloat(String(pv.totalInvested)) : 0;
  const totalRealized = pv && pv.totalRealized != null ? parseFloat(String(pv.totalRealized)) : 0;
  const fees = analytics?.totalFeesPaid ? parseFloat(analytics.totalFeesPaid) : 0;
  const totalUnrealized = allPositions.reduce((s, p) => s + p.unrealizedNum, 0);
  const totalPnL = totalRealized + totalUnrealized;
  const netPnL = totalPnL - fees;

  const avgHoldDays = useMemo(() => {
    const ps = analytics?.positions ?? [];
    if (ps.length === 0) return null;
    const total = ps.reduce((sum, p) => sum + (p.daysSinceFirstBuy ?? 0), 0);
    return Math.round(total / ps.length);
  }, [analytics]);

  // Build fullTimeline by replaying transactions against historical prices.
  // Works for users with current holdings AND fully-closed users — the curve includes
  // every date the user owned anything, plus every transaction date.
  const fullTimeline = useMemo(() => {
    const txs = analytics?.transactions ?? [];
    const priceHistory = analytics?.priceHistory ?? {};
    if (txs.length === 0) return allTimeline;

    const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build per-symbol price-by-date map
    const priceBySymbol = new Map<string, Map<string, number>>();
    for (const [symbol, history] of Object.entries(priceHistory)) {
      const m = new Map<string, number>();
      for (const p of history) {
        const d = new Date(p.timestamp).toISOString().slice(0, 10);
        m.set(d, parseFloat(p.price));
      }
      priceBySymbol.set(symbol, m);
    }
    // Add live current prices
    for (const pos of analytics?.positions ?? []) {
      if (pos.currentPrice == null) continue;
      const today = new Date().toISOString().slice(0, 10);
      const m = priceBySymbol.get(pos.symbol) ?? new Map();
      if (!m.has(today)) m.set(today, pos.currentPrice);
      priceBySymbol.set(pos.symbol, m);
    }
    // Fill gaps with transaction prices
    for (const tx of sortedTxs) {
      const d = new Date(tx.date).toISOString().slice(0, 10);
      const m = priceBySymbol.get(tx.symbol) ?? new Map();
      if (!m.has(d)) m.set(d, parseFloat(tx.price));
      priceBySymbol.set(tx.symbol, m);
    }

    // Collect all dates that matter
    const allDates = new Set<string>();
    for (const [, pm] of priceBySymbol) for (const d of pm.keys()) allDates.add(d);
    for (const tx of sortedTxs) allDates.add(new Date(tx.date).toISOString().slice(0, 10));
    const dates = Array.from(allDates).sort();
    if (dates.length < 2) return allTimeline;

    // Helper: nearest price on or before a date
    function priceAt(symbol: string, date: string): number | null {
      const m = priceBySymbol.get(symbol);
      if (!m) return null;
      const exact = m.get(date);
      if (exact != null) return exact;
      const targetMs = new Date(date).getTime();
      let best: number | null = null, bestDiff = Infinity;
      for (const [d, p] of m) {
        const dMs = new Date(d).getTime();
        if (dMs <= targetMs) {
          const diff = targetMs - dMs;
          if (diff < bestDiff) { bestDiff = diff; best = p; }
        }
      }
      return best;
    }

    const holdings = new Map<string, { qty: number; cost: number }>();
    let txIdx = 0;
    const pts: TimelinePoint[] = [];
    for (const date of dates) {
      // Apply transactions on or before this date
      while (txIdx < sortedTxs.length) {
        const tx = sortedTxs[txIdx];
        const txDate = new Date(tx.date).toISOString().slice(0, 10);
        if (txDate > date) break;
        const qty = parseFloat(tx.quantity);
        const price = parseFloat(tx.price);
        const h = holdings.get(tx.symbol) ?? { qty: 0, cost: 0 };
        if (tx.type === "BUY") {
          h.qty += qty;
          h.cost += qty * price;
        } else if (h.qty > 0) {
          const avg = h.cost / h.qty;
          h.qty = Math.max(0, h.qty - qty);
          h.cost = h.qty * avg;
        }
        holdings.set(tx.symbol, h);
        txIdx++;
      }
      // Sum portfolio value at this date
      let totalValue = 0;
      for (const [symbol, h] of holdings) {
        if (h.qty <= 0.001) continue;
        const p = priceAt(symbol, date);
        totalValue += p != null ? h.qty * p : h.cost;
      }
      pts.push({ timestamp: date, totalValue });
    }
    return pts.length >= 2 ? pts : allTimeline;
  }, [allTimeline, analytics]);

  // Timeline filtered by its own range (client-side)
  const effectiveTimeline = useMemo(() => filterTimeline(fullTimeline, timelineRange), [fullTimeline, timelineRange]);

  const timelineChartData = useMemo(() =>
    effectiveTimeline.map((p) => ({
      date: new Date(p.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Number(p.totalValue),
    })),
    [effectiveTimeline]
  );

  const timelineColor = useMemo(() => {
    if (effectiveTimeline.length < 2) return "#3b82f6";
    return Number(effectiveTimeline[effectiveTimeline.length - 1].totalValue) >= Number(effectiveTimeline[0].totalValue) ? "#10b981" : "#ef4444";
  }, [effectiveTimeline]);

  const timelineChange = useMemo(() => {
    if (effectiveTimeline.length < 2) return null;
    const first = Number(effectiveTimeline[0].totalValue);
    const last = Number(effectiveTimeline[effectiveTimeline.length - 1].totalValue);
    return { abs: last - first, pct: first > 0 ? ((last - first) / first) * 100 : 0 };
  }, [effectiveTimeline]);

  if (analyticsLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-gray-500" size={28} />
        </div>
      </AppShell>
    );
  }

  const hasAnyData = allPositions.length > 0 || (analytics?.transactions?.length ?? 0) > 0 || totalRealized !== 0;
  if (!analytics || !hasAnyData) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex flex-col items-center gap-4 text-center">
          <BarChart2 size={40} className="text-gray-700" />
          <p className="text-white font-semibold">{t("analytics.noData")}</p>
          <p className="text-gray-500 text-sm max-w-xs">
            {t("analytics.noDataSub")}
          </p>
          <Link href="/stocks" className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
            {t("analytics.browseStocks")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* ── Advanced Portfolio Metrics ───────────────── */}
        {(() => {
          const openPositions = allPositions.filter(p => p.unrealizedNum !== 0 || parseFloat(String(p.totalQuantity)) > 0);
          const totalPortfolioValue = totalInvested + totalUnrealized;

          // Concentration Risk — % held in top position (HHI-style)
          const topPos = [...openPositions].sort((a, b) => b.investedNum - a.investedNum)[0];
          const concentrationPct = totalInvested > 0 && topPos ? (topPos.investedNum / totalInvested) * 100 : null;

          // Momentum — % of open positions currently profitable
          const profitable = openPositions.filter(p => p.unrealizedNum > 0).length;
          const momentumPct = openPositions.length > 0 ? (profitable / openPositions.length) * 100 : null;

          // Max Drawdown from timeline
          const maxDrawdown = (() => {
            if (fullTimeline.length < 2) return null;
            let peak = -Infinity, maxDD = 0;
            for (const pt of fullTimeline) {
              const v = Number(pt.totalValue);
              if (v > peak) peak = v;
              const dd = peak > 0 ? ((peak - v) / peak) * 100 : 0;
              if (dd > maxDD) maxDD = dd;
            }
            return maxDD;
          })();

          // Annualized Return — (totalPnL / totalInvested) / (avgHoldDays / 365) * 100
          const annualizedReturn = (() => {
            if (!totalInvested || !avgHoldDays || avgHoldDays < 30) return null;
            const simpleReturn = totalPnL / totalInvested;
            return (simpleReturn / (avgHoldDays / 365)) * 100;
          })();

          // Capital Efficiency — EGP earned per 100 EGP invested
          const capitalEfficiency = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : null;

          // Fee Drag — % of gross P&L lost to fees
          const grossPnL = totalPnL + fees;
          const feeDrag = grossPnL > 0 && fees > 0 ? (fees / grossPnL) * 100 : 0;

          const metricCard = (
            label: string,
            value: string,
            sub: string,
            color: string,
            bgColor: string,
            icon: React.ReactNode,
            trend?: "up" | "down" | "neutral",
          ) => (
            <div className={`bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800/50 shadow-sm hover:shadow-md transition-all duration-200`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bgColor}`}>
                  {icon}
                </div>
                {trend && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    trend === "up" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : trend === "down" ? "bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}>
                    {trend === "up" ? "▲" : trend === "down" ? "▼" : "●"}
                  </span>
                )}
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-[10px] font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold leading-tight ${color}`}>{value}</p>
              <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">{sub}</p>
            </div>
          );

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {metricCard(
                t("analytics.adv.capitalEfficiency"),
                capitalEfficiency != null ? `${capitalEfficiency >= 0 ? "+" : ""}${capitalEfficiency.toFixed(2)}%` : "—",
                `${fmtEGP(totalPnL)} ${t("analytics.adv.capitalEfficiencyOn")} ${fmtEGP(totalInvested)}`,
                capitalEfficiency != null && capitalEfficiency >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
                <TrendingUp size={14} />,
                capitalEfficiency != null ? (capitalEfficiency >= 0 ? "up" : "down") : "neutral",
              )}
              {metricCard(
                t("analytics.adv.annualizedReturn"),
                annualizedReturn != null ? `${annualizedReturn >= 0 ? "+" : ""}${annualizedReturn.toFixed(1)}%` : "—",
                avgHoldDays != null
                  ? `${t("analytics.adv.annualizedReturnBasedOn")} ${avgHoldDays}d ${t("analytics.adv.annualizedReturnAvgHold")}`
                  : t("analytics.adv.annualizedReturnNoData"),
                annualizedReturn != null && annualizedReturn >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500 dark:text-red-400",
                "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                <Activity size={14} />,
                annualizedReturn != null ? (annualizedReturn >= 0 ? "up" : "down") : "neutral",
              )}
              {metricCard(
                t("analytics.adv.maxDrawdown"),
                maxDrawdown != null ? `−${maxDrawdown.toFixed(2)}%` : "—",
                maxDrawdown != null && maxDrawdown < 5
                  ? t("analytics.adv.maxDrawdownLow")
                  : maxDrawdown != null && maxDrawdown < 15
                  ? t("analytics.adv.maxDrawdownMid")
                  : t("analytics.adv.maxDrawdownHigh"),
                maxDrawdown != null && maxDrawdown < 10 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400",
                <Shield size={14} />,
                maxDrawdown != null ? (maxDrawdown < 10 ? "up" : "down") : "neutral",
              )}
              {metricCard(
                t("analytics.adv.concentrationRisk"),
                concentrationPct != null ? `${concentrationPct.toFixed(1)}%` : "—",
                topPos
                  ? `${t("analytics.adv.concentrationRiskTop")}: ${topPos.symbol} · ${openPositions.length} ${t("analytics.adv.concentrationRiskPos")}`
                  : `${openPositions.length} ${t("analytics.adv.concentrationRiskOpen")}`,
                concentrationPct != null && concentrationPct > 50 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white",
                "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                <Target size={14} />,
                concentrationPct != null ? (concentrationPct < 40 ? "up" : "down") : "neutral",
              )}
              {metricCard(
                t("analytics.adv.momentumScore"),
                momentumPct != null ? `${momentumPct.toFixed(0)}%` : "—",
                momentumPct != null
                  ? `${profitable}/${openPositions.length} ${t("analytics.adv.momentumScoreProfitable")}`
                  : t("analytics.adv.momentumScoreEmpty"),
                momentumPct != null && momentumPct >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                "bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400",
                <Zap size={14} />,
                momentumPct != null ? (momentumPct >= 50 ? "up" : "down") : "neutral",
              )}
              {metricCard(
                t("analytics.adv.feeDrag"),
                feeDrag > 0 ? `${feeDrag.toFixed(2)}%` : "0%",
                feeDrag > 0
                  ? `${fmtEGP(fees)} ${t("analytics.adv.feeDragFeesOn")} ${fmtEGP(grossPnL)} ${t("analytics.adv.feeDragGross")}`
                  : t("analytics.adv.feeDragNone"),
                feeDrag > 5 ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white",
                "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                <Award size={14} />,
                feeDrag < 3 ? "up" : "down",
              )}
            </div>
          );
        })()}

        {/* ── Portfolio Timeline ───────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionHeader
              title={t("analytics.portfolioValue")}
              sub={timelineChange ? `${pct(timelineChange.pct)} · ${fmtEGP(timelineChange.abs)} ${t("analytics.thisPeriod")}` : undefined}
            />
            <SectionRangeBtns range={timelineRange} setRange={setTimelineRange} />
          </div>
          {timelineLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="animate-spin text-gray-600" size={20} />
            </div>
          ) : timelineChartData.length === 0 ? (
            <EmptyState message={t("analytics.noTimeline")} />
          ) : (
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timelineChartData} margin={{ top: 8, right: dir === "rtl" ? 60 : 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tlFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={timelineColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={timelineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  orientation={dir === "rtl" ? "right" : "left"}
                  tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: `1px solid ${timelineColor}44`, borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  labelStyle={{ color: "#9ca3af", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const }}
                  formatter={(v: unknown) => [fmtEGP(v as number), t("analytics.value")]}
                  cursor={{ stroke: timelineColor, strokeWidth: 1.5, strokeOpacity: 0.4, strokeDasharray: "5 4" }}
                />
                <Area
                  type="monotone" dataKey="value" stroke={timelineColor}
                  strokeWidth={2.5} fill="url(#tlFill)"
                  dot={false} activeDot={{ r: 6, fill: timelineColor, stroke: "#0f172a", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── 4. Position Health Cards — top 4 latest ─────────── */}
        {(() => {
          const hPositions = reconstructPositionsForRange(analytics ?? null, healthRange);
          const hInvested = hPositions.reduce((s, p) => s + p.investedNum, 0);
          const positionHealthData = hPositions
            .filter((p) => p.currentPrice != null && p.currentPrice > 0)
            .map((p) => {
              const avgCost = parseFloat(String(p.averagePrice));
              const current = p.currentPrice ?? 0;
              const qty = parseFloat(String(p.totalQuantity));
              const gap = avgCost > 0 ? ((current - avgCost) / avgCost) * 100 : 0;
              const weight = hInvested > 0 ? (p.investedNum / hInvested) * 100 : 0;
              // Compute unrealized + market value client-side from price × qty so they
              // never depend on a stale/missing unrealizedPnL field from the API.
              const unrealized = (current - avgCost) * qty;
              const marketValue = current * qty;
              const returnPct = avgCost > 0 ? ((current - avgCost) / avgCost) * 100 : p.returnPct;
              return { symbol: p.symbol, avgCost, currentPrice: current, gap, invested: p.investedNum, marketValue, unrealized, returnPct, days: p.daysSinceFirstBuy ?? 0, weight };
            })
            // Latest first — most recently bought have the lowest "days since first buy"
            .sort((a, b) => a.days - b.days)
            .slice(0, 4);
          if (positionHealthData.length === 0) return null;
          return (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <SectionHeader title={t("analytics.positionHealth")} sub={t("analytics.positionHealthSub")} />
              <SectionRangeBtns range={healthRange} setRange={setHealthRange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {positionHealthData.map((p) => {
                const isUp = p.returnPct >= 0;
                const accentText = isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400";
                const accentBgPill = isUp
                  ? "bg-emerald-100/80 dark:bg-emerald-900/30 border-emerald-200/80 dark:border-emerald-800/40"
                  : "bg-red-100/80 dark:bg-red-900/30 border-red-200/80 dark:border-red-800/40";
                const accentRail = isUp ? "from-emerald-400 to-emerald-500" : "from-red-400 to-red-500";
                // Needle position on -50%..+50% scale, clamped
                const needlePct = Math.min(95, Math.max(5, 50 + p.returnPct));
                return (
                  <div
                    key={p.symbol}
                    className={`relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm hover:shadow-md transition-all duration-200 ${
                      isUp
                        ? "hover:border-emerald-200 dark:hover:border-emerald-800/40"
                        : "hover:border-red-200 dark:hover:border-red-800/40"
                    }`}
                  >
                    {/* Subtle accent ribbon along the left edge */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b ${accentRail}`} />

                    <div className="p-4 pl-5 space-y-3">
                      {/* Top: Symbol & return pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={p.symbol.startsWith("GOLD_") ? `/gold/${p.symbol}` : `/stocks/${p.symbol}`}
                            className="font-bold text-gray-900 dark:text-white text-base hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-mono tracking-wide"
                          >
                            {p.symbol}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 dark:text-gray-500">
                            <span className="inline-flex items-center gap-0.5">
                              <Clock size={10} className="opacity-60" />
                              {p.days}d
                            </span>
                            <span className="opacity-30">·</span>
                            <span>{p.weight.toFixed(1)}% wt</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${accentBgPill}`}>
                          {isUp ? <TrendingUp size={14} className={accentText} /> : <TrendingDown size={14} className={accentText} />}
                          <span className={`text-base font-bold leading-none ${accentText}`}>
                            {isUp ? "+" : "−"}{Math.abs(p.returnPct).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Price rail: avg cost ←(current)→ */}
                      <div>
                        <div className="flex items-baseline justify-between text-[10px] text-gray-500 dark:text-gray-500 mb-1.5">
                          <span>
                            <span className="opacity-70">{t("common.avgCost")}</span>{" "}
                            <span className="text-gray-800 dark:text-gray-200 font-semibold ml-0.5">{fmtEGP(p.avgCost)}</span>
                          </span>
                          <span>
                            <span className="opacity-70">{t("analytics.mktPrice")}</span>{" "}
                            <span className={`font-semibold ml-0.5 ${accentText}`}>{fmtEGP(p.currentPrice)}</span>
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-100 dark:bg-gray-800/70 rounded-full overflow-hidden">
                          {/* Center reference (cost basis) */}
                          <div className="absolute top-0 bottom-0 w-px bg-gray-300/80 dark:bg-gray-600/60" style={{ left: "50%" }} />
                          {/* Filled segment from center to needle */}
                          {isUp ? (
                            <div className={`absolute top-0 h-full bg-gradient-to-r ${accentRail} transition-all duration-700`} style={{ left: "50%", width: `${needlePct - 50}%` }} />
                          ) : (
                            <div className={`absolute top-0 h-full bg-gradient-to-l ${accentRail} transition-all duration-700`} style={{ left: `${needlePct}%`, width: `${50 - needlePct}%` }} />
                          )}
                          {/* Needle marker */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow ${
                              isUp ? "bg-emerald-500" : "bg-red-500"
                            } transition-all duration-700`}
                            style={{ left: `${needlePct}%` }}
                          />
                        </div>
                      </div>

                      {/* Money flow: Invested → Current with P&L badge in between */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 min-w-0">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold leading-tight">{t("common.invested")}</p>
                          <p className="text-gray-900 dark:text-white text-base font-bold leading-tight mt-1 truncate">{fmtEGP(p.invested)}</p>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                          <span className={`text-[11px] font-bold leading-none px-2 py-1 rounded ${accentBgPill} ${accentText}`}>
                            {p.unrealized >= 0 ? "+" : "−"}{fmtEGP(Math.abs(p.unrealized))}
                          </span>
                          <ArrowRight size={14} className={`mt-1 ${accentText}`} />
                        </div>
                        <div className={`flex-1 rounded-lg px-3 py-2.5 border min-w-0 ${
                          isUp
                            ? "bg-emerald-50/60 dark:bg-emerald-900/15 border-emerald-100 dark:border-emerald-900/30"
                            : "bg-red-50/60 dark:bg-red-900/15 border-red-100 dark:border-red-900/30"
                        }`}>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold leading-tight">{t("analytics.currentValue")}</p>
                          <p className={`text-base font-bold leading-tight mt-1 truncate ${accentText}`}>{fmtEGP(p.marketValue)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* ── 5. Return vs Holding Period — bucketed analysis (answers the section's question directly) ── */}
        {(() => {
          const durPositions = reconstructPositionsForRange(analytics ?? null, durationRange);
          const positions = durPositions
            .filter((p) => (p.daysSinceFirstBuy ?? 0) > 0 && p.investedNum > 0)
            .map((p) => ({
              symbol: p.symbol,
              days: p.daysSinceFirstBuy ?? 0,
              returnPct: p.returnPct,
              invested: p.investedNum,
              unrealized: p.unrealizedNum,
              realized: p.realizedNum,
              pnl: p.unrealizedNum + p.realizedNum,
              isPositive: p.returnPct >= 0,
            }));
          if (positions.length === 0) return null;

          // Bucket the positions by holding period to expose the trend the section asks about
          const BUCKETS: Array<{ id: string; label: string; min: number; max: number }> = [
            { id: "short",  label: "Less than a month", min: 0,   max: 30 },
            { id: "mid",    label: "1 to 3 months",     min: 30,  max: 90 },
            { id: "long",   label: "3 to 6 months",     min: 90,  max: 180 },
            { id: "ext",    label: "More than 6 months", min: 180, max: Infinity },
          ];
          const buckets = BUCKETS.map((b) => {
            const items = positions.filter((p) => p.days >= b.min && p.days < b.max);
            const totalInvested = items.reduce((s, x) => s + x.invested, 0);
            // Capital-weighted avg return — fair when bucket has very different position sizes
            const weightedReturn = totalInvested > 0
              ? items.reduce((s, x) => s + x.returnPct * x.invested, 0) / totalInvested
              : 0;
            const winners = items.filter((x) => x.isPositive).length;
            const winRate = items.length > 0 ? (winners / items.length) * 100 : 0;
            return { ...b, items, totalInvested, weightedReturn, winners, losers: items.length - winners, winRate };
          });

          // Headline insight — pick the best and worst hold periods (only buckets that have trades)
          const populated = buckets.filter((b) => b.items.length > 0);
          const bestBucket  = [...populated].sort((a, b) => b.weightedReturn - a.weightedReturn)[0] ?? null;
          const worstBucket = [...populated].sort((a, b) => a.weightedReturn - b.weightedReturn)[0] ?? null;

          // Top performers list (sorted desc by return) for the per-symbol detail rail
          const sortedByReturn = [...positions].sort((a, b) => b.returnPct - a.returnPct);

          // Trend insight: does longer holding correlate with better return?
          const trendInsight = (() => {
            if (populated.length < 2) return null;
            const first = populated[0];
            const last  = populated[populated.length - 1];
            const delta = last.weightedReturn - first.weightedReturn;
            if (Math.abs(delta) < 1) return { tone: "neutral" as const, text: "No strong correlation between hold time and return." };
            if (delta > 0) return { tone: "good" as const, text: `Longer holds returned ${delta.toFixed(1)} pts more on average — patience paid off.` };
            return { tone: "bad" as const, text: `Longer holds returned ${Math.abs(delta).toFixed(1)} pts less — your shorter trades performed better.` };
          })();

          // Capital-weighted avg across everything — what shows in the headline
          const totalAllInvested = positions.reduce((s, p) => s + p.invested, 0);
          const overallReturn = totalAllInvested > 0
            ? positions.reduce((s, p) => s + p.returnPct * p.invested, 0) / totalAllInvested
            : 0;

          return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 space-y-4 border border-gray-100 dark:border-gray-800/60 shadow-sm dark:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <SectionHeader title={t("analytics.returnVsDuration")} sub={t("analytics.returnVsDurationSub")} />
              </div>
              <SectionRangeBtns range={durationRange} setRange={setDurationRange} />
            </div>

            {/* Headline insight */}
            {trendInsight && (
              <div className={`rounded-lg px-3 py-2.5 flex items-start gap-2 ${
                trendInsight.tone === "good"
                  ? "bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-900/30"
                  : trendInsight.tone === "bad"
                  ? "bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30"
                  : "bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60"
              }`}>
                <Info
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    trendInsight.tone === "good" ? "text-emerald-500"
                    : trendInsight.tone === "bad" ? "text-red-500"
                    : "text-gray-400"
                  }`}
                />
                <p className={`text-xs leading-relaxed ${
                  trendInsight.tone === "good" ? "text-emerald-700 dark:text-emerald-300"
                  : trendInsight.tone === "bad" ? "text-red-700 dark:text-red-300"
                  : "text-gray-600 dark:text-gray-400"
                }`}>{trendInsight.text}</p>
              </div>
            )}

            {/* Bucket cards — one per hold-period range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {buckets.map((b) => {
                const empty = b.items.length === 0;
                const isBest  = !empty && bestBucket  && b.id === bestBucket.id  && populated.length > 1;
                const isWorst = !empty && worstBucket && b.id === worstBucket.id && populated.length > 1;
                const accent = empty ? "neutral" : b.weightedReturn >= 0 ? "good" : "bad";
                return (
                  <div
                    key={b.id}
                    className={`relative rounded-xl border p-3 transition-all ${
                      empty
                        ? "bg-gray-50/50 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800/40 opacity-60"
                        : accent === "good"
                          ? "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200/70 dark:border-emerald-900/30"
                          : "bg-red-50/40 dark:bg-red-900/10 border-red-200/70 dark:border-red-900/30"
                    }`}
                  >
                    {/* Best/Worst tag */}
                    {(isBest || isWorst) && (
                      <span className={`absolute -top-2 right-3 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        isBest
                          ? "bg-emerald-500 text-white"
                          : "bg-red-500 text-white"
                      }`}>
                        {isBest ? "Best" : "Worst"}
                      </span>
                    )}

                    {/* Bucket label + count */}
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-wider">{b.label}</p>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
                        {b.items.length} {b.items.length === 1 ? "trade" : "trades"}
                      </span>
                    </div>

                    {/* Avg return */}
                    {empty ? (
                      <p className="text-base font-bold text-gray-400 dark:text-gray-600 leading-tight">—</p>
                    ) : (
                      <p className={`text-2xl font-bold leading-none ${
                        accent === "good"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                      }`}>
                        {b.weightedReturn >= 0 ? "+" : "−"}{Math.abs(b.weightedReturn).toFixed(2)}%
                      </p>
                    )}

                    {/* Win rate bar */}
                    {!empty && (
                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[9px] text-gray-500 dark:text-gray-500 mb-1">
                          <span>Win rate</span>
                          <span className="font-semibold tabular-nums">
                            {b.winRate.toFixed(0)}% · {b.winners}W/{b.losers}L
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-red-100 dark:bg-red-950/40 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${b.winRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Capital deployed */}
                    {!empty && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-2">
                        {fmtEGP(b.totalInvested)} <span className="opacity-60">deployed</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Per-position rail — sorted by return so the best and worst land on the edges */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase tracking-widest">
                  All positions <span className="opacity-60">· sorted by return</span>
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-600 tabular-nums">
                  Capital-weighted avg: <span className={`font-bold ${overallReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {overallReturn >= 0 ? "+" : "−"}{Math.abs(overallReturn).toFixed(2)}%
                  </span>
                </p>
              </div>
              {/* Diverging horizontal bars + dollar P&L (merged from former "P&L by Position" chart) */}
              {(() => {
                const maxAbs = Math.max(...sortedByReturn.map((d) => Math.abs(d.returnPct)), 1);
                return sortedByReturn.map((d) => {
                  const widthPct = (Math.abs(d.returnPct) / maxAbs) * 50;
                  const splitTitle = (d.unrealized !== 0 || d.realized !== 0)
                    ? `Unrealized ${d.unrealized >= 0 ? "+" : "−"}${fmtEGP(Math.abs(d.unrealized))} · Realized ${d.realized >= 0 ? "+" : "−"}${fmtEGP(Math.abs(d.realized))}`
                    : "";
                  return (
                    <Link
                      key={d.symbol}
                      href={d.symbol.startsWith("GOLD_") ? `/gold/${d.symbol}` : `/stocks/${d.symbol}`}
                      className={`group grid items-center gap-2 sm:gap-3 px-2 py-2 sm:py-1.5 rounded-lg cursor-pointer
                        transition-all duration-200 ease-out
                        hover:bg-gradient-to-r hover:shadow-sm hover:-translate-y-px hover:scale-[1.005]
                        active:scale-[0.99] active:translate-y-0
                        ${d.isPositive
                          ? "hover:from-emerald-50/60 hover:to-transparent dark:hover:from-emerald-900/20 dark:hover:to-transparent hover:ring-1 hover:ring-emerald-200/60 dark:hover:ring-emerald-800/40"
                          : "hover:from-red-50/60 hover:to-transparent dark:hover:from-red-900/20 dark:hover:to-transparent hover:ring-1 hover:ring-red-200/60 dark:hover:ring-red-800/40"
                        }
                        [grid-template-columns:minmax(50px,60px)_1fr_minmax(70px,auto)_minmax(80px,auto)]
                        sm:[grid-template-columns:minmax(60px,80px)_1fr_minmax(80px,auto)_minmax(90px,auto)_minmax(40px,auto)]`}
                      title={`${d.symbol} · invested ${fmtEGP(d.invested)} · held ${d.days}d${splitTitle ? " · " + splitTitle : ""}`}
                    >
                      <span className="font-mono font-bold text-xs sm:text-xs text-gray-900 dark:text-white truncate group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                        {d.symbol}
                      </span>
                      <div className="relative h-4 sm:h-3.5 bg-gray-100 dark:bg-gray-800/60 rounded-md overflow-hidden">
                        {/* Centerline */}
                        <div className="absolute top-0 bottom-0 w-px bg-gray-300/80 dark:bg-gray-600/60" style={{ left: "50%" }} />
                        {d.isPositive ? (
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-r-md transition-all duration-500 group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                            style={{ left: "50%", width: `${widthPct}%` }}
                          />
                        ) : (
                          <div
                            className="absolute top-0 bottom-0 bg-gradient-to-l from-red-500 to-red-400 rounded-l-md transition-all duration-500 group-hover:from-red-600 group-hover:to-red-500 group-hover:shadow-[0_0_8px_rgba(239,68,68,0.45)]"
                            style={{ left: `${50 - widthPct}%`, width: `${widthPct}%` }}
                          />
                        )}
                      </div>
                      <span className={`text-xs font-bold tabular-nums text-right ${d.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {d.isPositive ? "+" : "−"}{Math.abs(d.returnPct).toFixed(2)}%
                      </span>
                      <span className={`text-xs font-semibold tabular-nums text-right ${d.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"} opacity-90`}>
                        {d.pnl >= 0 ? "+" : "−"}{fmtEGP(Math.abs(d.pnl))}
                      </span>
                      {/* Days held — desktop only; mobile reads it from the title attr */}
                      <span className="hidden sm:inline text-[10px] text-gray-400 dark:text-gray-500 text-right tabular-nums">
                        {d.days}d
                      </span>
                    </Link>
                  );
                });
              })()}
            </div>
          </div>
          );
        })()}

        {/* ── Best / Worst ─────────────────────────────── */}
        {(analytics.bestPerformer || analytics.worstPerformer) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analytics.bestPerformer && (
              <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-900/40">
                  <Zap size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{t("analytics.bestPerformer")}</p>
                  <p className="text-white font-bold text-lg">{analytics.bestPerformer.symbol}</p>
                  <p className="text-emerald-400 text-sm font-medium">
                    +{parseFloat(String(analytics.bestPerformer.returnPercent)).toFixed(2)}% · {fmtSignedEGP(parseFloat(analytics.bestPerformer.unrealizedPnL))}
                  </p>
                </div>
              </div>
            )}
            {analytics.worstPerformer && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-900/40">
                  <AlertCircle size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs">{t("analytics.worstPerformer")}</p>
                  <p className="text-white font-bold text-lg">{analytics.worstPerformer.symbol}</p>
                  <p className="text-red-400 text-sm font-medium">
                    {parseFloat(String(analytics.worstPerformer.returnPercent)).toFixed(2)}% · {fmtSignedEGP(parseFloat(analytics.worstPerformer.unrealizedPnL))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Fee breakdown ────────────────────────────── */}
        {fees > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
            <SectionHeader title={t("analytics.feeImpact")} sub={t("analytics.feeImpactSub")} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">{t("analytics.grossPnlLabel")}</p>
                <p className={`text-xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtSignedEGP(totalPnL)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">{t("analytics.totalFees")}</p>
                <p className="text-xl font-bold text-amber-400">−{fmtEGP(fees)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">{t("analytics.netPnl")}</p>
                <p className={`text-xl font-bold ${(netPnL ?? totalPnL) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtSignedEGP(netPnL ?? totalPnL - fees)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Smart Insights Panel (Feature 9) ─────────── */}
        <InsightsPanel />

        {/* ── P&L Calendar Heatmap (Feature 5) ─────────── */}
        <PnLCalendar />

        {/* ── Closed Trade Scoring (Feature 8) ─────────── */}
        <ClosedTradeScoring />

      </main>
    </AppShell>
  );
}

// ─── Smart Insights Panel ─────────────────────────────────────────────────────

interface Insight { type: "WARNING" | "INFO" | "SUCCESS"; icon: string; message: string; symbol?: string; priority: number }

const INSIGHT_ICON: Record<string, React.ElementType> = {
  WARNING: AlertTriangle,
  INFO: Info,
  SUCCESS: CheckCircle,
};

const INSIGHT_COLOR: Record<string, string> = {
  WARNING: "text-amber-400 bg-amber-900/20 border-amber-800/40",
  INFO: "text-blue-400 bg-blue-900/20 border-blue-800/40",
  SUCCESS: "text-emerald-400 bg-emerald-900/20 border-emerald-800/40",
};

function InsightsPanel() {
  const { t } = useLanguage();
  const assetType = useAssetType();
  const { data, isLoading } = useQuery({
    queryKey: ["insights", assetType],
    queryFn: () => apiClient.get<{ insights: Insight[] }>(withAssetType("/api/analytics/insights", assetType)),
  });

  if (isLoading) return null;
  const insights = data?.insights ?? [];
  if (insights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-transparent shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-blue-400" />
        <SectionHeader title={t("analytics.smartInsights")} sub={t("analytics.smartInsightsSub")} />
      </div>
      <div className="space-y-2">
        {insights.sort((a, b) => a.priority - b.priority).map((insight, i) => {
          const Icon = INSIGHT_ICON[insight.type] ?? Info;
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${INSIGHT_COLOR[insight.type]}`}>
              <Icon size={16} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                {insight.symbol && <span className="font-bold font-mono mr-1">{insight.symbol}</span>}
                {insight.message}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── P&L Calendar Heatmap ─────────────────────────────────────────────────────

interface DayPnL { date: string; realizedPnL: number; tradeCount: number }

function PnLCalendar() {
  const { t } = useLanguage();
  const assetType = useAssetType();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ["pnl-calendar", year, assetType],
    queryFn: () => apiClient.get<{ dailyPnL: DayPnL[] }>(withAssetType(`/api/analytics/pnl-calendar?year=${year}`, assetType)),
  });

  const dailyMap = useMemo(() => {
    const m = new Map<string, DayPnL>();
    (data?.dailyPnL ?? []).forEach((d) => m.set(d.date.slice(0, 10), d));
    return m;
  }, [data]);

  // Build 53 weeks × 7 days grid for the year
  const weeks = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const startDow = jan1.getDay(); // 0=Sun
    const days: (Date | null)[] = Array(startDow).fill(null);
    const dec31 = new Date(year, 11, 31);
    let d = new Date(jan1);
    while (d <= dec31) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    while (days.length % 7 !== 0) days.push(null);
    const w: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [year]);

  const maxPnL = useMemo(() => {
    let m = 0;
    dailyMap.forEach((v) => { if (Math.abs(v.realizedPnL) > m) m = Math.abs(v.realizedPnL); });
    return m || 1;
  }, [dailyMap]);

  function cellColor(d: Date | null): string {
    if (!d) return "bg-transparent";
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (!entry) return "bg-gray-800";
    const intensity = Math.min(1, Math.abs(entry.realizedPnL) / maxPnL);
    if (entry.realizedPnL > 0) return intensity > 0.7 ? "bg-emerald-500" : intensity > 0.3 ? "bg-emerald-600" : "bg-emerald-800";
    return intensity > 0.7 ? "bg-red-500" : intensity > 0.3 ? "bg-red-600" : "bg-red-800";
  }

  function cellTitle(d: Date | null): string {
    if (!d) return "";
    const key = d.toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (!entry) return key;
    return `${key}: ${entry.realizedPnL >= 0 ? "+" : "−"}${fmtEGP(Math.abs(entry.realizedPnL))} (${entry.tradeCount} trades)`;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

  // Year summary
  const yearSummary = useMemo(() => {
    let total = 0, greenDays = 0, redDays = 0, tradedDays = 0, totalTrades = 0;
    let bestDay: DayPnL | null = null, worstDay: DayPnL | null = null;
    dailyMap.forEach((v) => {
      total += v.realizedPnL;
      tradedDays++;
      totalTrades += v.tradeCount;
      if (v.realizedPnL > 0) greenDays++;
      else if (v.realizedPnL < 0) redDays++;
      if (!bestDay || v.realizedPnL > bestDay.realizedPnL) bestDay = v;
      if (!worstDay || v.realizedPnL < worstDay.realizedPnL) worstDay = v;
    });
    return { total, greenDays, redDays, tradedDays, totalTrades, bestDay, worstDay };
  }, [dailyMap]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 space-y-4 border border-gray-100 dark:border-gray-800/60 shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Calendar size={16} />
          </div>
          <SectionHeader title={t("analytics.pnlCalendar")} sub={t("analytics.pnlCalendarSub")} />
        </div>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[currentYear - 1, currentYear].map((y) => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-3 py-1 rounded-md text-xs font-semibold active:scale-95 transition-all duration-150 ${year === y ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      {yearSummary.tradedDays > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className={`rounded-lg px-3 py-2 ${yearSummary.total >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30" : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30"}`}>
            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold">Year P&L</p>
            <p className={`text-sm font-bold leading-tight mt-0.5 ${yearSummary.total >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {yearSummary.total >= 0 ? "+" : "−"}{fmtEGP(Math.abs(yearSummary.total))}
            </p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold">Active Days</p>
            <p className="text-sm font-bold leading-tight mt-0.5 text-gray-900 dark:text-white">
              {yearSummary.tradedDays}
              <span className="text-[10px] font-normal text-gray-400 ml-1">· {yearSummary.totalTrades} trades</span>
            </p>
            <p className="text-[10px] mt-0.5 leading-tight">
              <span className="text-emerald-500 dark:text-emerald-400 font-semibold">{yearSummary.greenDays}W</span>
              <span className="text-gray-400 dark:text-gray-600 mx-1">·</span>
              <span className="text-red-500 dark:text-red-400 font-semibold">{yearSummary.redDays}L</span>
            </p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold">Best Day</p>
            <p className="text-sm font-bold leading-tight mt-0.5 text-emerald-600 dark:text-emerald-400">
              {yearSummary.bestDay
                ? `+${fmtEGP((yearSummary.bestDay as DayPnL).realizedPnL)}`
                : "—"}
            </p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold">Worst Day</p>
            <p className="text-sm font-bold leading-tight mt-0.5 text-red-500 dark:text-red-400">
              {yearSummary.worstDay && (yearSummary.worstDay as DayPnL).realizedPnL < 0
                ? `−${fmtEGP(Math.abs((yearSummary.worstDay as DayPnL).realizedPnL))}`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-500" size={20} /></div>
      ) : (
        <div className="rounded-lg bg-gray-50/50 dark:bg-gray-800/30 p-3">
          {/* Use CSS grid: 1 col for day-of-week labels + 53 equal-width columns for weeks → fills full width */}
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
          >
            {/* Header row: blank (over day labels) + month names */}
            <div />
            {weeks.map((week, wi) => {
              // Show month name only on the first week of each month (the week containing day 1)
              const firstOfMonth = week.find((d) => d?.getDate() === 1);
              return (
                <div key={`m-${wi}`} className="text-[10px] text-gray-500 dark:text-gray-500 font-semibold h-4 leading-none">
                  {firstOfMonth ? MONTHS[firstOfMonth.getMonth()] : ""}
                </div>
              );
            })}

            {/* 7 day-of-week rows */}
            {DAYS.map((dayLabel, dayIdx) => (
              <React.Fragment key={`row-${dayIdx}`}>
                <div className="text-gray-400 dark:text-gray-600 text-[9px] font-semibold flex items-center justify-end pr-1.5 leading-none">
                  {dayIdx % 2 === 1 ? dayLabel : ""}
                </div>
                {weeks.map((week, wi) => {
                  const d = week[dayIdx];
                  return (
                    <div
                      key={`cell-${wi}-${dayIdx}`}
                      title={cellTitle(d)}
                      className={`aspect-square rounded-[3px] ${cellColor(d)} ${d ? "cursor-pointer transition-all hover:ring-2 hover:ring-blue-400/60 hover:scale-110" : ""}`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="opacity-70">{t("analytics.loss")}</span>
              <div className="w-3 h-3 rounded-[3px] bg-red-500" />
              <div className="w-3 h-3 rounded-[3px] bg-red-600" />
              <div className="w-3 h-3 rounded-[3px] bg-red-800" />
              <div className="w-3 h-3 rounded-[3px] bg-gray-200 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-800" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-600" />
              <div className="w-3 h-3 rounded-[3px] bg-emerald-500" />
              <span className="opacity-70">{t("analytics.profit")}</span>
            </div>
            <div className="flex gap-3">
              <span><span className="text-emerald-500 font-semibold">{yearSummary.greenDays}</span> green</span>
              <span><span className="text-red-500 font-semibold">{yearSummary.redDays}</span> red</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Closed Trade Scoring ─────────────────────────────────────────────────────

interface ClosedTrade {
  id: string; symbol: string; quantity: string;
  entryPrice: string; exitPrice: string;
  profit: string; returnPct: string; holdDays: number; annualizedReturn: number | null;
  grade: "A" | "B" | "C" | "D";
}
interface ClosedTradesSummary {
  totalTrades: number; avgHoldDays: number; avgAnnualizedReturn: number;
  gradeDistribution: { A: number; B: number; C: number; D: number };
}

const GRADE_COLORS = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#ef4444" };
const GRADE_BG: Record<string, string> = {
  A: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50",
  B: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50",
  C: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
  D: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50",
};
// Meaningful keyword labels in place of A/B/C/D letters
const GRADE_LABEL: Record<string, string> = { A: "Excellent", B: "Good", C: "Marginal", D: "Loss" };
const GRADE_ICON: Record<string, React.ReactNode> = {
  A: <Trophy size={11} />,
  B: <Sparkles size={11} />,
  C: <MinusCircle size={11} />,
  D: <XCircle size={11} />,
};

function ClosedTradeScoring() {
  const { t, dir } = useLanguage();
  const assetType = useAssetType();
  const { data, isLoading } = useQuery({
    queryKey: ["closed-trades", assetType],
    queryFn: () => apiClient.get<{ trades: ClosedTrade[]; summary: ClosedTradesSummary }>(withAssetType("/api/analytics/closed-trades", assetType)),
  });

  if (isLoading) return null;
  const trades = data?.trades ?? [];
  const summary = data?.summary;
  if (trades.length === 0) return null;

  const gradeData = summary ? Object.entries(summary.gradeDistribution)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: `Grade ${k}`, value: v, key: k })) : [];

  const totalGrades = gradeData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 space-y-4 border border-gray-100 dark:border-gray-800/60 shadow-sm dark:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Award size={16} />
          </div>
          <SectionHeader title={t("analytics.closedScoring")} sub={t("analytics.closedScoringSub")} />
        </div>
        {trades.length > 5 && (
          <Link href="/analytics/closed-trades" className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-xs font-semibold">
            {t("common.viewAll")} ({trades.length}) →
          </Link>
        )}
      </div>

      {/* Summary stats */}
      {summary && (() => {
        // Avg per-position return % — simple mean of each closed trade's return
        const avgPositionReturn = trades.length > 0
          ? trades.reduce((s, tr) => s + parseFloat(tr.returnPct), 0) / trades.length
          : 0;
        return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className="rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{t("analytics.totalClosed")}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{summary.totalTrades}</p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{t("analytics.avgHold")}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight mt-0.5">{parseFloat(String(summary.avgHoldDays)).toFixed(0)}d</p>
          </div>
          {/* Avg Position Return — straight mean of per-trade return % */}
          <div className={`rounded-lg px-3 py-2 ${avgPositionReturn >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30" : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30"}`}
               title="Average return across all closed positions (simple mean of each trade's return %)">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Avg Position Return</p>
            <p className={`text-sm font-bold leading-tight mt-0.5 ${avgPositionReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {avgPositionReturn >= 0 ? "+" : "−"}{Math.abs(avgPositionReturn).toFixed(2)}%
            </p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{t("analytics.avgAnnReturn")}</p>
            <p className={`text-sm font-bold leading-tight mt-0.5 ${parseFloat(String(summary.avgAnnualizedReturn)) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {parseFloat(String(summary.avgAnnualizedReturn)) >= 0 ? "+" : "−"}{Math.abs(parseFloat(String(summary.avgAnnualizedReturn))).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[9px] text-emerald-700/70 dark:text-emerald-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Trophy size={10} /> {GRADE_LABEL.A}
            </p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">{summary.gradeDistribution.A}</p>
          </div>
        </div>
        );
      })()}

      {/* Grade distribution */}
      {gradeData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">{t("analytics.gradeDist")}</p>
            <div className="space-y-2">
              {gradeData.map((g) => {
                const pct = totalGrades > 0 ? (g.value / totalGrades) * 100 : 0;
                const color = GRADE_COLORS[g.key as keyof typeof GRADE_COLORS] ?? "#6b7280";
                return (
                  <div key={g.key} className="flex items-center gap-2.5">
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap min-w-[88px] justify-center ${GRADE_BG[g.key]}`}>
                      {GRADE_ICON[g.key]}
                      {GRADE_LABEL[g.key]}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
                      <div className="h-full rounded-md transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }} />
                      <span className="absolute inset-0 flex items-center justify-between px-2.5 text-[10px] font-bold">
                        <span className={pct > 30 ? "text-white drop-shadow" : "text-gray-700 dark:text-gray-200"}>
                          {g.value} {g.value === 1 ? "trade" : "trades"}
                        </span>
                        <span className={pct > 75 ? "text-white drop-shadow" : "text-gray-600 dark:text-gray-400"}>
                          {pct.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Grade explanation */}
          <div className="space-y-2">
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">{t("analytics.gradeExplain")}</p>
            <div className="space-y-1.5">
              {(["A", "B", "C", "D"] as const).map((grade) => (
                <div key={grade} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60">
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap min-w-[88px] justify-center ${GRADE_BG[grade]}`}>
                    {GRADE_ICON[grade]}
                    {GRADE_LABEL[grade]}
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px] leading-relaxed">
                    {grade === "A" ? t("analytics.gradeADesc")
                    : grade === "B" ? t("analytics.gradeBDesc")
                    : grade === "C" ? t("analytics.gradeCDesc")
                    : t("analytics.gradeDDesc")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade list — first 5 only */}
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-800/60">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800/60">
              {[t("common.symbol"), t("common.qty"), t("pos.buyPrice"), t("pos.sellPrice"), t("analytics.profit"), t("common.return"), t("analytics.hold"), t("analytics.annReturn"), t("analytics.grade")].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Latest 5 closed trades — assume API returns chronological order, take the tail */}
            {trades.slice(-5).reverse().map((trade) => {
              const profit = parseFloat(trade.profit);
              const ret = parseFloat(trade.returnPct);
              return (
                <tr key={trade.id} className="td-row border-b border-gray-100 dark:border-gray-800/60 last:border-b-0">
                  <td className="px-3 py-2.5 font-mono font-bold text-gray-900 dark:text-white">{trade.symbol}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{trade.quantity}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtEGP(parseFloat(trade.entryPrice))}</td>
                  <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtEGP(parseFloat(trade.exitPrice))}</td>
                  <td className={`px-3 py-2.5 font-bold whitespace-nowrap ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {fmtSignedEGP(profit)}
                  </td>
                  <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${ret >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {ret >= 0 ? "+" : "−"}{Math.abs(ret).toFixed(2)}%
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 dark:text-gray-500">{trade.holdDays}d</td>
                  <td className={`px-3 py-2.5 ${trade.annualizedReturn != null && trade.annualizedReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {trade.annualizedReturn != null ? `${parseFloat(String(trade.annualizedReturn)) >= 0 ? "+" : "−"}${Math.abs(parseFloat(String(trade.annualizedReturn))).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${GRADE_BG[trade.grade]}`}>
                      {GRADE_ICON[trade.grade]}
                      {GRADE_LABEL[trade.grade]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

