"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ComposedChart, BarChart, Bar, Scatter, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell,
  Area, AreaChart,
} from "recharts";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Target, XCircle, DollarSign, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatSignedEGP, formatPct, pnlColor } from "@/lib/tradeCalcs";
import { useLanguage } from "@/context/LanguageContext";

interface PositionDetail {
  position: { symbol: string; totalQuantity: string; averagePrice: string; totalInvested: string };
  isClosed: boolean;
  closedDate: string | null;
  currentPrice: string | null;
  breakEvenPrice: string;
  gapToBreakEven: string | null;
  unrealizedPnL: string | null;
  unrealizedPct: string | null;
  daysHeld: number;
  totalFeesPaid: string;
  totalRealizedPnL: string;
  totalProceedsFromSells: string;
  costBasisLadder: { date: string; quantity: number; buyPrice: number; lotValue: number; isAboveBreakEven: boolean }[];
  priceHistory: { timestamp: string; price: number }[];
  allTransactions: {
    id: string; createdAt: string; type: "BUY" | "SELL";
    quantity: string; price: string; total: string; fees: string;
    cumulativeQty: string; cumulativeAvgPrice: string;
    pnlOnSell: string | null; returnPctOnSell: string | null;
  }[];
  realizedGains: { id: string; createdAt: string; quantity: string; avgPrice: string; sellPrice: string; profit: string; returnPct: string | null; fees: string }[];
}

type GainSortKey = "date" | "qty" | "buyPrice" | "sellPrice" | "profit" | "returnPct";

