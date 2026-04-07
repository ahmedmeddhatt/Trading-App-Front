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
  PieChart, Pie,
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

  // PnL bar chart per position
  const pnlBarData = useMemo(() =>
    positions.map((p) => ({
      symbol: p.symbol,
      unrealized: p.unrealizedNum,
      realized: p.realizedNum,
    })),
    [positions]
  );

  // Return% scatter for positions
  const returnData = useMemo(() =>
    positions.map((p) => ({
      symbol: p.symbol,
      return: p.returnPct,
      invested: p.investedNum,
    })),
    [positions]
  );

  // Capital: invested vs current market value per symbol
  const capitalData = useMemo(() =>
    positions.map((p) => ({
      symbol: p.symbol,
      invested: p.investedNum,
      currentValue: p.investedNum + p.unrealizedNum,
    })),
    [positions]
  );

  // Price: avg cost basis vs current price per symbol
  const priceVsCostData = useMemo(() =>
    positions
      .filter((p) => p.currentPrice != null && p.currentPrice > 0)
      .map((p) => ({
        symbol: p.symbol,
        avgCost: parseFloat(String(p.averagePrice)),
        currentPrice: p.currentPrice ?? 0,
      })),
    [positions]
  );

  // Holding duration per symbol
  const holdingData = useMemo(() =>
    positions
      .filter((p) => (p.daysSinceFirstBuy ?? 0) > 0)
      .map((p) => ({
        symbol: p.symbol,
        days: p.daysSinceFirstBuy ?? 0,
      }))
      .sort((a, b) => b.days - a.days),
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
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineChartData} margin={{ top: 4, right: dir === "rtl" ? 60 : 4, left: dir === "rtl" ? 0 : 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  orientation={dir === "rtl" ? "right" : "left"}
                  tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v: unknown) => [fmtEGP(v as number), t("analytics.value")]}
                />
                <Line
                  type="monotone" dataKey="value" stroke={timelineColor}
                  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: timelineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Two-col: P&L bars + Performers ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* P&L per symbol bar chart */}
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.pnlByPosition")} sub={t("analytics.pnlSub")} />
            {pnlBarData.length === 0 ? (
              <EmptyState message={t("analytics.noPositions2")} />
            ) : (
              <div dir="ltr">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pnlBarData} margin={{ top: 4, right: dir === "rtl" ? 60 : 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="symbol" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis orientation={dir === "rtl" ? "right" : "left"} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={60}
                    tickFormatter={(v) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(v: unknown, name: unknown) => [fmtEGP(v as number), name === "unrealized" ? t("common.unrealized") : t("common.realized")]}
                  />
                  <Bar dataKey="unrealized" name="unrealized" radius={[3, 3, 0, 0]}>
                    {pnlBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.unrealized >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="realized" name="realized" radius={[3, 3, 0, 0]} fill="#3b82f6" fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Return % per symbol */}
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.returnByPosition")} sub={t("analytics.returnSub")} />
            {returnData.length === 0 ? (
              <EmptyState message={t("analytics.noPositions2")} />
            ) : (
              <div dir="ltr">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={returnData} layout="vertical" margin={{ top: 4, right: dir === "rtl" ? 48 : 12, left: dir === "rtl" ? 12 : 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="symbol" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} width={48} orientation={dir === "rtl" ? "right" : "left"} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, t("common.return")]}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="return" radius={[0, 3, 3, 0]}>
                    {returnData.map((entry, i) => (
                      <Cell key={i} fill={entry.return >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Capital Deployed vs Current Worth ────────── */}
        {capitalData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Invested vs Market Value */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <SectionHeader title={t("analytics.capitalDeployed")} sub={t("analytics.capitalDeployedSub")} />
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={capitalData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="symbol" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={64}
                      tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: unknown, name: unknown) => [
                        fmtEGP(v as number),
                        name === "invested" ? t("common.invested") : t("analytics.currentValue"),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
                      formatter={(v) => v === "invested" ? t("common.invested") : t("analytics.currentValue")} />
                    <Bar dataKey="invested" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="currentValue" radius={[3, 3, 0, 0]}>
                      {capitalData.map((entry, i) => (
                        <Cell key={i} fill={entry.currentValue >= entry.invested ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Avg Cost Basis vs Current Price */}
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <SectionHeader title={t("analytics.priceVsCost")} sub={t("analytics.priceVsCostSub")} />
              {priceVsCostData.length === 0 ? <EmptyState message={t("analytics.noPriceData")} /> : (
                <div dir="ltr">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={priceVsCostData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="symbol" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={64}
                        tickFormatter={(v) => `${v.toFixed(0)}`} />
                      <Tooltip
                        contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: unknown, name: unknown) => [
                          fmtEGP(v as number),
                          name === "avgCost" ? t("common.avgCost") : t("analytics.mktPrice"),
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
                        formatter={(v) => v === "avgCost" ? t("common.avgCost") : t("analytics.mktPrice")} />
                      <Bar dataKey="avgCost" fill="#6b7280" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="currentPrice" radius={[3, 3, 0, 0]}>
                        {priceVsCostData.map((entry, i) => (
                          <Cell key={i} fill={entry.currentPrice >= entry.avgCost ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Holding Duration ─────────────────────────── */}
        {holdingData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title={t("analytics.holdingDuration")} sub={t("analytics.holdingDurationSub")} />
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={Math.max(140, holdingData.length * 36)}>
                <BarChart data={holdingData} layout="vertical" margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}d`} />
                  <YAxis type="category" dataKey="symbol" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown) => [`${v as number} ${t("common.days")}`, t("analytics.heldFor")]}
                  />
                  <ReferenceLine x={30} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "30d", fill: "#f59e0b", fontSize: 10 }} />
                  <ReferenceLine x={90} stroke="#8b5cf6" strokeDasharray="3 3" label={{ value: "90d", fill: "#8b5cf6", fontSize: 10 }} />
                  <Bar dataKey="days" radius={[0, 3, 3, 0]}>
                    {holdingData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.days < 30 ? "#f59e0b" : entry.days < 90 ? "#3b82f6" : "#8b5cf6"}
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> &lt;30d</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 30–90d</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> &gt;90d</span>
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

  const returnBarData = trades.slice(0, 20).map((trade) => ({
    symbol: `${trade.symbol} ${new Date(trade.id.slice(0, 10) || Date.now()).toLocaleDateString()}`,
    return: parseFloat(trade.returnPct),
    grade: trade.grade,
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Award size={16} className="text-amber-400" />
        <SectionHeader title={t("analytics.closedScoring")} sub={t("analytics.closedScoringSub")} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grade distribution donut */}
        {gradeData.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs mb-2">{t("analytics.gradeDist")}</p>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={gradeData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {gradeData.map((entry, i) => (
                    <Cell key={i} fill={GRADE_COLORS[entry.key as keyof typeof GRADE_COLORS] ?? "#6b7280"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }} />
                <Legend formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Return % bar chart */}
        {returnBarData.length > 0 && (
          <div>
            <p className="text-gray-500 text-xs mb-2">{t("analytics.returnPerTrade")}</p>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={returnBarData} margin={{ left: dir === "rtl" ? 0 : -20, right: dir === "rtl" ? -20 : 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="symbol" tick={false} />
                <YAxis orientation={dir === "rtl" ? "right" : "left"} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, t("common.return")]}
                />
                <Bar dataKey="return" radius={[3, 3, 0, 0]}>
                  {returnBarData.map((entry, i) => (
                    <Cell key={i} fill={GRADE_COLORS[entry.grade] ?? "#6b7280"} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Trade list */}
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
            {trades.map((trade) => (
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
      </div>
    </div>
  );
}

