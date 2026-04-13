"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  ChevronsUpDown,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import RangeSelector from "@/components/RangeSelector";
import { apiClient } from "@/lib/apiClient";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";
import { useLanguage } from "@/context/LanguageContext";
import { usePriceStream } from "@/hooks/usePriceStream";
import { useTradingMode, useAssetType, withAssetType } from "@/store/useTradingMode";
import { LineChart, Line, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, LabelList, ComposedChart, Area, Scatter, ReferenceLine } from "recharts";
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
  _isClosed?: boolean;
}

interface Performer {
  symbol: string;
  unrealizedPnL: string;
  returnPercent: number;
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
  bestPerformer?: Performer | null;
  worstPerformer?: Performer | null;
  winRate?: string | number | null;
  totalFeesPaid?: string;
  netPnL?: string;
  avgHoldingDays?: number;
  symbolsTraded?: number;
  transactions?: AnalyticsTransaction[];
  priceHistory?: Record<string, { price: string; timestamp: string }[]>;
}

interface TimelinePoint {
  timestamp: string;
  totalValue: string | number;
  totalInvested?: string | number;
}

interface AllocationSlice { name: string; value: number; percentage: number; }
interface AllocationData {
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
    "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": 365 * 100,
  };
  from.setDate(from.getDate() - days[range]);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

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
      const result = await apiClient.get<unknown>(withAssetType(`/api/portfolio/timeline?from=2000-01-01&to=${to}`, assetType));
      if (Array.isArray(result)) return result as TimelinePoint[];
      const tl = (result as { timeline?: TimelinePoint[] })?.timeline;
      return Array.isArray(tl) ? tl : [];
    },
    retry: 1,
    staleTime: 60_000,
  });
}

function useAllocation() {
  const assetType = useAssetType();
  return useQuery<AllocationData>({
    queryKey: ["portfolio", "allocation", assetType],
    queryFn: () => apiClient.get<AllocationData>(withAssetType("/api/portfolio/allocation", assetType)),
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

// Fetch price history for all traded symbols (for portfolio-wide chart)
function useAllPriceHistories(symbols: string[]) {
  const results = useQueries({
    queries: symbols.map(symbol => ({
      queryKey: ["position-detail", symbol],
      queryFn: () => apiClient.get<{ priceHistory: { timestamp: string; price: number }[] }>(`/api/portfolio/positions/${symbol}`),
      retry: 1,
      staleTime: 5 * 60_000,
    })),
  });
  // Build symbol → priceHistory map
  const priceMap = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (let i = 0; i < symbols.length; i++) {
      const data = results[i]?.data;
      if (!data?.priceHistory) continue;
      const pm = new Map<string, number>();
      for (const p of data.priceHistory) {
        const d = new Date(p.timestamp).toISOString().slice(0, 10);
        pm.set(d, p.price);
      }
      m.set(symbols[i], pm);
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), results.map(r => r.dataUpdatedAt).join(",")]);
  const isLoading = results.some(r => r.isLoading);
  return { priceMap, isLoading };
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
  const to = new Date().toISOString().slice(0, 10);
  const assetType = useAssetType();
  return useQuery<RealizedGainsResponse>({
    queryKey: ["portfolio", "realized-gains", "ALL", assetType],
    queryFn: () => apiClient.get<RealizedGainsResponse>(withAssetType(`/api/portfolio/realized-gains?from=2000-01-01&to=${to}`, assetType)),
    retry: 1,
    staleTime: 60_000,
  });
}

function useClosedPositions() {
  const to = new Date().toISOString().slice(0, 10);
  const assetType = useAssetType();
  return useQuery<ClosedPosition[]>({
    queryKey: ["portfolio", "closed-positions", "ALL", assetType],
    queryFn: () => apiClient.get<ClosedPosition[]>(withAssetType(`/api/portfolio/closed-positions?from=2000-01-01&to=${to}`, assetType)),
    retry: 1,
    staleTime: 60_000,
  });
}

const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "ALL": 365 * 100 };