export default function PositionDetailPage() {
  const { t, dir } = useLanguage();
  const { symbol } = useParams<{ symbol: string }>();
  const [gainSort, setGainSort] = useState<{ key: GainSortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });

  const { data, isLoading } = useQuery({
    queryKey: ["position-detail", symbol],
    queryFn: () => apiClient.get<PositionDetail>(`/api/portfolio/positions/${symbol}`),
    enabled: !!symbol,
  });

  const sortedGains = useMemo(() => {
    const gains = data?.realizedGains ?? [];
    return [...gains].sort((a, b) => {
      const sortDir = gainSort.dir === "asc" ? 1 : -1;
      switch (gainSort.key) {
        case "date":      return sortDir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "qty":       return sortDir * (parseFloat(a.quantity) - parseFloat(b.quantity));
        case "buyPrice":  return sortDir * (parseFloat(a.avgPrice) - parseFloat(b.avgPrice));
        case "sellPrice": return sortDir * (parseFloat(a.sellPrice) - parseFloat(b.sellPrice));
        case "profit":    return sortDir * (parseFloat(a.profit) - parseFloat(b.profit));
        case "returnPct": {
          const ra = a.returnPct != null ? parseFloat(a.returnPct) : (parseFloat(a.profit) / (parseFloat(a.quantity) * parseFloat(a.avgPrice))) * 100;
          const rb = b.returnPct != null ? parseFloat(b.returnPct) : (parseFloat(b.profit) / (parseFloat(b.quantity) * parseFloat(b.avgPrice))) * 100;
          return sortDir * (ra - rb);
        }
        default: return 0;
      }
    });
  }, [data?.realizedGains, gainSort]);

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
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-gray-500">{t("pos.notFound")}</div>
      </AppShell>
    );
  }

  const {
    position, isClosed, closedDate,
    currentPrice, breakEvenPrice, gapToBreakEven, unrealizedPnL, unrealizedPct,
    daysHeld, totalFeesPaid, totalRealizedPnL, totalProceedsFromSells,
    costBasisLadder, priceHistory, allTransactions, realizedGains,
  } = data;

  const totalBought = allTransactions.filter(tx => tx.type === "BUY").reduce((sum, tx) => sum + parseFloat(tx.quantity), 0);
  const totalSold = allTransactions.filter(tx => tx.type === "SELL").reduce((sum, tx) => sum + parseFloat(tx.quantity), 0);

  const cp = currentPrice ? parseFloat(currentPrice) : null;
  const be = parseFloat(breakEvenPrice);
  const gap = gapToBreakEven ? parseFloat(gapToBreakEven) : null;
  const totalRealized = parseFloat(totalRealizedPnL ?? "0");
  const totalFees = parseFloat(totalFeesPaid ?? "0");

  // Cumulative realized P&L chart (one point per sell)
  const cumulativePnLData = (() => {
    let running = 0;
    return realizedGains.map((g) => {
      running += parseFloat(g.profit);
      return {
        date: new Date(g.createdAt).toLocaleDateString(),
        cumPnL: running,
        tradePnL: parseFloat(g.profit),
      };
    });
  })();

  // Break-even gauge: dynamic range so current price is never clamped
  const gapFraction = cp != null && be > 0 ? (cp - be) / be : 0; // e.g. -0.245 for -24.5%
  const rangeExtent = Math.max(0.25, Math.abs(gapFraction) * 1.2); // at least ±25%, expand if needed
  const gaugeMin = be * (1 - rangeExtent);
  const gaugeMax = be * (1 + rangeExtent);
  const gaugeVal = cp != null && be > 0
    ? Math.min(96, Math.max(4, ((cp - gaugeMin) / (gaugeMax - gaugeMin)) * 100))
    : 50;
  const gaugeRangePct = Math.round(rangeExtent * 100);

  // Chart data: price history + trade markers
  const txByDate = new Map<string, { type: "BUY" | "SELL"; price: number }[]>();
  allTransactions.forEach((tx) => {
    const d = new Date(tx.createdAt).toLocaleDateString();
    if (!txByDate.has(d)) txByDate.set(d, []);
    txByDate.get(d)!.push({ type: tx.type, price: parseFloat(tx.price) });
  });

  const chartData = priceHistory.map((p) => {
    const d = new Date(p.timestamp).toLocaleDateString();
    const trades = txByDate.get(d);
    return {
      label: d,
      price: p.price,
      buyMark: trades?.find((tx) => tx.type === "BUY")?.price ?? null,
      sellMark: trades?.find((tx) => tx.type === "SELL")?.price ?? null,
    };
  });

  const toggleGainSort = (key: GainSortKey) =>
    setGainSort(prev => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });

  const GainSortIcon = ({ k }: { k: GainSortKey }) =>
    gainSort.key !== k ? <ChevronUp size={11} className="text-gray-700 opacity-40" /> :
    gainSort.dir === "asc" ? <ChevronUp size={11} className="text-blue-400" /> :
    <ChevronDown size={11} className="text-blue-400" />;

  // Cost basis ladder: sorted by buy price asc
  const ladder = [...costBasisLadder].sort((a, b) => a.buyPrice - b.buyPrice);
  const maxLotValue = Math.max(...ladder.map((l) => l.lotValue), 1);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <Link href="/portfolio" className="flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-4">
            <ArrowLeft size={14} /> {t("pos.backToPortfolio")}
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="text-3xl font-bold font-mono">{symbol}</span>
                {isClosed ? (
                  <span className="px-2 py-1 rounded-lg text-sm font-bold bg-gray-800 text-gray-400 flex items-center gap-1">
                    <XCircle size={13} /> {t("pos.closed")}
                    {closedDate && <span className="text-gray-600 ml-1">· {new Date(closedDate).toLocaleDateString()}</span>}
                  </span>
                ) : gap != null && (
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold ${gap >= 0 ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                    {gap >= 0 ? <TrendingUp className="inline mr-1" size={14} /> : <TrendingDown className="inline mr-1" size={14} />}
                    {formatPct(gap)} {t("pos.vsBreakEven")}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">
                {isClosed
                  ? `${t("pos.heldFor")} ${daysHeld} ${t("common.days")} · ${t("pos.exitedOn")} ${closedDate ? new Date(closedDate).toLocaleDateString() : "—"}`
                  : `${t("pos.heldFor")} ${daysHeld} ${t("common.days")}`}
              </p>
            </div>
            <div className="text-right">
              {isClosed ? (
                <>
                  <p className={`text-2xl font-bold ${pnlColor(totalRealizedPnL)}`}>{formatSignedEGP(totalRealizedPnL)}</p>
                  <p className="text-gray-500 text-sm">{t("pos.totalRealized")}</p>
                </>
              ) : unrealizedPnL != null && (
                <>
                  <p className={`text-2xl font-bold ${pnlColor(unrealizedPnL)}`}>{formatSignedEGP(unrealizedPnL)}</p>
                  <p className={`text-sm ${pnlColor(unrealizedPct)}`}>{formatPct(unrealizedPct)} {t("pos.unrealizedLabel")}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {isClosed ? [
            { label: t("common.invested"), value: formatEGP(position.totalInvested) },
            { label: t("pos.totalProceeds"), value: formatEGP(totalProceedsFromSells) },
            { label: t("pos.totalRealizedPnL"), value: formatSignedEGP(totalRealizedPnL), color: pnlColor(totalRealizedPnL) },
            { label: t("pos.totalBought"), value: `${totalBought}`, color: "text-emerald-400" },
            { label: t("pos.totalSold"), value: `${totalSold}`, color: "text-orange-400" },
            { label: t("pos.totalFeesPaid"), value: formatEGP(totalFeesPaid) },
            { label: t("pos.daysHeld"), value: `${daysHeld}d` },
            { label: t("pos.sellTrades"), value: `${realizedGains.length}` },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={`text-lg font-bold ${color ?? "text-white"}`}>{value}</p>
            </div>
          )) : [
            { label: t("trade.quantity"), value: position.totalQuantity },
            { label: t("common.avgCost"), value: formatEGP(position.averagePrice) },
            { label: t("portfolio.breakEven"), value: formatEGP(breakEvenPrice) },
            { label: t("common.currentPrice"), value: cp ? formatEGP(cp) : "—" },
            { label: t("pos.totalBought"), value: `${totalBought}`, color: "text-emerald-400" },
            { label: t("pos.totalSold"), value: `${totalSold}`, color: "text-orange-400" },
            { label: t("pos.daysHeld"), value: `${daysHeld}d` },
            { label: t("pos.totalFeesPaid"), value: formatEGP(totalFeesPaid) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={`text-lg font-bold ${color ?? "text-white"}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Break-even Gauge — Enhanced */}
        {cp != null && (
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-400">{t("pos.breakEvenGauge")}</h2>
              </div>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${gap != null && gap >= 0 ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                {gap != null ? (gap >= 0 ? "+" : "") + gap.toFixed(2) + "%" : "—"}
              </span>
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">{t("portfolio.breakEven")}</p>
                <p className="text-yellow-400 font-bold text-sm">{formatEGP(be)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">{t("pos.current")}</p>
                <p className={`font-bold text-sm ${gap != null && gap >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatEGP(cp)}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">{gap != null && gap >= 0 ? t("pos.aboveBreakEven") : t("pos.belowBreakEven")}</p>
                <p className={`font-bold text-sm ${gap != null && gap >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatEGP(Math.abs(cp - be))}</p>
              </div>
            </div>

            {/* Gauge bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-20 text-right font-mono">{formatEGP(gaugeMin)}</span>
              <div className="relative flex-1 h-6 rounded-full overflow-hidden bg-gray-800">
                {/* Gradient background zones */}
                <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-red-950/80 to-red-900/40" />
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-emerald-900/40 to-emerald-950/80" />
                {/* Active fill */}
                {gaugeVal <= 50 ? (
                  <div className="absolute top-0 h-full bg-red-500/70 transition-all duration-500" style={{ left: `${gaugeVal}%`, width: `${50 - gaugeVal}%` }} />
                ) : (
                  <div className="absolute top-0 h-full bg-emerald-500/70 transition-all duration-500" style={{ left: "50%", width: `${gaugeVal - 50}%` }} />
                )}
                {/* Break-even marker */}
                <div className="absolute top-0 h-full w-0.5 bg-yellow-400 z-10" style={{ left: "50%" }} />
                <div className="absolute z-10 -translate-x-1/2" style={{ left: "50%", top: -18 }}>
                  <span className="text-[9px] text-yellow-400 font-medium">BE</span>
                </div>
                {/* Current price needle */}
                <div className="absolute top-0 h-full w-1.5 bg-white z-20 rounded-sm transition-all duration-500 shadow-lg shadow-white/20" style={{ left: `${gaugeVal}%`, transform: "translateX(-50%)" }} />
              </div>
              <span className="text-xs text-gray-600 w-20 font-mono">{formatEGP(gaugeMax)}</span>
            </div>
            <div className="flex justify-between mt-1.5" style={{ paddingLeft: 92, paddingRight: 92 }}>
              <span className="text-[10px] text-gray-600">−{gaugeRangePct}%</span>
              <span className="text-[10px] text-yellow-400/70">{formatEGP(be)}</span>
              <span className="text-[10px] text-gray-600">+{gaugeRangePct}%</span>
            </div>

            {/* Scenario analysis */}
            {!isClosed && parseFloat(position.totalQuantity) > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">To break even, price needs to move:</p>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-1.5 rounded-full ${gap != null && gap >= 0 ? "bg-emerald-500" : "bg-gray-700"}`}>
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: gap != null && gap >= 0 ? "100%" : "0%" }} />
                  </div>
                  <span className={`text-xs font-medium ${gap != null && gap >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {gap != null && gap >= 0
                      ? "Already above break-even!"
                      : `${formatEGP(be - cp)} more (${((be - cp) / cp * 100).toFixed(1)}%)`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Price Chart with Trade Markers */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">{t("pos.priceHistory")}</h2>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData} margin={{ top: 8, right: dir === "rtl" ? 16 : 56, left: dir === "rtl" ? 56 : 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="positionPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v, i) => (i % Math.ceil(chartData.length / 7) === 0 ? v : "")} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]}
                  axisLine={false} tickLine={false} width={56}
                  orientation={dir === "rtl" ? "right" : "left"}
                  tickFormatter={(v) => formatEGP(v)} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px" }}
                  formatter={(v: unknown, name: unknown) => [formatEGP(v as number), name === "price" ? t("common.price") : name === "buyMark" ? t("common.buy") : t("common.sell")]}
                  cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#positionPriceGrad)" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }} />
                <Scatter dataKey="buyMark" fill="#10b981" shape={(props: { cx?: number; cy?: number; payload?: { buyMark: unknown } }) => {
                  if (!props.payload?.buyMark) return <g />;
                  const cx = props.cx ?? 0, cy = props.cy ?? 0;
                  return <circle cx={cx} cy={cy} r={6} fill="#10b981" stroke="#065f46" strokeWidth={2} />;
                }} />
                <Scatter dataKey="sellMark" fill="#f97316" shape={(props: { cx?: number; cy?: number; payload?: { sellMark: unknown } }) => {
                  if (!props.payload?.sellMark) return <g />;
                  const cx = props.cx ?? 0, cy = props.cy ?? 0;
                  const pts = `${cx},${cy - 7} ${cx - 6},${cy + 5} ${cx + 6},${cy + 5}`;
                  return <polygon points={pts} fill="#f97316" stroke="#7c2d12" strokeWidth={1.5} />;
                }} />
                <ReferenceLine y={be} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: t("portfolio.breakEven"), fill: "#f59e0b", fontSize: 10, position: dir === "rtl" ? "left" : "right" }} />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> {t("common.buy")}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> {t("common.sell")}</span>
              <span className="flex items-center gap-1"><span className="w-6 border-t border-dashed border-yellow-400 inline-block" /> {t("portfolio.breakEven")}</span>
            </div>
          </div>
        )}

        {/* Cost Basis Ladder — Enhanced */}
        {ladder.length > 0 && (() => {
          const totalLotValue = ladder.reduce((s, l) => s + l.lotValue, 0);
          const avgBuy = parseFloat(position.averagePrice);
          const lotsBelow = ladder.filter((l) => cp != null && l.buyPrice <= cp).length;
          const lotsAbove = ladder.length - lotsBelow;
          return (
            <div className="bg-gray-900 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-400">{t("pos.costLadder")}</h2>
                <span className="text-xs text-gray-500">{ladder.length} lot{ladder.length > 1 ? "s" : ""} · {formatEGP(totalLotValue)} total</span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">Avg Buy</p>
                  <p className="text-white font-bold text-xs">{formatEGP(avgBuy)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">Price Range</p>
                  <p className="text-white font-bold text-xs">{formatEGP(ladder[0].buyPrice)} – {formatEGP(ladder[ladder.length - 1].buyPrice)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">In Profit</p>
                  <p className="text-emerald-400 font-bold text-xs">{lotsBelow} lot{lotsBelow !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                  <p className="text-gray-500 text-[10px] mb-0.5">At Loss</p>
                  <p className="text-red-400 font-bold text-xs">{lotsAbove} lot{lotsAbove !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Chart */}
              <div dir="ltr">
              <ResponsiveContainer width="100%" height={Math.max(180, ladder.length * 56)}>
                <BarChart data={ladder} layout="vertical" margin={{ left: dir === "rtl" ? 0 : 72, right: dir === "rtl" ? 72 : 48, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatEGP(v)} domain={[0, maxLotValue * 1.15]} />
                  <YAxis type="category" dataKey="buyPrice" tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickFormatter={(v) => formatEGP(v)} width={72} orientation={dir === "rtl" ? "right" : "left"}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}
                    formatter={(v: unknown, _name: unknown, props: { payload?: { quantity: number; buyPrice: number } }) => {
                      const lot = props.payload;
                      if (!lot) return [formatEGP(v as number), t("pos.lotValue")];
                      const pnl = cp != null ? (cp - lot.buyPrice) * lot.quantity : 0;
                      const pnlPct = lot.buyPrice > 0 && cp != null ? ((cp - lot.buyPrice) / lot.buyPrice * 100).toFixed(1) : "0";
                      return [`${formatEGP(v as number)} · ${lot.quantity} shares · P&L: ${pnl >= 0 ? "+" : ""}${formatEGP(pnl)} (${pnlPct}%)`, t("pos.lotValue")];
                    }}
                    labelFormatter={(v) => `${t("pos.buyAt")} ${formatEGP(v)}`}
                    cursor={{ fill: "#ffffff08" }}
                  />
                  {cp != null && (
                    <ReferenceLine x={cp * parseFloat(position.totalQuantity) / ladder.length} stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={1} />
                  )}
                  <Bar dataKey="lotValue" radius={[0, 6, 6, 0]} barSize={30}>
                    {ladder.map((entry, i) => (
                      <Cell key={i} fill={cp != null && entry.buyPrice <= cp ? "#10b981" : "#ef4444"} opacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>

              {/* Per-lot detail table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="py-1.5 text-left">Date</th>
                      <th className="py-1.5 text-right">Buy Price</th>
                      <th className="py-1.5 text-right">Shares</th>
                      <th className="py-1.5 text-right">Lot Value</th>
                      <th className="py-1.5 text-right">Weight</th>
                      {cp != null && <th className="py-1.5 text-right">P&L</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ladder.map((lot, i) => {
                      const pnl = cp != null ? (cp - lot.buyPrice) * lot.quantity : null;
                      const weight = totalLotValue > 0 ? (lot.lotValue / totalLotValue * 100).toFixed(1) : "0";
                      return (
                        <tr key={i} className="border-b border-gray-800/40">
                          <td className="py-1.5 text-gray-400">{new Date(lot.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                          <td className="py-1.5 text-right text-gray-300">{formatEGP(lot.buyPrice)}</td>
                          <td className="py-1.5 text-right text-gray-300">{lot.quantity.toFixed(lot.quantity % 1 === 0 ? 0 : 2)}</td>
                          <td className="py-1.5 text-right text-gray-300">{formatEGP(lot.lotValue)}</td>
                          <td className="py-1.5 text-right text-gray-500">{weight}%</td>
                          {pnl != null && (
                            <td className={`py-1.5 text-right font-medium ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {pnl >= 0 ? "+" : ""}{formatEGP(pnl)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 justify-center mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> {t("pos.boughtBelow")}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> {t("pos.boughtAbove")}</span>
              </div>
            </div>
          );
        })()}

        {/* Cumulative Realized P&L Chart */}
        {cumulativePnLData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-400">{t("pos.cumulativePnL")}</h2>
            </div>
            <div dir="ltr">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cumulativePnLData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumPnLGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={totalRealized >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={totalRealized >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={64}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: unknown, name: unknown) => [
                      formatEGP(v as number),
                      name === "cumPnL" ? t("pos.cumulativePnL") : t("pos.tradePnL"),
                    ]}
                  />
                  <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="cumPnL" stroke={totalRealized >= 0 ? "#10b981" : "#ef4444"}
                    fill="url(#cumPnLGrad)" strokeWidth={2} dot={{ r: 4, fill: totalRealized >= 0 ? "#10b981" : "#ef4444", stroke: "#111827", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-gray-900 rounded-xl overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">{t("pos.allTx")}</h2>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="text-emerald-400">{allTransactions.filter(tx => tx.type === "BUY").length} {t("common.buy")}</span>
              <span className="text-orange-400">{allTransactions.filter(tx => tx.type === "SELL").length} {t("common.sell")}</span>
              {totalFees > 0 && <span className="text-amber-400">{t("pos.totalFeesPaid")}: {formatEGP(totalFees)}</span>}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="px-4 py-2 text-left">{t("tx.date")}</th>
                <th className="px-4 py-2 text-left">{t("tx.type")}</th>
                <th className="px-4 py-2 text-left">{t("common.qty")}</th>
                <th className="px-4 py-2 text-left">{t("common.price")}</th>
                <th className="px-4 py2 text-left">{t("common.total")}</th>
                <th className="px-4 py-2 text-left">{t("common.fees")}</th>
                <th className="px-4 py-2 text-left">{t("pos.cumQty")}</th>
                <th className="px-4 py-2 text-left">{t("pos.cumAvg")}</th>
                <th className="px-4 py-2 text-left">{t("tx.pnl")}</th>
                <th className="px-4 py-2 text-left">{t("tx.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((tx) => (
                <tr key={tx.id} className="td-row border-b border-gray-800/50">
                  <td className="px-4 py-2 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${tx.type === "BUY" ? "bg-emerald-900/30 text-emerald-400" : "bg-orange-900/30 text-orange-400"}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{tx.quantity}</td>
                  <td className="px-4 py-2">{formatEGP(tx.price)}</td>
                  <td className="px-4 py-2 font-medium">{formatEGP(tx.total)}</td>
                  <td className="px-4 py-2 text-amber-400/80 text-xs">{formatEGP(tx.fees)}</td>
                  <td className="px-4 py-2 font-mono text-gray-300">{tx.cumulativeQty}</td>
                  <td className="px-4 py-2 font-mono text-gray-300">{formatEGP(tx.cumulativeAvgPrice)}</td>
                  <td className="px-4 py-2">
                    {tx.pnlOnSell != null ? (
                      <span className={`font-medium text-xs ${parseFloat(tx.pnlOnSell) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatSignedEGP(tx.pnlOnSell)}
                        {tx.returnPctOnSell != null && (
                          <span className="text-gray-500 ml-1">({parseFloat(tx.returnPctOnSell) >= 0 ? "+" : "−"}{Math.abs(parseFloat(tx.returnPctOnSell)).toFixed(1)}%)</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/portfolio/transactions/${tx.id}`} className="text-blue-400 hover:text-blue-300 text-xs">{t("tx.view")}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Realized Gains (Sold Positions History) */}
        {realizedGains.length > 0 && (
          <div className="bg-gray-900 rounded-xl overflow-x-auto">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400">{t("pos.realizedGains")}</h2>
              <span className="text-xs text-gray-600">{realizedGains.length} {t("tx.trades")}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="px-4 py-2 text-left w-12"></th>
                  {([
                    { key: "date",      label: t("tx.date") },
                    { key: "qty",       label: t("common.qty") },
                    { key: "buyPrice",  label: t("pos.buyPrice") },
                    { key: "sellPrice", label: t("pos.sellPrice") },
                    { key: "profit",    label: t("analytics.profit") },
                    { key: "returnPct", label: t("common.return") },
                  ] as { key: GainSortKey; label: string }[]).map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => toggleGainSort(key)}
                      className="px-4 py-2 text-left cursor-pointer hover:text-white select-none transition-colors duration-150"
                    >
                      <span className="flex items-center gap-1">
                        {label} <GainSortIcon k={key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedGains.map((g, i) => {
                  const retPct = g.returnPct != null
                    ? parseFloat(g.returnPct)
                    : (() => {
                        const base = parseFloat(g.quantity) * parseFloat(g.avgPrice);
                        return base > 0 ? (parseFloat(g.profit) / base) * 100 : 0;
                      })();
                  return (
                    <tr key={g.id ?? i} className="td-row border-b border-gray-800/50">
                      <td className="px-4 py-2.5">
                        {parseFloat(g.profit) >= 0 ? (
                          <span className="text-xs font-bold tracking-tight">
                            <span className="text-emerald-400">W</span>
                            <span className="text-gray-600"> / L</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold tracking-tight">
                            <span className="text-gray-600">W / </span>
                            <span className="text-red-400">L</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{new Date(g.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">{g.quantity}</td>
                      <td className="px-4 py-2.5 text-gray-300">{formatEGP(g.avgPrice)}</td>
                      <td className="px-4 py-2.5 text-gray-300">{formatEGP(g.sellPrice)}</td>
                      <td className={`px-4 py-2.5 font-semibold ${pnlColor(g.profit)}`}>{formatSignedEGP(g.profit)}</td>
                      <td className={`px-4 py-2.5 font-semibold ${pnlColor(retPct)}`}>
                        {retPct >= 0 ? "+" : "−"}{retPct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
