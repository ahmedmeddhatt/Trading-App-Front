"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, BarChart2, Loader2, AlertCircle,
  Target, Clock, DollarSign, Award, Activity, Zap,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend,
} from "recharts";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import type { DateRange } from "@/features/portfolio/components/TimelineChart";

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
  winRate?: number;
  totalFeesPaid?: string;
  netPnL?: string;
  avgHoldingDays?: number;
  symbolsTraded?: number;
}

interface TimelinePoint { timestamp: string; totalValue: number; }
interface AllocationSlice { name: string; value: number; percentage: number; }
interface AllocationData { bySector: AllocationSlice[]; bySymbol: AllocationSlice[]; }

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAnalytics() {
  return useQuery<Analytics | null>({
    queryKey: ["portfolio", "analytics"],
    queryFn: () => apiClient.get<Analytics | null>("/api/portfolio/analytics"),
    retry: 1,
  });
}

function useTimeline(range: DateRange) {
  const { from, to } = useMemo(() => {
    const t = new Date();
    const f = new Date(t);
    const days: Record<DateRange, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
    f.setDate(f.getDate() - days[range]);
    return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) };
  }, [range]);

  return useQuery<TimelinePoint[]>({
    queryKey: ["portfolio", "timeline", range],
    queryFn: async () => {
      const r = await apiClient.get<unknown>(`/api/portfolio/timeline?from=${from}&to=${to}`);
      return Array.isArray(r) ? (r as TimelinePoint[]) : [];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtEGP = (v: number) =>
  new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(v);

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const RANGES: DateRange[] = ["1W", "1M", "3M", "6M", "1Y"];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

// ─── Sub-components ───────────────────────────────────────────────────────────

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
  const [range, setRange] = useState<DateRange>("1M");

  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: timeline = [], isLoading: timelineLoading } = useTimeline(range);
  const { data: allocation } = useAllocation();

  const pv = analytics?.portfolioValue;
  const totalInvested = pv ? parseFloat(String(pv.totalInvested)) : 0;
  const totalUnrealized = pv ? parseFloat(String(pv.totalUnrealized)) : 0;
  const totalRealized = pv ? parseFloat(String(pv.totalRealized)) : 0;
  const totalPnL = pv ? parseFloat(String(pv.totalPnL)) : 0;
  const netPnL = analytics?.netPnL ? parseFloat(analytics.netPnL) : null;
  const fees = analytics?.totalFeesPaid ? parseFloat(analytics.totalFeesPaid) : 0;

  // Positions sorted by return%
  const positions = useMemo(() => {
    return (analytics?.positions ?? [])
      .map((p) => ({
        ...p,
        returnPct: parseFloat(String(p.returnPercent ?? 0)),
        unrealizedNum: parseFloat(String(p.unrealizedPnL)),
        realizedNum: parseFloat(String(p.realizedPnL)),
        investedNum: parseFloat(String(p.totalInvested)),
      }))
      .sort((a, b) => b.returnPct - a.returnPct);
  }, [analytics]);

  // Chart data
  const timelineChartData = useMemo(() =>
    timeline.map((p) => ({
      date: new Date(p.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: p.totalValue,
    })),
    [timeline]
  );

  const timelineColor = useMemo(() => {
    if (timeline.length < 2) return "#3b82f6";
    return timeline[timeline.length - 1].totalValue >= timeline[0].totalValue ? "#10b981" : "#ef4444";
  }, [timeline]);

  const timelineChange = useMemo(() => {
    if (timeline.length < 2) return null;
    const first = timeline[0].totalValue;
    const last = timeline[timeline.length - 1].totalValue;
    return { abs: last - first, pct: first > 0 ? ((last - first) / first) * 100 : 0 };
  }, [timeline]);

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
          <p className="text-white font-semibold">No analytics yet</p>
          <p className="text-gray-500 text-sm max-w-xs">
            Start trading to unlock your performance analytics, P&L breakdown, and risk metrics.
          </p>
          <Link href="/stocks" className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
            Browse Stocks
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
            icon={DollarSign} label="Total Invested" value={fmtEGP(totalInvested)} color="blue"
          />
          <KpiCard
            icon={TrendingUp} label="Unrealized P&L" value={fmtEGP(totalUnrealized)}
            sub={totalInvested > 0 ? pct((totalUnrealized / totalInvested) * 100) : undefined}
            positive={totalUnrealized >= 0} color={totalUnrealized >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={Award} label="Realized P&L" value={fmtEGP(totalRealized)}
            positive={totalRealized >= 0} color={totalRealized >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={Activity} label="Net P&L" value={netPnL !== null ? fmtEGP(netPnL) : fmtEGP(totalPnL)}
            sub={fees > 0 ? `${fmtEGP(fees)} fees` : undefined}
            positive={(netPnL ?? totalPnL) >= 0} color={(netPnL ?? totalPnL) >= 0 ? "green" : "red"}
          />
          <KpiCard
            icon={Target} label="Win Rate"
            value={analytics.winRate !== undefined ? `${analytics.winRate.toFixed(1)}%` : "—"}
            sub={`${analytics.symbolsTraded ?? positions.length} symbols`}
            color="purple"
          />
          <KpiCard
            icon={Clock} label="Avg Hold"
            value={analytics.avgHoldingDays !== undefined ? `${analytics.avgHoldingDays.toFixed(0)}d` : "—"}
            color="amber"
          />
        </div>

        {/* ── Portfolio Timeline ───────────────────────── */}
        <div className="bg-gray-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <SectionHeader
              title="Portfolio Value"
              sub={timelineChange ? `${pct(timelineChange.pct)} · ${fmtEGP(timelineChange.abs)} this period` : undefined}
            />
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    range === r ? "bg-blue-600 text-white" : "text-gray-500 hover:text-white hover:bg-gray-800"
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
            <EmptyState message="No timeline data for this range" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timelineChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v: unknown) => [fmtEGP(v as number), "Value"]}
                />
                <Line
                  type="monotone" dataKey="value" stroke={timelineColor}
                  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: timelineColor }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Two-col: P&L bars + Performers ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* P&L per symbol bar chart */}
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title="P&L by Position" sub="Unrealized + Realized" />
            {pnlBarData.length === 0 ? (
              <EmptyState message="No positions" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pnlBarData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="symbol" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={55}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(v: unknown, name: unknown) => [fmtEGP(v as number), name === "unrealized" ? "Unrealized" : "Realized"]}
                  />
                  <Bar dataKey="unrealized" name="unrealized" radius={[3, 3, 0, 0]}>
                    {pnlBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.unrealized >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="realized" name="realized" radius={[3, 3, 0, 0]} fill="#3b82f6" fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Return % per symbol */}
          <div className="bg-gray-900 rounded-xl p-4 space-y-3">
            <SectionHeader title="Return % by Position" sub="Sorted best to worst" />
            {returnData.length === 0 ? (
              <EmptyState message="No positions" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={returnData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="symbol" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, "Return"]}
                  />
                  <Bar dataKey="return" radius={[0, 3, 3, 0]}>
                    {returnData.map((entry, i) => (
                      <Cell key={i} fill={entry.return >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Allocation ───────────────────────────────── */}
        {allocation && (allocation.bySector.length > 0 || allocation.bySymbol.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { title: "Sector Allocation", data: allocation.bySector },
              { title: "Symbol Allocation", data: allocation.bySymbol },
            ].map(({ title, data }) => (
              <div key={title} className="bg-gray-900 rounded-xl p-4 space-y-3">
                <SectionHeader title={title} />
                {data.length === 0 ? <EmptyState message="No data" /> : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={160}>
                      <PieChart>
                        <Pie
                          data={data} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                          strokeWidth={0}
                        >
                          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: unknown, name: unknown) => [fmtEGP(v as number), name as string]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 text-xs min-w-0">
                      {data.slice(0, 6).map((s, i) => (
                        <div key={s.name} className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-400 truncate">{s.name}</span>
                          <span className="ml-auto text-gray-300 tabular-nums shrink-0">{s.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Position Table ───────────────────────────── */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <SectionHeader title="All Positions" sub={`${positions.length} holdings`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-right px-4 py-3">Qty</th>
                  <th className="text-right px-4 py-3">Avg Cost</th>
                  <th className="text-right px-4 py-3">Invested</th>
                  <th className="text-right px-4 py-3">Unrealized</th>
                  <th className="text-right px-4 py-3">Realized</th>
                  <th className="text-right px-4 py-3">Return %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const isPos = p.returnPct >= 0;
                  return (
                    <tr
                      key={p.symbol}
                      className="border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/stocks/${p.symbol}`}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/stocks/${p.symbol}`} className="font-bold text-white hover:text-blue-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                          {p.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">{parseFloat(String(p.totalQuantity)).toFixed(0)}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{fmtEGP(parseFloat(String(p.averagePrice)))}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{fmtEGP(p.investedNum)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${p.unrealizedNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {p.unrealizedNum >= 0 ? "+" : ""}{fmtEGP(p.unrealizedNum)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${p.realizedNum >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {p.realizedNum >= 0 ? "+" : ""}{fmtEGP(p.realizedNum)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                        <span className="flex items-center justify-end gap-1">
                          {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {pct(p.returnPct)}
                        </span>
                      </td>
                    </tr>
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
                  <p className="text-gray-500 text-xs">Best Performer</p>
                  <p className="text-white font-bold text-lg">{analytics.bestPerformer.symbol}</p>
                  <p className="text-emerald-400 text-sm font-medium">
                    +{analytics.bestPerformer.returnPercent.toFixed(2)}% · {fmtEGP(parseFloat(analytics.bestPerformer.unrealizedPnL))}
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
                  <p className="text-gray-500 text-xs">Worst Performer</p>
                  <p className="text-white font-bold text-lg">{analytics.worstPerformer.symbol}</p>
                  <p className="text-red-400 text-sm font-medium">
                    {analytics.worstPerformer.returnPercent.toFixed(2)}% · {fmtEGP(parseFloat(analytics.worstPerformer.unrealizedPnL))}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Fee breakdown ────────────────────────────── */}
        {fees > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <SectionHeader title="Fee Impact" sub="How fees affect your net returns" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Gross P&L</p>
                <p className={`text-xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtEGP(totalPnL)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Total Fees</p>
                <p className="text-xl font-bold text-amber-400">−{fmtEGP(fees)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-1">Net P&L</p>
                <p className={`text-xl font-bold ${(netPnL ?? totalPnL) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtEGP(netPnL ?? totalPnL - fees)}
                </p>
              </div>
            </div>
          </div>
        )}

      </main>
    </AppShell>
  );
}
