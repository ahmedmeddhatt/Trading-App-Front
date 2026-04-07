"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, BarChart2, Loader2, AlertCircle,
  Target, Clock, DollarSign, Award, Activity, Zap, ChevronDown, ChevronUp,
  AlertTriangle, Info, CheckCircle, Shield, Calendar,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, Legend, ReferenceLine,
  PieChart, Pie, ScatterChart, Scatter, ZAxis, Area, AreaChart,
  LabelList,
} from "recharts";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
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

function useAnalytics() {
  return useQuery<Analytics | null>({
    queryKey: ["portfolio", "analytics"],
    queryFn: () => apiClient.get<Analytics | null>("/api/portfolio/analytics"),
    retry: 1,
  });
}

function useTimeline(range: ExtendedRange) {
  const { from, to } = useMemo(() => {
    const t = new Date();
    const to = t.toISOString().slice(0, 10);
    if (range === "ALL") return { from: "2000-01-01", to };
    const f = new Date(t);
    const days: Record<DateRange, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
    f.setDate(f.getDate() - days[range]);
    return { from: f.toISOString().slice(0, 10), to };
  }, [range]);

  return useQuery<TimelinePoint[]>({
    queryKey: ["portfolio", "timeline", range],
    queryFn: async () => {
      const r = await apiClient.get<unknown>(`/api/portfolio/timeline?from=${from}&to=${to}`);
      if (Array.isArray(r)) return r as TimelinePoint[];
      const tl = (r as { timeline?: TimelinePoint[] })?.timeline;
      return Array.isArray(tl) ? tl : [];
    },
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
    <div className="bg-gray-900 rounded-xl p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${iconColors[color]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs">{label}</p>
        <p className={`text-lg font-bold mt-0.5 truncate ${
          positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400"
        }`}>{value}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-white font-semibold text-sm">{title}</h2>
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
  const [range, setRange] = useState<ExtendedRange>("1M");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline(range);

  const pv = analytics?.portfolioValue;
  const totalInvested = pv ? parseFloat(String(pv.totalInvested)) : 0;
  const totalUnrealized = pv ? parseFloat(String(pv.totalUnrealized)) : 0;
  const totalRealized = pv && pv.totalRealized != null ? parseFloat(String(pv.totalRealized)) : 0;
  const totalPnL = pv ? parseFloat(String(pv.totalPnL)) : 0;
  const netPnL = analytics?.netPnL ? parseFloat(analytics.netPnL) : null;
  const fees = analytics?.totalFeesPaid ? parseFloat(analytics.totalFeesPaid) : 0;

  // Positions sorted by return%
  const positions = useMemo(() => {
    return (analytics?.positions ?? [])
      .map((p) => {
        const invested = parseFloat(String(p.totalInvested));
        const unrealized = parseFloat(String(p.unrealizedPnL));
        // Compute return% from unrealized PnL / invested if returnPercent not provided
        const returnPct = p.returnPercent != null
          ? parseFloat(String(p.returnPercent))
          : invested > 0 ? (unrealized / invested) * 100 : 0;
        return {
          ...p,
          returnPct,
          unrealizedNum: unrealized,
          realizedNum: parseFloat(String(p.realizedPnL)),
          investedNum: invested,
        };
      })
      .sort((a, b) => b.returnPct - a.returnPct);
  }, [analytics]);

  // Avg hold days from positions (analytics endpoint doesn't include it directly)
  const avgHoldDays = useMemo(() => {
    const ps = analytics?.positions ?? [];
    if (ps.length === 0) return null;
    const total = ps.reduce((sum, p) => sum + (p.daysSinceFirstBuy ?? 0), 0);
    return Math.round(total / ps.length);
  }, [analytics]);

  // Fallback: build timeline from positions' graphData when the timeline API returns < 2 points
  const effectiveTimeline = useMemo(() => {
    if (timeline.length >= 2) return timeline;
    if (!analytics?.positions?.length) return timeline;
    const days: Record<DateRange, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
    const cutoffMs = range === "ALL" ? 0 : Date.now() - (days[range as DateRange] ?? 30) * 86400000;
    const byTs = new Map<string, number>();
    for (const pos of analytics.positions) {
      const qty = Number(pos.totalQuantity);
      if (qty === 0) continue;
      for (const g of pos.graphData ?? []) {
        const ms = new Date(g.timestamp).getTime();
        if (isNaN(ms) || ms < cutoffMs) continue;
        byTs.set(g.timestamp, (byTs.get(g.timestamp) ?? 0) + Number(g.price) * qty);
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
    const pts = Array.from(byTs.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timestamp, totalValue]) => ({ timestamp, totalValue }));
    return pts.length >= 2 ? pts : timeline;
  }, [timeline, analytics, range]);

  // Chart data — API returns totalValue as decimal string; convert explicitly
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

  // PnL bar chart per position — sorted by net P&L descending
  const pnlBarData = useMemo(() =>
    [...positions]
      .map((p) => ({
        symbol: p.symbol,
        unrealized: p.unrealizedNum,
        realized: p.realizedNum,
        net: p.unrealizedNum + p.realizedNum,
      }))
      .sort((a, b) => b.net - a.net),
    [positions]
  );

  // Risk-Return scatter: invested vs return%, sized by market value
  const riskReturnData = useMemo(() =>
    positions
      .filter((p) => p.investedNum > 0)
      .map((p) => ({
        symbol: p.symbol,
        invested: p.investedNum,
        returnPct: p.returnPct,
        marketValue: p.investedNum + p.unrealizedNum,
        isPositive: p.returnPct >= 0,
      })),
    [positions]
  );

  // Portfolio value waterfall: invested → each gain/loss → total value
  const waterfallData = useMemo(() => {
    const items: { name: string; value: number; fill: string; isTotal?: boolean }[] = [];
    items.push({ name: t("common.invested"), value: totalInvested, fill: "#3b82f6", isTotal: true });
    const sorted = [...positions].sort((a, b) => (b.unrealizedNum + b.realizedNum) - (a.unrealizedNum + a.realizedNum));
    for (const p of sorted) {
      const net = p.unrealizedNum + p.realizedNum;
      if (Math.abs(net) < 0.01) continue;
      items.push({ name: p.symbol, value: net, fill: net >= 0 ? "#10b981" : "#ef4444" });
    }
    if (fees > 0) {
      items.push({ name: t("common.fees"), value: -fees, fill: "#f59e0b" });
    }
    const totalValue = totalInvested + totalUnrealized + totalRealized;
    items.push({ name: t("analytics.netValue"), value: totalValue, fill: totalValue >= totalInvested ? "#10b981" : "#ef4444", isTotal: true });
    return items;
  }, [positions, totalInvested, totalUnrealized, totalRealized, fees, t]);

  // Position health data
  const positionHealthData = useMemo(() =>
    positions
      .filter((p) => p.currentPrice != null && p.currentPrice > 0)
      .map((p) => {
        const avgCost = parseFloat(String(p.averagePrice));
        const current = p.currentPrice ?? 0;
        const gap = avgCost > 0 ? ((current - avgCost) / avgCost) * 100 : 0;
        const weight = totalInvested > 0 ? (p.investedNum / totalInvested) * 100 : 0;
        return {
          symbol: p.symbol,
          avgCost,
          currentPrice: current,
          gap,
          invested: p.investedNum,
          marketValue: p.investedNum + p.unrealizedNum,
          unrealized: p.unrealizedNum,
          returnPct: p.returnPct,
          days: p.daysSinceFirstBuy ?? 0,
          weight,
        };
      })
      .sort((a, b) => Math.abs(b.unrealized) - Math.abs(a.unrealized)),
    [positions, totalInvested]
  );

  // Return vs Holding Duration scatter
  const returnVsDurationData = useMemo(() =>
    positions
      .filter((p) => (p.daysSinceFirstBuy ?? 0) > 0 && p.investedNum > 0)
      .map((p) => ({
        symbol: p.symbol,
        days: p.daysSinceFirstBuy ?? 0,
        returnPct: p.returnPct,
        invested: p.investedNum,
        isPositive: p.returnPct >= 0,
      })),
    [positions]
  );

  if (analyticsLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-gray-500" size={28} />
        </div>
      </AppShell>
    );
  }

  if (!analytics || positions.length === 0) {
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

        {/* ── KPI Row ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            icon={DollarSign} label={t("portfolio.totalInvested")} value={fmtEGP(totalInvested)} color="blue"
          />
          <KpiCard
            icon={TrendingUp} label={t("portfolio.unrealizedPnl")} value={fmtSignedEGP(totalUnrealized)}
            sub={totalInvested > 0 ? pct((totalUnrealized / totalInvested) * 100) : undefined}
            positive={totalUnrealized >= 0} color={totalUnrealized >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={Award} label={t("portfolio.realizedPnl")} value={fmtSignedEGP(totalRealized)}
            positive={totalRealized >= 0} color={totalRealized >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={Activity} label={t("analytics.netPnl")} value={netPnL !== null ? fmtSignedEGP(netPnL) : fmtSignedEGP(totalPnL)}
            sub={fees > 0 ? `${fmtEGP(fees)} ${t("analytics.fees")}` : undefined}
            positive={(netPnL ?? totalPnL) >= 0} color={(netPnL ?? totalPnL) >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={Target} label={t("analytics.winRate")}
            value={analytics.winRate != null ? `${parseFloat(String(analytics.winRate)).toFixed(1)}%` : "—"}
            sub={`${analytics.symbolsTraded ?? positions.length} ${t("analytics.symbols")}`}
            color="purple"
          />
          <KpiCard
            icon={Clock} label={t("analytics.avgHold")}
            value={avgHoldDays !== null ? `${avgHoldDays}d` : "—"}
            color="amber"
          />
        </div>

        {/* ── Portfolio Timeline ───────────────────────── */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionHeader
              title={t("analytics.portfolioValue")}
              sub={timelineChange ? `${pct(timelineChange.pct)} · ${fmtEGP(timelineChange.abs)} ${t("analytics.thisPeriod")}` : undefined}
            />
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${
                    range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
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

        {/* ── 1. P&L Breakdown — enhanced with net labels & gradient fills ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.pnlByPosition")} sub={t("analytics.pnlSub")} />
            {pnlBarData.length === 0 ? (
              <EmptyState message={t("analytics.noPositions2")} />
            ) : (
              <>
                {/* Summary row */}
                <div className="flex gap-3 text-xs">
                  {(() => {
                    const totalNet = pnlBarData.reduce((s, d) => s + d.net, 0);
                    const winners = pnlBarData.filter(d => d.net > 0).length;
                    const losers = pnlBarData.filter(d => d.net < 0).length;
                    return (
                      <>
                        <span className={`font-bold ${totalNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          Net: {fmtSignedEGP(totalNet)}
                        </span>
                        <span className="text-gray-500">|</span>
                        <span className="text-emerald-400">{winners}W</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-red-400">{losers}L</span>
                      </>
                    );
                  })()}
                </div>
                <div dir="ltr">
                <ResponsiveContainer width="100%" height={Math.max(200, pnlBarData.length * 44)}>
                  <BarChart data={pnlBarData} layout="vertical" margin={{ top: 4, right: 90, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnlGreen" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.95} />
                      </linearGradient>
                      <linearGradient id="pnlRed" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0.95} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => Math.abs(v as number) >= 1000 ? `${((v as number) / 1000).toFixed(1)}k` : (v as number).toFixed(0)} />
                    <YAxis type="category" dataKey="symbol" tick={{ fill: "#e2e8f0", fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} width={56} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                      labelStyle={{ color: "#f1f5f9", fontWeight: 700, marginBottom: 4 }}
                      formatter={(v: unknown, name: unknown) => [
                        fmtSignedEGP(v as number),
                        name === "unrealized" ? t("common.unrealized") : name === "realized" ? t("common.realized") : "Net",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, color: "#6b7280", paddingTop: 8 }}
                      formatter={(v) => v === "unrealized" ? t("common.unrealized") : t("common.realized")} />
                    <ReferenceLine x={0} stroke="#475569" strokeWidth={1.5} />
                    <Bar dataKey="unrealized" name="unrealized" stackId="pnl" radius={[0, 0, 0, 0]}>
                      {pnlBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.unrealized >= 0 ? "url(#pnlGreen)" : "url(#pnlRed)"} />
                      ))}
                    </Bar>
                    <Bar dataKey="realized" name="realized" stackId="pnl" radius={[0, 4, 4, 0]} fill="#3b82f6" fillOpacity={0.65}>
                      <LabelList
                        dataKey="net"
                        position="right"
                        formatter={(v) => fmtSignedEGP(Number(v))}
                        style={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* ── 2. Risk-Return Scatter — with quadrant labels & symbol annotations ── */}
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.riskReturn")} sub={t("analytics.riskReturnSub")} />
            {riskReturnData.length === 0 ? (
              <EmptyState message={t("analytics.noPositions2")} />
            ) : (
              <>
                <div dir="ltr" className="relative">
                <ResponsiveContainer width="100%" height={Math.max(240, pnlBarData.length * 38)}>
                  <ScatterChart margin={{ top: 20, right: 28, left: 0, bottom: 8 }}>
                    <defs>
                      <radialGradient id="dotGreen" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="100%" stopColor="#059669" />
                      </radialGradient>
                      <radialGradient id="dotRed" cx="30%" cy="30%">
                        <stop offset="0%" stopColor="#fca5a5" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </radialGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis type="number" dataKey="invested" name={t("common.invested")}
                      tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => Math.abs(v as number) >= 1000 ? `${((v as number) / 1000).toFixed(0)}k` : (v as number).toFixed(0)}
                      label={{ value: `← ${t("common.invested")} →`, fill: "#4b5563", fontSize: 10, position: "insideBottom", offset: -4 }}
                    />
                    <YAxis type="number" dataKey="returnPct" name={t("common.return")}
                      tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${(v as number).toFixed(0)}%`}
                      label={{ value: `↑ ${t("common.return")}`, fill: "#4b5563", fontSize: 10, angle: -90, position: "insideLeft", offset: 10 }}
                    />
                    <ZAxis type="number" dataKey="marketValue" range={[80, 500]} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                      formatter={(v, name) =>
                        String(name) === t("common.return") ? [`${(v as number).toFixed(2)}%`, name] : [fmtEGP(v as number), name]
                      }
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { symbol?: string; returnPct?: number } | undefined;
                        return p ? `${p.symbol} · ${(p.returnPct ?? 0) >= 0 ? "✓" : "✗"} ${Math.abs(p.returnPct ?? 0).toFixed(1)}%` : "";
                      }}
                    />
                    <Scatter data={riskReturnData.filter((d) => d.isPositive)} fill="url(#dotGreen)" fillOpacity={0.9}>
                      <LabelList dataKey="symbol" position="top" style={{ fill: "#6ee7b7", fontSize: 9, fontWeight: 700 }} />
                    </Scatter>
                    <Scatter data={riskReturnData.filter((d) => !d.isPositive)} fill="url(#dotRed)" fillOpacity={0.9}>
                      <LabelList dataKey="symbol" position="top" style={{ fill: "#fca5a5", fontSize: 9, fontWeight: 700 }} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 justify-center">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> {t("analytics.profitable")}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> {t("analytics.atLoss")}</span>
                  <span className="text-gray-600">({t("analytics.bubbleSize")})</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 3. Portfolio Value Waterfall — enhanced with value labels & gradients ── */}
        {waterfallData.length > 2 && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.valueWaterfall")} sub={t("analytics.valueWaterfallSub")} />
            {/* Visual summary */}
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" />
                <span className="text-gray-400">{t("common.invested")}: <span className="text-white font-semibold">{fmtEGP(totalInvested)}</span></span>
              </div>
              <span className="text-gray-700">→</span>
              {(() => {
                const netVal = totalInvested + totalUnrealized + totalRealized;
                const diff = netVal - totalInvested;
                return (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded inline-block ${diff >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-gray-400">{t("analytics.netValue")}: <span className={`font-semibold ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtEGP(netVal)}</span></span>
                    <span className={`font-bold ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>({fmtSignedEGP(diff)})</span>
                  </div>
                );
              })()}
            </div>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={(() => {
                  let running = 0;
                  return waterfallData.map((d) => {
                    if (d.isTotal) {
                      const result = { name: d.name, value: d.value, base: 0, fill: d.fill, isTotal: true, raw: d.value };
                      running = d.value;
                      return result;
                    }
                    const base = running;
                    running += d.value;
                    return { name: d.name, value: Math.abs(d.value), base: d.value >= 0 ? base : base + d.value, fill: d.fill, isTotal: false, raw: d.value };
                  });
                })()} margin={{ top: 24, right: 8, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="wfBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="wfGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="wfRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.75} />
                    </linearGradient>
                    <linearGradient id="wfAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fcd34d" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#e2e8f0", fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={60}
                    tickFormatter={(v) => Math.abs(v as number) >= 1000 ? `${((v as number) / 1000).toFixed(0)}k` : (v as number).toFixed(0)} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                    formatter={(v: unknown, name: unknown, props: { payload?: { raw?: number; isTotal?: boolean } }) => {
                      if (name === "base") return [null, null];
                      const raw = props.payload?.raw ?? (v as number);
                      return [fmtSignedEGP(raw), props.payload?.isTotal ? t("analytics.total") : t("analytics.contribution")];
                    }}
                  />
                  <Bar dataKey="base" stackId="w" fill="transparent" />
                  <Bar dataKey="value" stackId="w" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((d, i) => {
                      const gradId = d.fill === "#3b82f6" ? "url(#wfBlue)" : d.fill === "#10b981" ? "url(#wfGreen)" : d.fill === "#ef4444" ? "url(#wfRed)" : "url(#wfAmber)";
                      return <Cell key={i} fill={gradId} />;
                    })}
                    <LabelList
                      dataKey="raw"
                      position="top"
                      formatter={(v) => { const n = Number(v); return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0); }}
                      style={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── 4. Position Health Cards ────────────────────── */}
        {positionHealthData.length > 0 && (
          <div className="space-y-3">
            <SectionHeader title={t("analytics.positionHealth")} sub={t("analytics.positionHealthSub")} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {positionHealthData.map((p) => {
                const isUp = p.gap >= 0;
                return (
                  <div key={p.symbol} className="bg-gray-900 rounded-xl p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <Link href={`/stocks/${p.symbol}`} className="font-bold text-white text-sm hover:text-blue-400 transition-colors font-mono">
                        {p.symbol}
                      </Link>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                        {isUp ? "+" : "−"}{Math.abs(p.gap).toFixed(1)}%
                      </span>
                    </div>
                    {/* Price gap bar */}
                    <div>
                      <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>{t("common.avgCost")}: {fmtEGP(p.avgCost)}</span>
                        <span>{t("analytics.mktPrice")}: {fmtEGP(p.currentPrice)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isUp ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, Math.max(5, 50 + p.gap))}%` }}
                        />
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-gray-600 text-[10px]">{t("common.invested")}</p>
                        <p className="text-white text-xs font-semibold">{fmtEGP(p.invested)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px]">{t("analytics.currentValue")}</p>
                        <p className="text-white text-xs font-semibold">{fmtEGP(p.marketValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px]">P&L</p>
                        <p className={`text-xs font-semibold ${p.unrealized >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmtSignedEGP(p.unrealized)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px]">{t("common.return")}</p>
                        <p className={`text-xs font-semibold ${p.returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {p.returnPct >= 0 ? "+" : "−"}{Math.abs(p.returnPct).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px]">{t("analytics.heldFor")}</p>
                        <p className="text-white text-xs font-semibold">{p.days}d</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px]">{t("risk.weight")}</p>
                        <p className="text-white text-xs font-semibold">{p.weight.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 5. Return vs Holding Duration Scatter — enhanced with labels ── */}
        {returnVsDurationData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.returnVsDuration")} sub={t("analytics.returnVsDurationSub")} />
            {/* Quick insight */}
            <div className="flex gap-4 text-xs flex-wrap">
              {(() => {
                const avgDays = returnVsDurationData.reduce((s, d) => s + d.days, 0) / returnVsDurationData.length;
                const avgReturn = returnVsDurationData.reduce((s, d) => s + d.returnPct, 0) / returnVsDurationData.length;
                return (
                  <>
                    <span className="text-gray-500">Avg hold: <span className="text-white font-semibold">{Math.round(avgDays)}d</span></span>
                    <span className="text-gray-500">Avg return: <span className={`font-semibold ${avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>{pct(avgReturn)}</span></span>
                  </>
                );
              })()}
            </div>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 20, right: 28, left: 0, bottom: 8 }}>
                  <defs>
                    <radialGradient id="durGreen" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#6ee7b7" />
                      <stop offset="100%" stopColor="#059669" />
                    </radialGradient>
                    <radialGradient id="durRed" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#fca5a5" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </radialGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis type="number" dataKey="days" name={t("analytics.heldFor")}
                    tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}d`}
                    label={{ value: `← ${t("analytics.heldFor")} →`, fill: "#4b5563", fontSize: 10, position: "insideBottom", offset: -4 }}
                  />
                  <YAxis type="number" dataKey="returnPct" name={t("common.return")}
                    tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${(v as number).toFixed(0)}%`}
                    label={{ value: `↑ ${t("common.return")}`, fill: "#4b5563", fontSize: 10, angle: -90, position: "insideLeft", offset: 10 }}
                  />
                  <ZAxis type="number" dataKey="invested" range={[80, 400]} />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                    formatter={(v, name) =>
                      String(name) === t("common.return") ? [`${(v as number).toFixed(2)}%`, name] : [`${v} ${t("common.days")}`, name]
                    }
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { symbol?: string; returnPct?: number } | undefined;
                      return p ? `${p.symbol} · ${(p.returnPct ?? 0) >= 0 ? "+" : ""}${(p.returnPct ?? 0).toFixed(1)}%` : "";
                    }}
                  />
                  <Scatter data={returnVsDurationData.filter((d) => d.isPositive)} fill="url(#durGreen)" fillOpacity={0.9}>
                    <LabelList dataKey="symbol" position="top" style={{ fill: "#6ee7b7", fontSize: 9, fontWeight: 700 }} />
                  </Scatter>
                  <Scatter data={returnVsDurationData.filter((d) => !d.isPositive)} fill="url(#durRed)" fillOpacity={0.9}>
                    <LabelList dataKey="symbol" position="top" style={{ fill: "#fca5a5", fontSize: 9, fontWeight: 700 }} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> {t("analytics.profitable")}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> {t("analytics.atLoss")}</span>
                <span className="text-gray-600">({t("analytics.bubbleSize")})</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Position Table ───────────────────────────── */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <SectionHeader title={t("analytics.allPositions")} sub={`${positions.length} ${t("analytics.holdings")}`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-3 sm:px-4 py-3">{t("common.symbol")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden sm:table-cell">{t("common.qty")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden md:table-cell">{t("common.avgCost")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden md:table-cell">{t("common.invested")}</th>
                  <th className="text-right px-3 sm:px-4 py-3">{t("common.unrealized")}</th>
                  <th className="text-right px-3 sm:px-4 py-3 hidden sm:table-cell">{t("common.realized")}</th>
                  <th className="text-right px-3 sm:px-4 py-3">{t("common.return")}</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const isPos = p.returnPct >= 0;
                  const isExpanded = expandedSymbol === p.symbol;
                  return (
                    <React.Fragment key={p.symbol}>
                      <tr
                        className="td-row border-b border-gray-800/60 hover:bg-gray-800/40 cursor-pointer"
                        onClick={() => setExpandedSymbol(isExpanded ? null : p.symbol)}
                      >
                        <td className="px-3 sm:px-4 py-3">
                          <Link href={`/stocks/${p.symbol}`} className="font-bold text-white hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                            {p.symbol}
                          </Link>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right text-gray-400 hidden sm:table-cell">{parseFloat(String(p.totalQuantity)).toFixed(0)}</td>
                        <td className="px-3 sm:px-4 py-3 text-right text-gray-400 hidden md:table-cell">{fmtEGP(parseFloat(String(p.averagePrice)))}</td>
                        <td className="px-3 sm:px-4 py-3 text-right text-gray-300 hidden md:table-cell">{fmtEGP(p.investedNum)}</td>
                        <td className={`px-3 sm:px-4 py-3 text-right font-medium ${p.unrealizedNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmtSignedEGP(p.unrealizedNum)}
                        </td>
                        <td className={`px-3 sm:px-4 py-3 text-right font-medium hidden sm:table-cell ${p.realizedNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmtSignedEGP(p.realizedNum)}
                        </td>
                        <td className={`px-3 sm:px-4 py-3 text-right font-bold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                          <span className="flex items-center justify-end gap-1">
                            {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {pct(p.returnPct)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-right text-gray-600">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-800/30">
                          <td colSpan={8} className="px-6 py-3">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-2">
                              {t("portfolio.txHistoryFor")} {p.symbol}
                            </p>
                            <ExpandedHistory symbol={p.symbol} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

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
          <div className="bg-gray-900 rounded-xl p-4">
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
  const { data, isLoading } = useQuery({
    queryKey: ["insights"],
    queryFn: () => apiClient.get<{ insights: Insight[] }>("/api/analytics/insights"),
  });

  if (isLoading) return null;
  const insights = data?.insights ?? [];
  if (insights.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
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
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ["pnl-calendar", year],
    queryFn: () => apiClient.get<{ dailyPnL: DayPnL[] }>(`/api/analytics/pnl-calendar?year=${year}`),
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

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <SectionHeader title={t("analytics.pnlCalendar")} sub={t("analytics.pnlCalendarSub")} />
        </div>
        <div className="flex gap-1">
          {[currentYear - 1, currentYear].map((y) => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${year === y ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-600" size={20} /></div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1 min-w-max">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              <div className="h-4" /> {/* month label space */}
              {DAYS.map((d, i) => (
                <div key={i} className="h-3 w-3 text-gray-600 text-[9px] flex items-center justify-center">{d}</div>
              ))}
            </div>
            {weeks.map((week, wi) => {
              // Month label: show month name when first day of month appears in week
              const monthDay = week.find((d) => d?.getDate() === 1);
              return (
                <div key={wi} className="flex flex-col gap-0.5">
                  <div className="h-4 text-[9px] text-gray-600">
                    {monthDay ? MONTHS[monthDay.getMonth()] : ""}
                  </div>
                  {week.map((d, di) => (
                    <div
                      key={di}
                      title={cellTitle(d)}
                      className={`w-3 h-3 rounded-sm ${cellColor(d)} cursor-pointer hover:ring-1 hover:ring-white/30`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <span>{t("common.less")}</span>
            <div className="w-3 h-3 rounded-sm bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-gray-600">{t("analytics.profit")}</span>
            <span className="ml-2">|</span>
            <span className="ml-2 text-gray-600">{t("analytics.loss")}</span>
            <div className="w-3 h-3 rounded-sm bg-red-800" />
            <div className="w-3 h-3 rounded-sm bg-red-600" />
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>{t("common.more")}</span>
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

const GRADE_COLORS = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316" };
const GRADE_BG: Record<string, string> = {
  A: "bg-emerald-900/30 text-emerald-400",
  B: "bg-blue-900/30 text-blue-400",
  C: "bg-amber-900/30 text-amber-400",
  D: "bg-orange-900/30 text-orange-400",
};

function ClosedTradeScoring() {
  const { t, dir } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["closed-trades"],
    queryFn: () => apiClient.get<{ trades: ClosedTrade[]; summary: ClosedTradesSummary }>("/api/analytics/closed-trades"),
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
    <div className="bg-gray-900 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award size={16} className="text-amber-400" />
          <SectionHeader title={t("analytics.closedScoring")} sub={t("analytics.closedScoringSub")} />
        </div>
        {trades.length > 5 && (
          <Link href="/analytics/closed-trades" className="text-blue-400 hover:text-blue-300 text-xs font-medium">
            {t("common.viewAll")} ({trades.length})
          </Link>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("analytics.totalClosed"), value: summary.totalTrades },
            { label: t("analytics.avgHold"), value: `${parseFloat(String(summary.avgHoldDays)).toFixed(0)}d` },
            { label: t("analytics.avgAnnReturn"), value: `${parseFloat(String(summary.avgAnnualizedReturn)).toFixed(1)}%` },
            { label: t("analytics.gradeA"), value: summary.gradeDistribution.A, cls: "text-emerald-400" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={`text-xl font-bold ${cls ?? "text-white"}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grade distribution — horizontal bars + grade explanation */}
      {gradeData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">{t("analytics.gradeDist")}</p>
            {gradeData.map((g) => {
              const pct = totalGrades > 0 ? (g.value / totalGrades) * 100 : 0;
              const color = GRADE_COLORS[g.key as keyof typeof GRADE_COLORS] ?? "#6b7280";
              return (
                <div key={g.key} className="flex items-center gap-3">
                  <span className={`w-8 text-center px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_BG[g.key]}`}>{g.key}</span>
                  <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }} />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white">
                      {g.value} {g.value === 1 ? "trade" : "trades"} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Grade explanation */}
          <div className="space-y-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">{t("analytics.gradeExplain")}</p>
            <div className="space-y-1.5">
              {[
                { grade: "A", color: GRADE_BG.A, desc: t("analytics.gradeADesc") },
                { grade: "B", color: GRADE_BG.B, desc: t("analytics.gradeBDesc") },
                { grade: "C", color: GRADE_BG.C, desc: t("analytics.gradeCDesc") },
                { grade: "D", color: GRADE_BG.D, desc: t("analytics.gradeDDesc") },
              ].map((g) => (
                <div key={g.grade} className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/50">
                  <span className={`shrink-0 w-7 text-center px-1.5 py-0.5 rounded text-xs font-bold ${g.color}`}>{g.grade}</span>
                  <p className="text-gray-400 text-xs leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade list — first 5 only */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              {[t("common.symbol"), t("common.qty"), t("pos.buyPrice"), t("pos.sellPrice"), t("analytics.profit"), t("common.return"), t("analytics.hold"), t("analytics.annReturn"), t("analytics.grade")].map((h) => (
                <th key={h} className="px-3 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 5).map((trade) => (
              <tr key={trade.id} className="td-row border-b border-gray-800/50">
                <td className="px-3 py-2 font-mono font-bold">{trade.symbol}</td>
                <td className="px-3 py-2">{trade.quantity}</td>
                <td className="px-3 py-2">{fmtEGP(parseFloat(trade.entryPrice))}</td>
                <td className="px-3 py-2">{fmtEGP(parseFloat(trade.exitPrice))}</td>
                <td className={`px-3 py-2 font-medium ${parseFloat(trade.profit) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtSignedEGP(parseFloat(trade.profit))}
                </td>
                <td className={`px-3 py-2 font-medium ${parseFloat(trade.returnPct) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {parseFloat(trade.returnPct) >= 0 ? "+" : "−"}{Math.abs(parseFloat(trade.returnPct)).toFixed(2)}%
                </td>
                <td className="px-3 py-2 text-gray-400">{trade.holdDays}d</td>
                <td className={`px-3 py-2 ${trade.annualizedReturn != null && trade.annualizedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {trade.annualizedReturn != null ? `${parseFloat(String(trade.annualizedReturn)) >= 0 ? "+" : "−"}${Math.abs(parseFloat(String(trade.annualizedReturn))).toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_BG[trade.grade]}`}>{trade.grade}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {trades.length > 5 && (
          <div className="px-4 py-3 border-t border-gray-800 text-center">
            <Link href="/analytics/closed-trades" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              {t("common.viewAll")} ({trades.length})
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