function SectionRangeBtns({ range, setRange }: { range: DateRange; setRange: (r: DateRange) => void }) {
  const RANGE_OPTIONS: DateRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];
  return (
    <div className="flex gap-1 range-btns">
      {RANGE_OPTIONS.map((r) => (
        <button key={r} onClick={() => setRange(r)}
          className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium active:scale-95 transition-all duration-150 whitespace-nowrap ${
            range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
          }`}>{r}</button>
      ))}
    </div>
  );
}

function filterByDateRange<T extends { date?: string; closeDate?: string | null; lastSellDate?: string | null }>(items: T[], range: DateRange, dateField: keyof T = "date" as keyof T): T[] {
  if (range === "ALL") return items;
  const cutoffMs = Date.now() - (RANGE_DAYS[range] ?? 30) * 86400000;
  return items.filter((item) => {
    const d = String(item[dateField] ?? "");
    return d && new Date(d).getTime() >= cutoffMs;
  });
}

/** Reconstruct positions from transactions for a given date range */
function reconstructPositionsForRange(analytics: Analytics | null, range: DateRange) {
  if (!analytics) return [];
  const txs = analytics.transactions ?? [];
  const priceHistory = analytics.priceHistory ?? {};
  if (txs.length === 0) return analytics.positions.filter(p => parseFloat(String(p.totalQuantity)) > 0.001);

  const cutoffMs = Date.now() - (RANGE_DAYS[range] ?? 30) * 86400000;
  const now = Date.now();

  // Replay ALL transactions to build final (current) positions
  const posMap = new Map<string, { qty: number; totalCost: number; firstBuyDate: number }>();
  const realizedMap = new Map<string, number>();
  const totalBoughtMap = new Map<string, { qty: number; cost: number }>();

  for (const tx of txs) {
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
      const bought = totalBoughtMap.get(tx.symbol) ?? { qty: 0, cost: 0 };
      bought.qty += qty;
      bought.cost += qty * price;
      totalBoughtMap.set(tx.symbol, bought);
    } else {
      const existing = posMap.get(tx.symbol);
      if (existing && existing.qty > 0) {
        const avgCost = existing.totalCost / existing.qty;
        const profit = (price - avgCost) * qty;
        if (txMs >= cutoffMs) realizedMap.set(tx.symbol, (realizedMap.get(tx.symbol) ?? 0) + profit);
        existing.qty -= qty;
        existing.totalCost = existing.qty * avgCost;
        if (existing.qty <= 0.0001) { existing.qty = 0; existing.totalCost = 0; }
        posMap.set(tx.symbol, existing);
      }
    }
  }

  // Positions at start of range (replay txs before cutoff)
  const posAtStart = new Map<string, { qty: number; totalCost: number }>();
  for (const tx of txs) {
    const txMs = new Date(tx.date).getTime();
    if (txMs >= cutoffMs) break;
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

  // Relevant symbols: held at start of range, traded during range, OR still held now
  const relevantSymbols = new Set<string>();
  if (range === "ALL") {
    // ALL: every symbol ever traded
    for (const tx of txs) relevantSymbols.add(tx.symbol);
  } else {
    for (const tx of txs) {
      const txMs = new Date(tx.date).getTime();
      if (txMs >= cutoffMs && txMs <= now) relevantSymbols.add(tx.symbol);
    }
    for (const [sym, pos] of posAtStart) { if (pos.qty > 0.0001) relevantSymbols.add(sym); }
    for (const [sym, pos] of posMap) { if (pos.qty > 0.0001) relevantSymbols.add(sym); }
  }

  const currentPosMap = new Map(analytics.positions.map(p => [p.symbol, p]));

  function getPriceAt(symbol: string, targetMs: number): number | null {
    const ph = priceHistory[symbol];
    if (!ph || ph.length === 0) return null;
    let closest: { price: string } | null = null;
    for (const p of ph) {
      if (new Date(p.timestamp).getTime() <= targetMs) closest = p;
      else break;
    }
    return closest ? parseFloat(closest.price) : null;
  }

  // Filter out fully sold positions — they belong in the Closed Positions section
  return Array.from(relevantSymbols).filter((symbol) => {
    const pos = posMap.get(symbol);
    return (pos?.qty ?? 0) > 0.0001;
  }).map((symbol) => {
    const currentPos = posMap.get(symbol);
    const startPos = posAtStart.get(symbol);
    const analyticPos = currentPosMap.get(symbol);
    const currentQty = currentPos?.qty ?? 0;
    const startQty = startPos?.qty ?? 0;
    const realized = realizedMap.get(symbol) ?? 0;
    const livePrice = analyticPos?.currentPrice ?? getPriceAt(symbol, now);
    const startPrice = getPriceAt(symbol, cutoffMs);

    const totalBought = totalBoughtMap.get(symbol);

    // For currently held positions, use live avg cost; for sold positions, use avg cost at start of range or total bought avg
    const avgCost = currentQty > 0 && currentPos
      ? currentPos.totalCost / currentPos.qty
      : startPos && startPos.qty > 0
        ? startPos.totalCost / startPos.qty
        : totalBought && totalBought.qty > 0 ? totalBought.cost / totalBought.qty : 0;

    // Invested: use current if still held, otherwise start-of-range, otherwise total bought cost
    const invested = currentQty > 0 ? currentPos!.totalCost : (startPos?.totalCost ?? totalBought?.cost ?? 0);

    // For sold positions, show the qty they had at start of range, or total bought qty as fallback
    const displayQty = currentQty > 0 ? currentQty : (startQty > 0 ? startQty : (totalBought?.qty ?? 0));

    let unrealized = 0;
    if (currentQty > 0 && livePrice != null) {
      if (startPrice != null && startQty > 0) {
        const heldThrough = Math.min(startQty, currentQty);
        unrealized = (livePrice - startPrice) * heldThrough;
        const newShares = currentQty - heldThrough;
        if (newShares > 0) unrealized += (livePrice - avgCost) * newShares;
      } else {
        unrealized = (livePrice - avgCost) * currentQty;
      }
    }

    const periodInvested = startQty > 0 && startPrice != null ? startQty * startPrice : invested;
    const isClosed = currentQty <= 0.0001 && displayQty > 0;

    return {
      symbol,
      totalQuantity: displayQty.toString(),
      averagePrice: avgCost.toFixed(2),
      totalInvested: invested.toFixed(2),
      currentPrice: livePrice,
      unrealizedPnL: isClosed ? "0.00" : unrealized.toFixed(2),
      realizedPnL: realized.toFixed(2),
      returnPercent: periodInvested > 0 ? ((realized + unrealized) / periodInvested) * 100 : 0,
      daysSinceFirstBuy: currentPos?.firstBuyDate ? Math.floor((now - currentPos.firstBuyDate) / 86400000) : undefined,
      _isClosed: isClosed,
    } as AnalyticsPosition;
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
      {(() => {
        const match = value.match(/^([A-Z]{3})\s*(.+)$/);
        if (match) {
          return (
            <div>
              <span className="text-gray-500 text-[10px] font-medium tracking-wider uppercase">{match[1]}</span>
              <p className={`text-sm sm:text-xl font-bold leading-tight ${valueClass ?? autoClass}`}>{match[2]}</p>
            </div>
          );
        }
        return (
          <p className={`text-sm sm:text-xl font-bold truncate ${valueClass ?? autoClass}`}>{value}</p>
        );
      })()}
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

function RealizedGainsTable({ range, onRangeChange }: { range: DateRange; onRangeChange: (r: DateRange) => void }) {
  const rgRouter = useRouter();
  const { t } = useLanguage();
  const { data: allData, isLoading } = useRealizedGains();

  // Client-side date filtering
  const data = useMemo(() => {
    if (!allData) return allData;
    const filteredGains = range === "ALL" ? allData.gains : (() => {
      const cutoffMs = Date.now() - (RANGE_DAYS[range] ?? 30) * 86400000;
      return allData.gains.filter(g => new Date(g.date).getTime() >= cutoffMs);
    })();
    if (filteredGains.length === 0) return { gains: [], summary: null };
    // Recompute summary from filtered gains
    const totalProfit = filteredGains.reduce((s, g) => s + parseFloat(g.profit), 0);
    const totalFees = filteredGains.reduce((s, g) => s + parseFloat(g.fees), 0);
    const totalQty = filteredGains.reduce((s, g) => s + parseFloat(g.quantity), 0);
    const totalCost = filteredGains.reduce((s, g) => s + parseFloat(g.avgPrice) * parseFloat(g.quantity), 0);
    const winCount = filteredGains.filter(g => parseFloat(g.profit) > 0).length;
    const lossCount = filteredGains.length - winCount;
    const holdDays = filteredGains.filter(g => g.holdDays != null).map(g => g.holdDays!);
    const symbols = new Set(filteredGains.map(g => g.symbol));
    return {
      gains: filteredGains,
      summary: {
        totalProfit: totalProfit.toString(),
        totalFees: totalFees.toString(),
        totalQuantity: totalQty.toString(),
        totalCostBasis: totalCost.toString(),
        totalReturn: totalCost > 0 ? ((totalProfit / totalCost) * 100).toString() : null,
        uniqueSymbols: symbols.size,
        avgHoldDays: holdDays.length > 0 ? Math.round(holdDays.reduce((s, d) => s + d, 0) / holdDays.length) : null,
        count: filteredGains.length,
        winCount,
        lossCount,
      },
    };
  }, [allData, range]);
  const RANGE_OPTIONS: DateRange[] = ["1W", "1M", "3M", "6M", "1Y", "ALL"];
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
      <div className="px-3 sm:px-4 py-3 border-b border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest">
              {t("portfolio.realizedPnl")} — {t("realized.allTrades")}
            </h2>
            <p className="text-gray-600 text-[10px] sm:text-xs mt-0.5">
              {summary.count} {t("realized.trades")} · {summary.winCount}W / {summary.lossCount}L
            </p>
          </div>
          <div className="flex gap-1 range-btns">
            {RANGE_OPTIONS.map((r) => (
              <button key={r} onClick={() => onRangeChange(r)}
                className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium active:scale-95 transition-all duration-150 whitespace-nowrap ${
                  range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
                }`}>{r}</button>
            ))}
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-gray-500 text-[10px] sm:text-xs">{t("common.profit")}</p>
              <p className={`text-sm font-bold ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                {isWin ? "+" : "−"}{fmt(Math.abs(totalProfit))}
              </p>
            </div>
          </div>
        </div>
        {/* Summary stat row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-800 flex gap-1.5 preset-chips">
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
        <div className="ml-auto flex gap-1 flex-shrink-0">
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
          ) : sorted.slice(0, 5).map((g) => {
            const profit = parseFloat(g.profit);
            const win = profit >= 0;
            const retPct = g.returnPct != null ? parseFloat(g.returnPct) : null;
            return (
              <tr key={g.id} className="td-row border-b border-gray-800/60 hover:bg-gray-800/20 cursor-pointer transition-colors" onClick={() => rgRouter.push(`/portfolio/positions/${g.symbol}`)}>
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
      {sorted.length > 5 && (
        <div className="px-4 py-3 border-t border-gray-800 text-center">
          <Link href="/portfolio/realized-gains" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            {t("common.viewAll")} ({sorted.length})
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { mode } = useTradingMode();
  // Gold portfolio uses the same page — the backend filters by assetType via the user's positions
  // The portfolio API already returns positions; in gold mode, positions have assetType=GOLD and symbol like GOLD_21K
  const { t } = useLanguage();
  const router = useRouter();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // Per-section independent range states
  const [timelineRange, setTimelineRange] = useState<DateRange>("1M");
  const [allocRange, setAllocRange] = useState<DateRange>("1M");
  const [allocExpanded, setAllocExpanded] = useState(false);
  const [positionsExpanded, setPositionsExpanded] = useState(false);
  const [positionsRange, setPositionsRange] = useState<DateRange>("1M");
  const [closedRange, setClosedRange] = useState<DateRange>("1M");
  const [tradingHistoryRange, setTradingHistoryRange] = useState<DateRange>("ALL");
  const [realizedRange, setRealizedRange] = useState<DateRange>("1M");

  // Fetch ALL data once — no refetch on range change
  const { data: portfolio, isLoading, isError } = usePortfolio();
  const { data: analytics } = useAnalytics();
  const { data: allTimeline, isLoading: timelineLoading } = useTimeline();
  const { data: allClosedPositions = [] } = useClosedPositions();

  const positionSymbols = (portfolio?.positions ?? []).map((p) => p.symbol);
  const { prices } = usePriceStream(positionSymbols);

  // All unique symbols from transactions (for fetching price histories)
  const allTradedSymbols = useMemo(() => {
    const syms = new Set<string>();
    for (const tx of analytics?.transactions ?? []) syms.add(tx.symbol);
    return Array.from(syms);
  }, [analytics?.transactions]);
  const { priceMap: fetchedPriceMap, isLoading: priceHistoriesLoading } = useAllPriceHistories(allTradedSymbols);

  // Build accurate timeline from transactions + real price history
  const fullTimeline = useMemo(() => {
    // Wait for price histories to load before computing
    if (priceHistoriesLoading && fetchedPriceMap.size === 0) {
      return allTimeline ?? [];
    }

    const allPositions = analytics?.positions ?? [];
    const txs = analytics?.transactions ?? [];
    const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Build price history per symbol: fetched price history > graphData > transaction prices
    const priceBySymbol = new Map<string, Map<string, number>>();

    // 1. Start with fetched price histories (most complete — daily data)
    for (const [symbol, pm] of fetchedPriceMap) {
      priceBySymbol.set(symbol, new Map(pm));
    }

    // 2. Add graphData prices (fill gaps)
    for (const pos of allPositions) {
      if (!priceBySymbol.has(pos.symbol)) priceBySymbol.set(pos.symbol, new Map());
      const pm = priceBySymbol.get(pos.symbol)!;
      for (const g of pos.graphData ?? []) {
        const d = new Date(String(g.timestamp)).toISOString().slice(0, 10);
        if (!pm.has(d)) pm.set(d, Number(g.price));
      }
      if (pos.currentPrice != null) {
        const today = new Date().toISOString().slice(0, 10);
        if (!pm.has(today)) pm.set(today, pos.currentPrice);
      }
    }

    // 3. Add transaction prices (last resort — fill remaining gaps)
    for (const tx of sortedTxs) {
      const d = new Date(tx.date).toISOString().slice(0, 10);
      const price = parseFloat(tx.price);
      if (!priceBySymbol.has(tx.symbol)) priceBySymbol.set(tx.symbol, new Map());
      const pm = priceBySymbol.get(tx.symbol)!;
      if (!pm.has(d)) pm.set(d, price);
    }

    // Sanity check: if API price is wildly different from tx price (>3x), discard that symbol's API data
    // (means the API returned wrong data for that ticker)
    const badSymbols = new Set<string>();
    const symbolChecked = new Set<string>();
    for (const tx of sortedTxs) {
      if (symbolChecked.has(tx.symbol)) continue;
      symbolChecked.add(tx.symbol);
      const pm = priceBySymbol.get(tx.symbol);
      if (!pm) continue;
      const txDate = new Date(tx.date).toISOString().slice(0, 10);
      const apiPrice = pm.get(txDate);
      if (apiPrice != null && apiPrice > 0) {
        const txP = parseFloat(tx.price);
        const ratio = txP / apiPrice;
        if (ratio > 3 || ratio < 0.33) {
          badSymbols.add(tx.symbol);
        }
      }
    }
    // For bad symbols, replace API data with transaction-only prices
    for (const sym of badSymbols) {
      const pm = new Map<string, number>();
      for (const tx of sortedTxs) {
        if (tx.symbol !== sym) continue;
        const d = new Date(tx.date).toISOString().slice(0, 10);
        pm.set(d, parseFloat(tx.price));
      }
      priceBySymbol.set(sym, pm);
    }

    // Collect all unique dates
    const allDatesSet = new Set<string>();
    for (const [, pm] of priceBySymbol) {
      for (const d of pm.keys()) allDatesSet.add(d);
    }
    for (const tx of sortedTxs) {
      allDatesSet.add(new Date(tx.date).toISOString().slice(0, 10));
    }
    const allDates = Array.from(allDatesSet).sort();

    if (allDates.length < 2 && sortedTxs.length < 2) return allTimeline ?? [];

    // Walk through dates, tracking holdings and computing portfolio value
    const holdings = new Map<string, { qty: number; totalCost: number }>(); // symbol → { qty, totalCost }
    let txIdx = 0;

    // Helper: get nearest known price for a symbol, preferring on/before the date
    function getPrice(symbol: string, date: string): number | null {
      const pm = priceBySymbol.get(symbol);
      if (!pm) return null;
      const exact = pm.get(date);
      if (exact != null) return exact;
      // Find closest date on or before target; if none, use closest after
      let bestBefore: number | null = null;
      let bestBeforeDiff = Infinity;
      let bestAny: number | null = null;
      let bestAnyDiff = Infinity;
      const targetMs = new Date(date).getTime();
      for (const [d, p] of pm) {
        const dMs = new Date(d).getTime();
        const diff = Math.abs(dMs - targetMs);
        if (dMs <= targetMs && diff < bestBeforeDiff) { bestBeforeDiff = diff; bestBefore = p; }
        if (diff < bestAnyDiff) { bestAnyDiff = diff; bestAny = p; }
      }
      return bestBefore ?? bestAny;
    }

    const pts: TimelinePoint[] = [];
    for (const date of allDates) {
      // Process all transactions on or before this date
      while (txIdx < sortedTxs.length) {
        const txDate = new Date(sortedTxs[txIdx].date).toISOString().slice(0, 10);
        if (txDate > date) break;
        const tx = sortedTxs[txIdx];
        const qty = parseFloat(tx.quantity);
        const price = parseFloat(tx.price);
        const h = holdings.get(tx.symbol) ?? { qty: 0, totalCost: 0 };
        if (tx.type === "BUY") {
          h.qty += qty;
          h.totalCost += qty * price;
        } else {
          if (h.qty > 0) {
            const avgCost = h.totalCost / h.qty;
            h.qty = Math.max(0, h.qty - qty);
            h.totalCost = h.qty * avgCost;
          }
        }
        holdings.set(tx.symbol, h);
        txIdx++;
      }

      // Compute portfolio value = sum(qty * currentPrice) for all held symbols
      let totalValue = 0;
      let totalInvested = 0;
      for (const [symbol, h] of holdings) {
        if (h.qty <= 0.001) continue;
        totalInvested += h.totalCost;
        const p = getPrice(symbol, date);
        if (p != null) {
          totalValue += h.qty * p;
        } else {
          // No price data — use cost basis as fallback
          totalValue += h.totalCost;
        }
      }

      if (totalValue > 0 || totalInvested > 0) {
        pts.push({ timestamp: date, totalValue, totalInvested });
      }
    }

    // DEBUG: show price map state and timeline values
    console.log("[TL3] fetchedPriceMap size:", fetchedPriceMap.size, "symbols:", Array.from(fetchedPriceMap.keys()));
    for (const [sym, pm] of fetchedPriceMap) {
      const prices = Array.from(pm.values());
      console.log(`[TL3] ${sym}: ${pm.size} prices, range ${Math.min(...prices).toFixed(2)} - ${Math.max(...prices).toFixed(2)}`);
    }
    console.log("[TL3] bad symbols:", Array.from(badSymbols));
    console.log("[TL3] Total pts:", pts.length);
    // Show every 30th point to see value progression
    const sampledPts = pts.filter((_, i) => i % 30 === 0 || i === pts.length - 1);
    console.log("[TL3] Value progression:", sampledPts.map(p => `${p.timestamp}: v=${Number(p.totalValue).toFixed(0)} i=${Number(p.totalInvested).toFixed(0)}`));
    if (pts.length >= 2) return pts;

    return allTimeline ?? [];
  }, [allTimeline, analytics, fetchedPriceMap, priceHistoriesLoading]);

  // Filter timeline by its own range (client-side)
  const effectiveTimeline = useMemo(() => {
    if (timelineRange === "ALL") return fullTimeline;
    const cutoffMs = Date.now() - (RANGE_DAYS[timelineRange] ?? 30) * 86400000;
    return fullTimeline.filter(p => new Date(p.timestamp).getTime() >= cutoffMs);
  }, [fullTimeline, timelineRange]);

  // Filter timeline for Trading History chart (separate range)
  const tradingHistoryTimeline = useMemo(() => {
    if (tradingHistoryRange === "ALL") return fullTimeline;
    const cutoffMs = Date.now() - (RANGE_DAYS[tradingHistoryRange] ?? 30) * 86400000;
    return fullTimeline.filter(p => new Date(p.timestamp).getTime() >= cutoffMs);
  }, [fullTimeline, tradingHistoryRange]);

  // Filter closed positions by their own range
  const closedPositions = useMemo(() => {
    if (closedRange === "ALL") return [...allClosedPositions].sort((a, b) => {
      const da = new Date(a.closeDate ?? a.lastSellDate ?? 0).getTime();
      const db = new Date(b.closeDate ?? b.lastSellDate ?? 0).getTime();
      return db - da;
    });
    const cutoffMs = Date.now() - (RANGE_DAYS[closedRange] ?? 30) * 86400000;
    return allClosedPositions.filter((cp) => {
      const d = cp.closeDate ?? cp.lastSellDate;
      return d && new Date(d).getTime() >= cutoffMs;
    }).sort((a, b) => {
      const da = new Date(a.closeDate ?? a.lastSellDate ?? 0).getTime();
      const db = new Date(b.closeDate ?? b.lastSellDate ?? 0).getTime();
      return db - da;
    });
  }, [allClosedPositions, closedRange]);

  const analyticsMap = useMemo(
    () =>
      new Map(
        (analytics?.positions ?? []).map((p) => [p.symbol, p])
      ),
    [analytics]
  );

  const filteredPositions = useMemo(() => {
    return reconstructPositionsForRange(analytics ?? null, positionsRange);
  }, [analytics, positionsRange]);

  // Summary values
  const pv = analytics?.portfolioValue;
  const currentInvested = pv ? parseFloat(String(pv.totalInvested)) : (portfolio?.totalValue ?? 0);
  const unrealized = pv ? parseFloat(String(pv.totalUnrealized)) : (portfolio?.totalPnl ?? 0);
  const realized = pv && pv.totalRealized != null ? parseFloat(String(pv.totalRealized)) : null;
  const totalPnl = pv ? parseFloat(String(pv.totalPnL)) : (portfolio?.totalPnl ?? 0);
  // Capital Deployed = net cash outflow (buys - sell proceeds) = actual money from pocket in market
  // Total Traded = sum of all BUY costs (counts recycled capital)
  const { capitalDeployed, totalTraded } = useMemo(() => {
    const txs = analytics?.transactions ?? [];
    if (txs.length === 0) return { capitalDeployed: currentInvested, totalTraded: currentInvested };
    let buys = 0, sellProceeds = 0;
    for (const tx of txs) {
      const amount = parseFloat(tx.quantity) * parseFloat(tx.price);
      if (tx.type === "BUY") buys += amount;
      else sellProceeds += amount;
    }
    return { capitalDeployed: Math.max(0, buys - sellProceeds), totalTraded: buys };
  }, [currentInvested, analytics]);

  // rangeBtns removed — each section uses its own SectionRangeBtns

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 pb-24 sm:pb-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <StatCard
            label={t("analytics.portfolioValue")}
            value={`EGP ${(currentInvested + unrealized).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          />
          <StatCard
            label={t("portfolio.capitalDeployed")}
            value={`EGP ${capitalDeployed.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
            sub={`${t("portfolio.totalTraded")}: EGP ${totalTraded.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
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
          range={timelineRange}
          onRangeChange={setTimelineRange}
          loading={timelineLoading}
        />

        {/* Trading History */}
        {tradingHistoryTimeline.length >= 2 && (() => {
          const txs = analytics?.transactions ?? [];
          const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Find first buy and last sell per symbol
          const firstBuyBySymbol = new Map<string, { date: string; symbol: string; qty: number; price: number; total: number }>();
          const lastSellBySymbol = new Map<string, { date: string; symbol: string; qty: number; price: number; total: number }>();
          for (const tx of sortedTxs) {
            const qty = parseFloat(tx.quantity);
            const price = parseFloat(tx.price);
            const entry = { date: new Date(tx.date).toLocaleDateString(), symbol: tx.symbol, qty, price, total: qty * price };
            if (tx.type === "BUY" && !firstBuyBySymbol.has(tx.symbol)) firstBuyBySymbol.set(tx.symbol, entry);
            if (tx.type === "SELL") lastSellBySymbol.set(tx.symbol, entry);
          }

          // Build marker dates map
          const markerByDate = new Map<string, { symbol: string; type: "BUY" | "SELL"; qty: number; price: number; total: number }[]>();
          for (const [, m] of firstBuyBySymbol) {
            if (!markerByDate.has(m.date)) markerByDate.set(m.date, []);
            markerByDate.get(m.date)!.push({ symbol: m.symbol, type: "BUY", qty: m.qty, price: m.price, total: m.total });
          }
          for (const [, m] of lastSellBySymbol) {
            if (!markerByDate.has(m.date)) markerByDate.set(m.date, []);
            markerByDate.get(m.date)!.push({ symbol: m.symbol, type: "SELL", qty: m.qty, price: m.price, total: m.total });
          }

          // Interpolation for missing dates
          const timelineDates = new Set(tradingHistoryTimeline.map(p => new Date(p.timestamp).toLocaleDateString()));
          const missingDates: { date: string; ts: number }[] = [];
          markerByDate.forEach((_, dateStr) => {
            if (!timelineDates.has(dateStr)) {
              const ts = new Date(dateStr).getTime();
              if (!isNaN(ts)) missingDates.push({ date: dateStr, ts });
            }
          });

          const sortedTL = tradingHistoryTimeline.map(p => ({ ts: new Date(p.timestamp).getTime(), val: Number(p.totalValue), inv: Number(p.totalInvested ?? 0) })).sort((a, b) => a.ts - b.ts);
          function interpValue(ts: number): { val: number; inv: number } {
            if (sortedTL.length === 0) return { val: 0, inv: 0 };
            let closest = sortedTL[0];
            let minDiff = Math.abs(ts - closest.ts);
            for (const h of sortedTL) {
              const diff = Math.abs(ts - h.ts);
              if (diff < minDiff) { minDiff = diff; closest = h; }
            }
            return { val: closest.val, inv: closest.inv };
          }

          type HistPoint = { date: string; ts: number; value: number; invested: number };
          const allPts: HistPoint[] = [
            ...tradingHistoryTimeline.map(p => ({
              date: new Date(p.timestamp).toLocaleDateString(),
              ts: new Date(p.timestamp).getTime(),
              value: Number(p.totalValue),
              invested: Number(p.totalInvested ?? 0),
            })),
            ...missingDates.map(m => { const iv = interpValue(m.ts); return { date: m.date, ts: m.ts, value: iv.val, invested: iv.inv }; }),
          ].sort((a, b) => a.ts - b.ts);

          const seen = new Set<string>();
          const dedupedPts = allPts.filter(p => { if (seen.has(p.date)) return false; seen.add(p.date); return true; });

          // Track holding state
          let runHoldingQty = 0;
          const posQty = new Map<string, number>();
          const txsByDateAll = new Map<string, typeof sortedTxs>();
          for (const tx of sortedTxs) {
            const d = new Date(tx.date).toLocaleDateString();
            if (!txsByDateAll.has(d)) txsByDateAll.set(d, []);
            txsByDateAll.get(d)!.push(tx);
          }

          const historyData = dedupedPts.map(p => {
            const dayTxs = txsByDateAll.get(p.date);
            if (dayTxs) {
              for (const tx of dayTxs) {
                const qty = parseFloat(tx.quantity);
                const cur = posQty.get(tx.symbol) ?? 0;
                if (tx.type === "BUY") { posQty.set(tx.symbol, cur + qty); runHoldingQty += qty; }
                else { posQty.set(tx.symbol, Math.max(0, cur - qty)); runHoldingQty = Math.max(0, runHoldingQty - qty); }
              }
              txsByDateAll.delete(p.date);
            }
            const markers = markerByDate.get(p.date);
            const val = p.value;
            const inv = p.invested;
            const holding = runHoldingQty > 0;
            const isProfit = holding && inv > 0 && val > inv;
            const isLoss = holding && inv > 0 && val < inv;
            return {
              date: p.date,
              shortDate: new Date(p.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              value: val,
              invested: inv,
              holdingProfit: isProfit ? val : null,
              holdingLoss: isLoss ? val : null,
              holdingNeutral: holding && !isProfit && !isLoss ? val : null,
              tradeMarker: markers && markers.length > 0 ? val : null,
              markers: markers ?? [],
            };
          });

          // Y domain
          const allValues = dedupedPts.map(p => p.value).filter(v => v > 0);
          const allInvested = dedupedPts.map(p => p.invested).filter(v => v > 0);
          const allNums = [...allValues, ...allInvested];
          const yMin = allNums.length > 0 ? Math.min(...allNums) : 0;
          const yMax = allNums.length > 0 ? Math.max(...allNums) : 1;
          const yPad = (yMax - yMin) * 0.15 || yMax * 0.05;
          const domainMin = Math.max(0, yMin - yPad);
          const domainMax = yMax + yPad;

          const latestInvested = dedupedPts.length > 0 ? dedupedPts[dedupedPts.length - 1].invested : 0;

          // Summary stats for header
          const latestValue = dedupedPts.length > 0 ? dedupedPts[dedupedPts.length - 1].value : 0;
          const totalPnl = latestValue - latestInvested;
          const totalPnlPct = latestInvested > 0 ? (totalPnl / latestInvested) * 100 : 0;
          const totalBuysCount = Array.from(firstBuyBySymbol.values()).length;
          const totalSellsCount = Array.from(lastSellBySymbol.values()).length;

          return (
            <div className="bg-gradient-to-b from-gray-900 to-gray-900/95 rounded-2xl border border-gray-800/60 overflow-hidden">
              {/* Header */}
              <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold text-white">{t("pos.tradingHistory")}</h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-500">{totalBuysCount} {t("common.buy")}{totalBuysCount !== 1 ? "s" : ""} · {totalSellsCount} {t("common.sell")}{totalSellsCount !== 1 ? "s" : ""}</span>
                        {latestInvested > 0 && (
                          <span className={`text-[11px] font-semibold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl)} ({totalPnl >= 0 ? "+" : ""}{totalPnlPct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <RangeSelector range={tradingHistoryRange} onChange={setTradingHistoryRange} ranges={["1M", "3M", "6M", "1Y", "ALL"]} />
                </div>
              </div>

              {/* Chart */}
              <div className="px-2 sm:px-4 pb-2" dir="ltr">
                <ResponsiveContainer width="100%" height={300} className="sm:!h-[420px]">
                  <ComposedChart data={historyData} margin={{ top: 10, right: 56, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="thValueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="thProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="50%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="thLossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                        <stop offset="50%" stopColor="#ef4444" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="thNeutralGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6b7280" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6b7280" stopOpacity={0.02} />
                      </linearGradient>
                      <filter id="thGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" strokeOpacity={0.6} vertical={false} />
                    <XAxis dataKey="shortDate" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: string, i: number) => (i % Math.ceil(historyData.length / 8) === 0 ? v : "")} />
                    <YAxis tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} width={52}
                      domain={[domainMin, domainMax]}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)} />
                    <Tooltip
                      cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
                      content={({ active, payload: tp }) => {
                        if (!active || !tp?.length) return null;
                        const d = tp[0]?.payload;
                        if (!d) return null;
                        const markers = d.markers as { symbol: string; type: string; qty: number; price: number; total: number }[];
                        const pnl = d.value - d.invested;
                        const pnlPct = d.invested > 0 ? (pnl / d.invested) * 100 : 0;
                        return (
                          <div className="backdrop-blur-sm" style={{ background: "rgba(17,24,39,0.95)", border: markers.length > 0 ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(55,65,81,0.6)", borderRadius: 12, padding: "12px 16px", minWidth: 190, maxWidth: "calc(100vw - 40px)", boxShadow: markers.length > 0 ? "0 4px 24px rgba(59,130,246,0.15)" : "0 4px 16px rgba(0,0,0,0.3)" }}>
                            <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{d.date}</p>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                              <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{fmt(d.value)}</span>
                              {d.invested > 0 && (
                                <span style={{ color: pnl >= 0 ? "#6ee7b7" : "#fca5a5", fontSize: 12, fontWeight: 600 }}>
                                  {pnl >= 0 ? "+" : ""}{fmt(pnl)} ({pnl >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                            {d.invested > 0 && (
                              <p style={{ color: "#6b7280", fontSize: 10, marginBottom: markers.length > 0 ? 10 : 0 }}>
                                {t("pos.costBasis")}: {fmt(d.invested)}
                              </p>
                            )}
                            {markers.length > 0 && <div style={{ borderTop: "1px solid rgba(55,65,81,0.5)", marginBottom: 8 }} />}
                            {markers.map((tr, i) => {
                              const isBuy = tr.type === "BUY";
                              return (
                                <div key={i} style={{ background: isBuy ? "rgba(249,115,22,0.1)" : "rgba(16,185,129,0.1)", borderRadius: 8, padding: "8px 10px", marginBottom: i < markers.length - 1 ? 4 : 0, borderLeft: `3px solid ${isBuy ? "#f97316" : "#10b981"}` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: isBuy ? "#fdba74" : "#6ee7b7", fontSize: 11, fontWeight: 700 }}>{isBuy ? "BUY" : "SELL"} {tr.symbol}</span>
                                    <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{fmt(tr.total)}</span>
                                  </div>
                                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{tr.qty} × {fmt(tr.price)}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    {/* Holding period shading */}
                    <Area type="monotone" dataKey="holdingProfit" stroke="none" fill="url(#thProfitGrad)" strokeWidth={0} dot={false} activeDot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="holdingLoss" stroke="none" fill="url(#thLossGrad)" strokeWidth={0} dot={false} activeDot={false} connectNulls={false} />
                    <Area type="monotone" dataKey="holdingNeutral" stroke="none" fill="url(#thNeutralGrad)" strokeWidth={0} dot={false} activeDot={false} connectNulls={false} />
                    {/* Portfolio value line */}
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#thValueGrad)" strokeWidth={2} dot={false}
                      activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1e3a5f", strokeWidth: 3 }} filter="url(#thGlow)" />
                    {/* Cost basis reference line */}
                    {latestInvested > 0 && (
                      <ReferenceLine y={latestInvested} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1} strokeOpacity={0.6}
                        label={{ value: `${t("pos.costBasis")}: ${fmt(latestInvested)}`, fill: "#f59e0b", fontSize: 10, position: "right" }} />
                    )}
                    {/* Trade markers — pill labels with smart layout */}
                    <Scatter dataKey="tradeMarker" fill="transparent" shape={(props: { cx?: number; cy?: number; payload?: { tradeMarker: unknown; date: string; markers: { symbol: string; type: string; qty: number; price: number; total: number }[] } }) => {
                      if (!props.payload?.tradeMarker) return <g />;
                      const cx = props.cx ?? 0;
                      const cy = props.cy ?? 0;
                      const markers = props.payload.markers ?? [];
                      const buys = markers.filter(m => m.type === "BUY");
                      const sells = markers.filter(m => m.type === "SELL");
                      const hasBuys = buys.length > 0;
                      const hasSells = sells.length > 0;
                      const pillH = 15;
                      const pillGap = 2;

                      // For buys: show up to 2 individual pills above, then "+N more"
                      const maxShow = 2;
                      const buyShow = buys.slice(0, maxShow);
                      const buyExtra = buys.length - maxShow;
                      const sellShow = sells.slice(0, maxShow);
                      const sellExtra = sells.length - maxShow;

                      return (
                        <g>
                          {/* Vertical line */}
                          {hasBuys && <line x1={cx} y1={cy - 6} x2={cx} y2={Math.max(0, cy - 10 - buyShow.length * (pillH + pillGap) - (buyExtra > 0 ? pillH + pillGap : 0))} stroke="#f97316" strokeWidth={1} strokeDasharray="3 2" opacity={0.3} />}
                          {hasSells && <line x1={cx} y1={cy + 6} x2={cx} y2={cy + 10 + sellShow.length * (pillH + pillGap) + (sellExtra > 0 ? pillH + pillGap : 0)} stroke="#10b981" strokeWidth={1} strokeDasharray="3 2" opacity={0.} />}
                          {/* Dot */}
                          <circle cx={cx} cy={cy} r={4} fill={hasBuys ? "#f97316" : "#10b981"} stroke="#111827" strokeWidth={1.5} />
                          {/* Buy pills — stacked above the dot */}
                          {buyShow.map((b, i) => {
                            const w = Math.min(42, Math.max(30, b.symbol.length * 6.5 + 8));
                            const py = cy - 10 - (i + 1) * (pillH + pillGap) + pillGap;
                            return (
                              <g key={`b${i}`}>
                                <rect x={cx - w / 2} y={py} width={w} height={pillH} rx={4} fill="#f97316" opacity={0.85} />
                                <text x={cx} y={py + pillH / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={8} fontWeight="bold">
                                  {b.symbol.length > 5 ? b.symbol.slice(0, 5) : b.symbol}
                                </text>
                              </g>
                            );
                          })}
                          {buyExtra > 0 && (() => {
                            const py = cy - 10 - (maxShow + 1) * (pillH + pillGap) + pillGap;
                            return (
                              <g>
                                <rect x={cx - 16} y={py} width={32} height={pillH} rx={4} fill="#f97316" opacity={0.5} />
                                <text x={cx} y={py + pillH / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={7} fontWeight="bold">+{buyExtra}</text>
                              </g>
                            );
                          })()}
                          {/* Sell pills — stacked below the dot */}
                          {sellShow.map((s, i) => {
                            const w = Math.min(42, Math.max(30, s.symbol.length * 6.5 + 8));
                            const py = cy + 10 + i * (pillH + pillGap);
                            return (
                              <g key={`s${i}`}>
                                <rect x={cx - w / 2} y={py} width={w} height={pillH} rx={4} fill="#10b981" opacity={0.85} />
                                <text x={cx} y={py + pillH / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={8} fontWeight="bold">
                                  {s.symbol.length > 5 ? s.symbol.slice(0, 5) : s.symbol}
                                </text>
                              </g>
                            );
                          })}
                          {sellExtra > 0 && (() => {
                            const py = cy + 10 + maxShow * (pillH + pillGap);
                            return (
                              <g>
                                <rect x={cx - 16} y={py} width={32} height={pillH} rx={4} fill="#10b981" opacity={0.5} />
                                <text x={cx} y={py + pillH / 2} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={7} fontWeight="bold">+{sellExtra}</text>
                              </g>
                            );
                          })()}
                        </g>
                      );
                    }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend */}
              <div className="px-4 sm:px-6 pb-4 pt-1">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="w-5 h-[2px] bg-blue-500 inline-block rounded-full" /> {t("analytics.portfolioOverTime")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 bg-orange-500 inline-block rounded text-[7px] text-white font-bold text-center leading-3">B</span> {t("common.buy")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3 bg-emerald-500 inline-block rounded text-[7px] text-white font-bold text-center leading-3">S</span> {t("common.sell")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-2 bg-emerald-500/30 inline-block rounded-sm" /> {t("common.profit")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-2 bg-red-500/30 inline-block rounded-sm" /> {t("common.loss")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t border-dashed border-yellow-500/60 inline-block" /> {t("pos.costBasis")}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Portfolio Weight by Symbol — Enhanced */}
        {(() => {
          const ALLOC_COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#84cc16","#ec4899","#a78bfa"];
          const allocPositions = reconstructPositionsForRange(analytics ?? null, allocRange);
          const allocTotal = allocPositions.reduce((sum, p) => {
            const qty = parseFloat(String(p.totalQuantity));
            if (qty <= 0.0001) return sum;
            const isSold = !!(p as AnalyticsPosition & { _isClosed?: boolean })._isClosed;
            const price = isSold ? parseFloat(String(p.averagePrice)) : (p.currentPrice ?? parseFloat(String(p.averagePrice)));
            return sum + qty * price;
          }, 0);
          const allocBySymbol = allocPositions
            .filter(p => parseFloat(String(p.totalQuantity)) > 0.0001)
            .map(p => {
              const qty = parseFloat(String(p.totalQuantity));
              const isSold = !!(p as AnalyticsPosition & { _isClosed?: boolean })._isClosed;
              const price = isSold ? parseFloat(String(p.averagePrice)) : (p.currentPrice ?? parseFloat(String(p.averagePrice)));
              const value = qty * price;
              return { symbol: p.symbol, name: isSold ? `${p.symbol}` : p.symbol, value, percentage: allocTotal > 0 ? (value / allocTotal) * 100 : 0, isSold, qty };
            })
            .sort((a, b) => b.value - a.value);
          if (allocBySymbol.length === 0) return null;
          const fmtValue = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0);
          return (
          <div className="bg-gray-900 rounded-xl p-3 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-white font-semibold text-sm">{t("analytics.symbolAlloc")}</h2>
                <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{t("analytics.symbolAllocSub")}</p>
              </div>
              <SectionRangeBtns range={allocRange} setRange={setAllocRange} />
            </div>

            <div dir="ltr" className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
              {/* Donut chart */}
              <div className="relative flex-shrink-0 mx-auto md:mx-0 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocBySymbol}
                      dataKey="percentage"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="90%"
                      paddingAngle={allocBySymbol.length > 1 ? 3 : 0}
                      stroke="none"
                      animationBegin={0}
                      animationDuration={600}
                    >
                      {allocBySymbol.map((_, i) => (
                        <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                      formatter={(v: unknown, _: unknown, props: { payload?: { payload?: { value?: number } } }) => [
                        `${(v as number).toFixed(1)}%  ·  EGP ${(((props.payload?.payload as { value?: number })?.value ?? 0)).toLocaleString()}`,
                        t("analytics.symbolAlloc"),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-gray-600 text-[8px] sm:text-[10px] uppercase tracking-wider">{t("common.total")}</span>
                  <span className="text-white text-sm sm:text-lg font-bold">EGP {fmtValue(allocTotal)}</span>
                  <span className="text-gray-500 text-[9px] sm:text-[11px]">{allocBySymbol.length} {t("analytics.symbols")}</span>
                </div>
              </div>

              {/* Legend cards */}
              <div className="flex-1 w-full space-y-2">
                {(allocExpanded ? allocBySymbol : allocBySymbol.slice(0, 5)).map((item, i) => {
                  const color = ALLOC_COLORS[i % ALLOC_COLORS.length];
                  return (
                    <div key={item.name} className="flex items-center gap-2 sm:gap-3 bg-gray-800/50 rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 hover:bg-gray-800 transition-colors">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-xs sm:text-sm font-semibold">{item.symbol}</span>
                          {item.isSold && <span className="px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold bg-gray-700 text-gray-400 uppercase">Sold</span>}
                        </div>
                        <span className="text-gray-500 text-[10px] sm:text-xs truncate block">{item.qty} shares · EGP {item.value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                      {/* Percentage bar */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <div className="w-10 sm:w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: color }} />
                        </div>
                        <span className="text-white text-xs sm:text-sm font-semibold w-10 sm:w-12 text-right">{item.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
                {allocBySymbol.length > 5 && (
                  <button
                    onClick={() => setAllocExpanded(!allocExpanded)}
                    className="w-full py-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {allocExpanded ? `Show less` : `Show more (${allocBySymbol.length - 5})`}
                  </button>
                )}
              </div>
            </div>
          </div>
          );
        })()}

        {/* Positions table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-800 gap-2">
            <h2 className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest">
              {t("portfolio.positions")}
              <span className="text-gray-600 ml-2">{filteredPositions.length}</span>
            </h2>
            <div className="flex items-center gap-2 sm:gap-3">
              <SectionRangeBtns range={positionsRange} setRange={setPositionsRange} />
              <Link href="/portfolio/transactions" className="text-[11px] sm:text-xs text-blue-400 hover:text-blue-300 font-medium whitespace-nowrap">
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
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {(positionsExpanded ? filteredPositions : filteredPositions.slice(0, 5)).map((pos) => {
                  const isSold = !!(pos as AnalyticsPosition & { _isClosed?: boolean })._isClosed;
                  const live = prices[pos.symbol];
                  const currentPrice =
                    live?.price ?? pos.currentPrice ?? 0;
                  const qty = parseFloat(String(pos.totalQuantity));
                  const avgCost = parseFloat(String(pos.averagePrice));
                  const invested = parseFloat(String(pos.totalInvested));
                  const marketValue = isSold ? 0 : currentPrice * qty;
                  const pnl = parseFloat(String(pos.unrealizedPnL ?? "0"));
                  const realizedPnl = parseFloat(String(pos.realizedPnL ?? "0"));
                  const displayPnl = isSold ? realizedPnl : pnl;
                  const pnlPct =
                    pos.returnPercent != null
                      ? parseFloat(String(pos.returnPercent))
                      : invested > 0
                      ? (displayPnl / invested) * 100
                      : 0;
                  const isPos = displayPnl >= 0;
                  const isExpanded = expandedSymbol === pos.symbol;

                  // Advanced metrics
                  const breakEven = pos.breakEvenPrice != null ? parseFloat(String(pos.breakEvenPrice)) : avgCost;
                  const beGap = breakEven > 0 ? ((currentPrice - breakEven) / breakEven) * 100 : null;
                  const daysHeld = pos.daysSinceFirstBuy ?? null;
                  const feesPaid = pos.totalFeesPaid != null ? parseFloat(String(pos.totalFeesPaid)) : null;
                  const portPct = pos.portfolioContributionPct != null ? parseFloat(String(pos.portfolioContributionPct)) : null;

                  return (
                    <React.Fragment key={pos.symbol}>
                      <tr
                        className={`td-row border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer ${isSold ? "opacity-60" : ""}`}
                        onClick={() => router.push(`/portfolio/positions/${pos.symbol}`)}
                      >
                        <td className="px-3 sm:px-4 py-3 font-bold text-white">
                          <div className="flex items-center gap-2">
                          <Link
                            href={`/stocks/${pos.symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-400 transition-colors"
                          >
                            {pos.symbol}
                          </Link>
                          {isSold && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-700 text-gray-400">SOLD</span>}
                          </div>
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
                            {fmt(Math.abs(displayPnl))}
                          </span>
                          {isSold && <span className="text-[10px] text-gray-500">{t("portfolio.realizedPnl")}</span>}
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
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedSymbol(isExpanded ? null : pos.symbol); }}
                            className="text-gray-600 hover:text-gray-300 transition-colors p-1"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
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
            {filteredPositions.length > 5 && (
              <button
                onClick={() => setPositionsExpanded(!positionsExpanded)}
                className="w-full py-3 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors border-t border-gray-800"
              >
                {positionsExpanded ? `Show less` : `Show more (${filteredPositions.length - 5})`}
              </button>
            )}
            </div>
          )}
        </div>

        {/* ── Closed Positions ─────────────────────────────────────── */}
        {closedPositions.length > 0 && (
          <div className="space-y-4">
            {/* P&L bar chart */}
            <div className="bg-gray-900 rounded-xl p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-white font-semibold text-sm">{t("closed.sectionTitle")}</h2>
                  <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5">{t("closed.sectionSub")}</p>
                </div>
                <SectionRangeBtns range={closedRange} setRange={setClosedRange} />
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
                  </tr>
                </thead>
                <tbody>
                  {closedPositions.slice(0, 5).map((cp) => {
                    const profit = parseFloat(cp.totalProfit);
                    const isWin = profit >= 0;
                    const retPct = cp.returnPct != null ? parseFloat(cp.returnPct) : null;
                    const displayDate = cp.isClosed ? cp.closeDate : cp.lastSellDate;
                    return (
                      <tr key={cp.symbol} className="td-row border-b border-gray-800/60 cursor-pointer" onClick={() => router.push(`/portfolio/positions/${cp.symbol}`)}>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {closedPositions.length > 5 && (
                <div className="px-4 py-3 border-t border-gray-800 text-center">
                  <Link href="/portfolio/closed-positions" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                    {t("common.viewAll")} ({closedPositions.length})
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Realized P&L Detail Table ─────────────────────────── */}
        <RealizedGainsTable range={realizedRange} onRangeChange={setRealizedRange} />
      </main>
    </AppShell>
  );
}
