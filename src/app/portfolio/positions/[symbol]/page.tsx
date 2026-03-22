"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, BarChart, Bar, Line, Scatter, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell,
  Area, LineChart,
} from "recharts";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Target } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatPct, pnlColor } from "@/lib/tradeCalcs";

interface PositionDetail {
  position: { symbol: string; quantity: string; averagePrice: string; totalInvested: string };
  currentPrice: string | null;
  breakEvenPrice: string;
  gapToBreakEven: string | null;
  unrealizedPnL: string | null;
  unrealizedPct: string | null;
  daysHeld: number;
  costBasisLadder: { date: string; quantity: number; buyPrice: number; lotValue: number; isAboveBreakEven: boolean }[];
  priceHistory: { timestamp: string; price: number }[];
  allTransactions: { id: string; createdAt: string; type: "BUY" | "SELL"; quantity: string; price: string; total: string; fees: string; cumulativeQty: string; cumulativeAvgPrice: string }[];
  realizedGains: { id: string; createdAt: string; quantity: string; buyPrice: string; sellPrice: string; profit: string; returnPct: string }[];
}

export default function PositionDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["position-detail", symbol],
    queryFn: () => apiClient.get<PositionDetail>(`/api/portfolio/positions/${symbol}`),
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-gray-500" size={32} />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-gray-500">Position not found</div>
      </AppShell>
    );
  }

  const { position, currentPrice, breakEvenPrice, gapToBreakEven, unrealizedPnL, unrealizedPct, daysHeld, costBasisLadder, priceHistory, allTransactions, realizedGains } = data;

  const cp = currentPrice ? parseFloat(currentPrice) : null;
  const be = parseFloat(breakEvenPrice);
  const gap = gapToBreakEven ? parseFloat(gapToBreakEven) : null;

  // Break-even gauge: 0–100% scale where 50 = at break-even
  const gaugeVal = cp != null && be > 0 ? Math.min(100, Math.max(0, ((cp - be * 0.8) / (be * 0.4)) * 100)) : 50;

  // Chart data: price history + trade markers
  const txByDate = new Map<string, { type: "BUY" | "SELL"; price: number }[]>();
  allTransactions.forEach((t) => {
    const d = new Date(t.createdAt).toLocaleDateString();
    if (!txByDate.has(d)) txByDate.set(d, []);
    txByDate.get(d)!.push({ type: t.type, price: parseFloat(t.price) });
  });

  const chartData = priceHistory.map((p) => {
    const d = new Date(p.timestamp).toLocaleDateString();
    const trades = txByDate.get(d);
    return {
      label: d,
      price: p.price,
      buyMark: trades?.find((t) => t.type === "BUY")?.price ?? null,
      sellMark: trades?.find((t) => t.type === "SELL")?.price ?? null,
    };
  });

  // Cost basis ladder: sorted by buy price asc
  const ladder = [...costBasisLadder].sort((a, b) => a.buyPrice - b.buyPrice);
  const maxLotValue = Math.max(...ladder.map((l) => l.lotValue), 1);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <Link href="/portfolio" className="flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-4">
            <ArrowLeft size={14} /> Portfolio
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl font-bold font-mono">{symbol}</span>
                {gap != null && (
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold ${gap >= 0 ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                    {gap >= 0 ? <TrendingUp className="inline mr-1" size={14} /> : <TrendingDown className="inline mr-1" size={14} />}
                    {formatPct(gap)} vs break-even
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">Held for {daysHeld} days</p>
            </div>
            {unrealizedPnL != null && (
              <div className="text-right">
                <p className={`text-2xl font-bold ${pnlColor(unrealizedPnL)}`}>{formatEGP(unrealizedPnL)}</p>
                <p className={`text-sm ${pnlColor(unrealizedPct)}`}>{formatPct(unrealizedPct)} unrealized</p>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Quantity", value: position.quantity },
            { label: "Avg Cost", value: formatEGP(position.averagePrice) },
            { label: "Break-even", value: formatEGP(breakEvenPrice) },
            { label: "Current Price", value: cp ? formatEGP(cp) : "—" },
            { label: "Days Held", value: `${daysHeld}d` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className="text-lg font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Break-even Gauge */}
        {cp != null && (
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-400">Break-even Gauge</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-24 text-right">{formatEGP(be * 0.8)}</span>
              <div className="relative flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all ${gap != null && gap >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ width: `${gaugeVal}%` }}
                />
                {/* Break-even marker at 50% */}
                <div className="absolute top-0 h-full w-0.5 bg-yellow-400" style={{ left: "50%" }} />
              </div>
              <span className="text-xs text-gray-500 w-24">{formatEGP(be * 1.2)}</span>
            </div>
            <div className="flex justify-between mt-1 px-28">
              <span className="text-xs text-gray-600">−20%</span>
              <span className="text-xs text-yellow-400">Break-even: {formatEGP(be)}</span>
              <span className="text-xs text-gray-600">+20%</span>
            </div>
            <p className={`text-center text-sm mt-2 font-medium ${pnlColor(gap)}`}>
              Current: {formatEGP(cp)} — {gap != null ? (gap >= 0 ? `${formatPct(gap)} above break-even` : `${formatPct(gap)} below break-even`) : "—"}
            </p>
          </div>
        )}

        {/* Price Chart with Trade Markers */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Price History + Your Trades</h2>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v, i) => (i % Math.ceil(chartData.length / 6) === 0 ? v : "")} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(v: unknown, name: unknown) => [formatEGP(v as number), name === "price" ? "Price" : name === "buyMark" ? "BUY" : "SELL"]}
                />
                <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="#3b82f610" strokeWidth={2} dot={false} />
                <Scatter dataKey="buyMark" fill="#10b981" shape={(props: { cx?: number; cy?: number; payload?: { buyMark: unknown } }) => {
                  if (!props.payload?.buyMark) return <g />;
                  const cx = props.cx ?? 0, cy = props.cy ?? 0;
                  return <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#065f46" strokeWidth={1.5} />;
                }} />
                <Scatter dataKey="sellMark" fill="#ef4444" shape={(props: { cx?: number; cy?: number; payload?: { sellMark: unknown } }) => {
                  if (!props.payload?.sellMark) return <g />;
                  const cx = props.cx ?? 0, cy = props.cy ?? 0;
                  const pts = `${cx},${cy - 6} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`;
                  return <polygon points={pts} fill="#ef4444" />;
                }} />
                <ReferenceLine y={be} stroke="#f59e0b" strokeDasharray="4 4"
                  label={{ value: "Break-even", fill: "#f59e0b", fontSize: 10, position: "right" }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> BUY</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> SELL</span>
              <span className="flex items-center gap-1"><span className="w-6 border-t border-dashed border-yellow-400 inline-block" /> Break-even</span>
            </div>
          </div>
        )}

        {/* Cost Basis Ladder Chart */}
        {ladder.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Cost Basis Ladder</h2>
            <ResponsiveContainer width="100%" height={Math.max(120, ladder.length * 40)}>
              <BarChart data={ladder} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v) => formatEGP(v)} domain={[0, maxLotValue * 1.1]} />
                <YAxis type="category" dataKey="buyPrice" tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v) => formatEGP(v)} width={60} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(v: unknown) => [formatEGP(v as number), "Lot Value"]}
                  labelFormatter={(v) => `Buy @ ${formatEGP(v)}`}
                />
                <Bar dataKey="lotValue" radius={[0, 4, 4, 0]}>
                  {ladder.map((entry, i) => (
                    <Cell key={i} fill={entry.isAboveBreakEven ? "#10b981" : "#ef4444"} opacity={0.8} />
                  ))}
                </Bar>
                {cp && <ReferenceLine x={cp * (maxLotValue / (be > 0 ? be : 1))} stroke="#f59e0b" strokeDasharray="4 4" />}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2 text-center">
              <span className="text-emerald-400">Green</span> = bought below current price &nbsp;
              <span className="text-red-400">Red</span> = bought above current price
            </p>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-gray-900 rounded-xl overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400">All Transactions</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                {["Date", "Type", "Qty", "Price", "Total", "Fees", "Cum. Qty", "Cum. Avg"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">{h}</th>
                ))}
                <th className="px-4 py-2 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${t.type === "BUY" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{t.quantity}</td>
                  <td className="px-4 py-2">{formatEGP(t.price)}</td>
                  <td className="px-4 py-2 font-medium">{formatEGP(t.total)}</td>
                  <td className="px-4 py-2 text-gray-400">{formatEGP(t.fees)}</td>
                  <td className="px-4 py-2 font-mono text-gray-300">{t.cumulativeQty}</td>
                  <td className="px-4 py-2 font-mono text-gray-300">{formatEGP(t.cumulativeAvgPrice)}</td>
                  <td className="px-4 py-2">
                    <Link href={`/portfolio/transactions/${t.id}`} className="text-blue-400 hover:text-blue-300 text-xs">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Realized Gains */}
        {realizedGains.length > 0 && (
          <div className="bg-gray-900 rounded-xl overflow-x-auto">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400">Realized Gains</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  {["Date", "Qty", "Buy Price", "Sell Price", "Profit", "Return %"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {realizedGains.map((g) => (
                  <tr key={g.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-gray-400">{new Date(g.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{g.quantity}</td>
                    <td className="px-4 py-2">{formatEGP(g.buyPrice)}</td>
                    <td className="px-4 py-2">{formatEGP(g.sellPrice)}</td>
                    <td className={`px-4 py-2 font-medium ${pnlColor(g.profit)}`}>{formatEGP(g.profit)}</td>
                    <td className={`px-4 py-2 font-medium ${pnlColor(g.returnPct)}`}>{formatPct(g.returnPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
