"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  ComposedChart, BarChart, Bar, Scatter, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell,
  Area, AreaChart,
} from "recharts";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Target, XCircle, DollarSign, ChevronUp, ChevronDown, ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import RangeSelector from "@/components/RangeSelector";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatSignedEGP, formatPct, pnlColor } from "@/lib/tradeCalcs";
import { useLanguage } from "@/context/LanguageContext";
import { DateRange, rangeToFromTo } from "@/lib/rangeToFromTo";
import { useAssetType, withAssetType } from "@/store/useTradingMode";

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
  const [range, setRange] = useState<DateRange | "ALL">("ALL");

  const assetType = useAssetType();
  const { data, isLoading } = useQuery({
    queryKey: ["position-detail", symbol, assetType],
    queryFn: () => apiClient.get<PositionDetail>(withAssetType(`/api/portfolio/positions/${symbol}`, assetType)),
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
      const profit = parseFloat(g.profit);
      running += profit;
      return {
        date: new Date(g.createdAt).toLocaleDateString(),
        cumPnL: running,
        tradePnL: profit,
        qty: parseFloat(g.quantity),
        buyPrice: parseFloat(g.avgPrice),
        sellPrice: parseFloat(g.sellPrice),
        fees: parseFloat(g.fees),
        returnPct: g.returnPct ? parseFloat(g.returnPct) : null,
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
  const txByDate = new Map<string, { type: "BUY" | "SELL"; price: number; qty: number }[]>();
  allTransactions.forEach((tx) => {
    const d = new Date(tx.createdAt).toLocaleDateString();
    if (!txByDate.has(d)) txByDate.set(d, []);
    txByDate.get(d)!.push({ type: tx.type, price: parseFloat(tx.price), qty: parseFloat(tx.quantity) });
  });

  const firstTxDate = allTransactions.length > 0
    ? new Date(Math.min(...allTransactions.map(tx => new Date(tx.createdAt).getTime())))
    : null;
  const rangeFromDate = range === "ALL"
    ? (firstTxDate ? new Date(firstTxDate.getTime() - 7 * 24 * 60 * 60 * 1000) : new Date(0))
    : new Date(rangeToFromTo(range).from);

  // Build a set of sell dates with P&L info from realizedGains
  const sellPnLByDate = new Map<string, { pnl: number; returnPct: number | null }>();
  realizedGains.forEach((g) => {
    const d = new Date(g.createdAt).toLocaleDateString();
    const existing = sellPnLByDate.get(d);
    const profit = parseFloat(g.profit);
    const rp = g.returnPct ? parseFloat(g.returnPct) : null;
    if (existing) {
      existing.pnl += profit;
    } else {
      sellPnLByDate.set(d, { pnl: profit, returnPct: rp });
    }
  });

  // Build initial chart points from price history
  const filteredHistory = priceHistory.filter((p) => new Date(p.timestamp) >= rangeFromDate);
  const priceByDate = new Map<string, number>();
  filteredHistory.forEach((p) => {
    priceByDate.set(new Date(p.timestamp).toLocaleDateString(), p.price);
  });

  // Ensure every transaction date has a chart point (even if price history misses it)
  const chartDateSet = new Set(filteredHistory.map(p => new Date(p.timestamp).toLocaleDateString()));
  const missingTxDates: { label: string; ts: number }[] = [];
  txByDate.forEach((_, dateStr) => {
    if (!chartDateSet.has(dateStr)) {
      // Find closest price from history
      const txTs = new Date(dateStr).getTime();
      if (txTs >= rangeFromDate.getTime()) {
        missingTxDates.push({ label: dateStr, ts: txTs });
      }
    }
  });

  // For missing dates, interpolate price from nearest price history point
  const sortedHistory = filteredHistory.map(p => ({ ts: new Date(p.timestamp).getTime(), price: p.price })).sort((a, b) => a.ts - b.ts);
  function interpolatePrice(ts: number): number {
    if (sortedHistory.length === 0) return 0;
    let closest = sortedHistory[0];
    let minDiff = Math.abs(ts - closest.ts);
    for (const h of sortedHistory) {
      const diff = Math.abs(ts - h.ts);
      if (diff < minDiff) { minDiff = diff; closest = h; }
    }
    return closest.price;
  }

  // Merge all points
  type RawPoint = { label: string; ts: number; price: number };
  const allPoints: RawPoint[] = [
    ...filteredHistory.map(p => ({ label: new Date(p.timestamp).toLocaleDateString(), ts: new Date(p.timestamp).getTime(), price: p.price })),
    ...missingTxDates.map(m => ({ label: m.label, ts: m.ts, price: interpolatePrice(m.ts) })),
  ].sort((a, b) => a.ts - b.ts);

  // Deduplicate by label (keep first occurrence)
  const seen = new Set<string>();
  const dedupedPoints = allPoints.filter(p => { if (seen.has(p.label)) return false; seen.add(p.label); return true; });

  // Track holding state across chart data points
  let holdingQty = 0;
  const chartData = dedupedPoints.map((p) => {
      const d = p.label;
      const trades = txByDate.get(d);
      const buyTrades = trades?.filter((tx) => tx.type === "BUY") ?? [];
      const sellTrades = trades?.filter((tx) => tx.type === "SELL") ?? [];
      // Update holding qty
      buyTrades.forEach(t => { holdingQty += t.qty; });
      sellTrades.forEach(t => { holdingQty -= t.qty; });
      const sellPnL = sellPnLByDate.get(d);
      return {
        label: d,
        price: p.price,
        holdingProfit: holdingQty > 0 && p.price > be ? p.price : null,
        holdingLoss: holdingQty > 0 && p.price < be ? p.price : null,
        holdingNeutral: holdingQty > 0 && p.price === be ? p.price : null,
        buyMark: buyTrades.length > 0 ? buyTrades[0].price : null,
        buyQty: buyTrades.length > 0 ? buyTrades.reduce((s, t) => s + t.qty, 0) : null,
        sellMark: sellTrades.length > 0 ? sellTrades[0].price : null,
        sellQty: sellTrades.length > 0 ? sellTrades.reduce((s, t) => s + t.qty, 0) : null,
        sellPnL: sellPnL?.pnl ?? null,
        sellReturnPct: sellPnL?.returnPct ?? null,
        allTrades: trades ?? [],
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
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <Link href="/portfolio" className="flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-4">
            <ArrowLeft size={14} /> {t("pos.backToPortfolio")}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold font-mono">{symbol}</span>
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
                  ? `${t("pos.heldFor")} ${daysHeld} ${t("common.days")}${closedDate ? ` · ${t("pos.exitedOn")} ${new Date(closedDate).toLocaleDateString()}` : ""}`
                  : `${t("pos.heldFor")} ${daysHeld} ${t("common.days")}`}
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <div className="text-left sm:text-right">
                {isClosed ? (
                  <>
                    <p className={`text-xl sm:text-2xl font-bold ${pnlColor(totalRealizedPnL)}`}>{formatSignedEGP(totalRealizedPnL)}</p>
                    <p className="text-gray-500 text-xs sm:text-sm">{t("pos.totalRealized")}</p>
                  </>
                ) : unrealizedPnL != null && (
                  <>
                    <p className={`text-xl sm:text-2xl font-bold ${pnlColor(unrealizedPnL)}`}>{formatSignedEGP(unrealizedPnL)}</p>
                    <p className={`text-xs sm:text-sm ${pnlColor(unrealizedPct)}`}>{formatPct(unrealizedPct)} {t("pos.unrealizedLabel")}</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Link
                  href={symbol.startsWith("GOLD_") ? `/gold/${symbol}` : `/stocks/${symbol}`}
                  className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold bg-orange-500 hover:bg-orange-400 text-white text-center transition-colors"
                >
                  {t("trade.buy")}
                </Link>
                {!isClosed && (
                  <Link
                    href={symbol.startsWith("GOLD_") ? `/gold/${symbol}` : `/stocks/${symbol}`}
                    className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white text-center transition-colors"
                  >
                    {t("trade.sell")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isClosed ? [
            { label: t("common.invested"), value: formatEGP(position.totalInvested) },
            { label: t("pos.totalProceeds"), value: formatEGP(totalProceedsFromSells) },
            { label: t("pos.totalRealizedPnL"), value: formatSignedEGP(totalRealizedPnL), color: pnlColor(totalRealizedPnL) },
            { label: t("pos.totalFeesPaid"), value: formatEGP(totalFeesPaid) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-3 sm:p-4">
              <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{label}</p>
              <p className={`text-base sm:text-lg font-bold ${color ?? "text-white"}`}>{value}</p>
            </div>
          )) : [
            { label: t("trade.quantity"), value: position.totalQuantity },
            { label: t("common.avgCost"), value: formatEGP(position.averagePrice) },
            { label: t("portfolio.breakEven"), value: formatEGP(breakEvenPrice) },
            { label: t("common.currentPrice"), value: cp ? formatEGP(cp) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-3 sm:p-4">
              <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{label}</p>
              <p className="text-base sm:text-lg font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(isClosed ? [
            { label: t("pos.totalBought"), value: `${totalBought}`, color: "text-orange-400" as string | undefined },
            { label: t("pos.totalSold"), value: `${totalSold}`, color: "text-emerald-400" as string | undefined },
            { label: t("pos.daysHeld"), value: `${daysHeld}d`, color: undefined as string | undefined },
            { label: t("pos.sellTrades"), value: `${realizedGains.length}`, color: undefined as string | undefined },
          ] : [
            { label: t("pos.totalBought"), value: `${totalBought}`, color: "text-orange-400" as string | undefined },
            { label: t("pos.totalSold"), value: `${totalSold}`, color: "text-emerald-400" as string | undefined },
            { label: t("pos.daysHeld"), value: `${daysHeld}d`, color: undefined as string | undefined },
            { label: t("pos.totalFeesPaid"), value: formatEGP(totalFeesPaid), color: undefined as string | undefined },
          ]).map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900/60 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className={`text-sm font-semibold ${color ?? "text-gray-300"}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Trade Flow Summary ─────────────────────────────── */}
        {allTransactions.length > 0 && (() => {
          const buys = allTransactions.filter(tx => tx.type === "BUY");
          const sells = allTransactions.filter(tx => tx.type === "SELL");
          const totalBuyValue = buys.reduce((s, tx) => s + parseFloat(tx.total), 0);
          const totalSellValue = sells.reduce((s, tx) => s + parseFloat(tx.total), 0);
          const totalBuyFees = buys.reduce((s, tx) => s + parseFloat(tx.fees), 0);
          const totalSellFees = sells.reduce((s, tx) => s + parseFloat(tx.fees), 0);
          const netPnL = totalSellValue - totalBuyValue * (totalSold / totalBought) - totalSellFees;
          const remaining = totalBought - totalSold;
          const sellPct = totalBought > 0 ? (totalSold / totalBought) * 100 : 0;
          const avgBuyPrice = buys.length > 0 ? buys.reduce((s, tx) => s + parseFloat(tx.price) * parseFloat(tx.quantity), 0) / totalBought : 0;
          const avgSellPrice = sells.length > 0 ? sells.reduce((s, tx) => s + parseFloat(tx.price) * parseFloat(tx.quantity), 0) / totalSold : 0;

          // Timeline data: each transaction as a visual event
          const timelineData = allTransactions.map(tx => ({
            date: new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            fullDate: new Date(tx.createdAt).toLocaleDateString(),
            type: tx.type,
            qty: parseFloat(tx.quantity),
            price: parseFloat(tx.price),
            total: parseFloat(tx.total),
            fees: parseFloat(tx.fees),
            pnl: tx.pnlOnSell ? parseFloat(tx.pnlOnSell) : null,
            buyVal: tx.type === "BUY" ? parseFloat(tx.total) : 0,
            sellVal: tx.type === "SELL" ? parseFloat(tx.total) : 0,
          }));

          const compactEGP = (v: number) => {
            if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
            return v.toLocaleString();
          };

          return (
            <div className="bg-gray-900 rounded-xl p-3 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-blue-400" />
                <h2 className="text-base font-bold text-white">{t("pos.tradeFlow")}</h2>
              </div>

              {/* Buy vs Sell visual cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Buy side */}
                <div className="bg-orange-900/20 border border-orange-800/30 rounded-xl p-3 sm:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-orange-900/40">
                      <ArrowDownRight size={16} className="text-orange-400" />
                    </div>
                    <span className="text-sm font-semibold text-orange-400 uppercase tracking-wide">{t("pos.totalBought")}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl sm:text-3xl font-bold text-white">{totalBought} <span className="text-xs sm:text-sm text-gray-400">{t("dashboard.shares")}</span></span>
                      <span className="text-xs sm:text-sm text-orange-400/70 font-medium">{buys.length} {t("tx.trades")}</span>
                    </div>
                    <div className="h-px bg-orange-800/20" />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t("common.total")}</span>
                      <span className="text-white font-semibold">{formatEGP(totalBuyValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t("pos.avgBuyPrice")}</span>
                      <span className="text-white font-semibold">{formatEGP(avgBuyPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{t("common.fees")}</span>
                      <span className="text-amber-400 font-medium">{formatEGP(totalBuyFees)}</span>
                    </div>
                  </div>
                </div>

                {/* Sell side */}
                <div className={`${sells.length > 0 ? "bg-emerald-900/20 border-emerald-800/30" : "bg-gray-800/30 border-gray-700/30"} border rounded-xl p-3 sm:p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${sells.length > 0 ? "bg-emerald-900/40" : "bg-gray-800"}`}>
                      <ArrowUpRight size={16} className={sells.length > 0 ? "text-emerald-400" : "text-gray-500"} />
                    </div>
                    <span className={`text-sm font-semibold uppercase tracking-wide ${sells.length > 0 ? "text-emerald-400" : "text-gray-500"}`}>{t("pos.totalSold")}</span>
                  </div>
                  {sells.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-2xl sm:text-3xl font-bold text-white">{totalSold} <span className="text-xs sm:text-sm text-gray-400">{t("dashboard.shares")}</span></span>
                        <span className="text-xs sm:text-sm text-emerald-400/70 font-medium">{sells.length} {t("tx.trades")}</span>
                      </div>
                      <div className="h-px bg-emerald-800/20" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t("pos.totalProceeds")}</span>
                        <span className="text-white font-semibold">{formatEGP(totalSellValue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t("pos.avgSellPrice")}</span>
                        <span className="text-white font-semibold">{formatEGP(avgSellPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t("common.fees")}</span>
                        <span className="text-amber-400 font-medium">{formatEGP(totalSellFees)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-base mt-4">{t("pos.noSellsYet")}</p>
                  )}
                </div>
              </div>

              {/* Shares flow bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className="font-medium">{t("pos.sharesFlow")}</span>
                  <span>{sellPct.toFixed(0)}% {t("pos.sold")}</span>
                </div>
                <div className="h-8 rounded-full bg-gray-800 overflow-hidden flex">
                  {totalSold > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${sellPct}%`, minWidth: sellPct > 0 ? 40 : 0 }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow">{totalSold}</span>
                    </div>
                  )}
                  {remaining > 0 && (
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${100 - sellPct}%`, minWidth: 40 }}
                    >
                      <span className="text-xs font-bold text-white drop-shadow">{remaining}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> {t("pos.sold")}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> {t("pos.holding")}</span>
                </div>
              </div>

              {/* Capital flow waterfall */}
              {sells.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-3">{t("pos.capitalFlow")}</p>
                  {(() => {
                    const returnPct = totalBuyValue > 0 ? (totalRealized / totalBuyValue) * 100 : 0;
                    return (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {/* Invested */}
                        <div className="bg-blue-900/40 border border-blue-800/30 rounded-xl p-3 text-center">
                          <span className="text-xs text-gray-400 block mb-1">{t("common.invested")}</span>
                          <span className="text-sm font-bold text-blue-400 block">{formatEGP(totalBuyValue)}</span>
                        </div>
                        {/* Proceeds */}
                        <div className="bg-emerald-900/30 border border-emerald-800/30 rounded-xl p-3 text-center">
                          <span className="text-xs text-gray-400 block mb-1">{t("pos.totalProceeds")}</span>
                          <span className="text-sm font-bold text-emerald-400 block">{formatEGP(totalSellValue)}</span>
                        </div>
                        {/* Fees */}
                        <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-3 text-center">
                          <span className="text-xs text-gray-400 block mb-1">{t("common.fees")}</span>
                          <span className="text-sm font-bold text-amber-400 block">{formatEGP(totalFees)}</span>
                        </div>
                        {/* Net P&L */}
                        <div className={`${totalRealized >= 0 ? "bg-emerald-900/30 border-emerald-800/30" : "bg-red-900/30 border-red-800/30"} border rounded-xl p-3 text-center`}>
                          <span className="text-xs text-gray-400 block mb-1">{t("pos.netPnL")}</span>
                          <span className={`text-sm font-bold block ${totalRealized >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {totalRealized >= 0 ? "+" : ""}{formatEGP(totalRealized)}
                          </span>
                        </div>
                        {/* Return % */}
                        <div className={`${returnPct >= 0 ? "bg-emerald-900/30 border-emerald-800/30" : "bg-red-900/30 border-red-800/30"} border rounded-xl p-3 text-center`}>
                          <span className="text-xs text-gray-400 block mb-1">{t("common.return")}</span>
                          <span className={`text-lg font-bold block ${returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Transaction table — detailed view of all trades */}
              {(() => {
                // Compute running cumulative qty & avg cost (weighted average)
                let runQty = 0;
                let runCost = 0;
                let lastAvg = 0;
                const txWithCum = allTransactions.map((tx) => {
                  const qty = parseFloat(tx.quantity);
                  const price = parseFloat(tx.price);
                  if (tx.type === "BUY") {
                    runCost += qty * price;
                    runQty += qty;
                  } else {
                    const avgBefore = runQty > 0 ? runCost / runQty : lastAvg;
                    runQty = Math.max(0, runQty - qty);
                    runCost = runQty * avgBefore;
                  }
                  lastAvg = runQty > 0 ? runCost / runQty : lastAvg;
                  return { ...tx, cumQty: runQty, cumAvg: lastAvg };
                });
                return (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-3">{t("pos.allTx")}</p>

                    {/* Mobile: card view */}
                    <div className="sm:hidden space-y-2">
                      {txWithCum.map((tx) => {
                        const isBuy = tx.type === "BUY";
                        const pnl = tx.pnlOnSell ? parseFloat(tx.pnlOnSell) : null;
                        return (
                          <div key={tx.id} className={`rounded-lg p-3 border ${isBuy ? "border-orange-800/20 bg-orange-900/5" : "border-emerald-800/20 bg-emerald-900/5"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                                  isBuy ? "bg-orange-900/40 text-orange-400" : "bg-emerald-900/40 text-emerald-400"
                                }`}>
                                  {isBuy ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                                  {isBuy ? t("common.buy") : t("common.sell")}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                                </span>
                              </div>
                              <span className="text-white font-bold text-sm">{formatEGP(tx.total)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500">{t("common.qty")}</span>
                                <span className="text-gray-300">{parseFloat(tx.quantity)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">{t("common.price")}</span>
                                <span className="text-gray-300">{formatEGP(tx.price)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">{t("common.fees")}</span>
                                <span className="text-amber-400">{formatEGP(tx.fees)}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/40 text-xs">
                              <span className="text-gray-500">{t("pos.cumQty")}: <span className="text-gray-300 font-mono">{tx.cumQty % 1 === 0 ? tx.cumQty : tx.cumQty.toFixed(2)}</span> · {t("pos.cumAvg")}: <span className="text-gray-300 font-mono">{formatEGP(tx.cumAvg)}</span></span>
                              {pnl != null && (
                                <span className={`font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatSignedEGP(tx.pnlOnSell)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop: table view */}
                    <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-800/60">
                            <th className="text-left px-3 py-2.5 text-xs text-gray-400 font-medium">{t("common.date")}</th>
                            <th className="text-center px-3 py-2.5 text-xs text-gray-400 font-medium">{t("common.type")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("common.qty")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("common.price")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("common.total")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("common.fees")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("pos.cumQty")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("pos.cumAvg")}</th>
                            <th className="text-right px-3 py-2.5 text-xs text-gray-400 font-medium">{t("tx.pnl")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txWithCum.map((tx, i) => {
                            const isBuy = tx.type === "BUY";
                            const pnl = tx.pnlOnSell ? parseFloat(tx.pnlOnSell) : null;
                            return (
                              <tr key={tx.id} className={`border-t border-gray-800/50 ${i % 2 === 0 ? "bg-gray-900/50" : ""}`}>
                                <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">
                                  {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                                    isBuy ? "bg-orange-900/40 text-orange-400" : "bg-emerald-900/40 text-emerald-400"
                                  }`}>
                                    {isBuy ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                                    {isBuy ? t("common.buy") : t("common.sell")}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right text-white font-medium">{parseFloat(tx.quantity)}</td>
                                <td className="px-3 py-2.5 text-right text-white">{formatEGP(tx.price)}</td>
                                <td className="px-3 py-2.5 text-right text-white font-medium">{formatEGP(tx.total)}</td>
                                <td className="px-3 py-2.5 text-right text-amber-400">{formatEGP(tx.fees)}</td>
                                <td className="px-3 py-2.5 text-right text-gray-300 font-mono text-xs">{tx.cumQty % 1 === 0 ? tx.cumQty : tx.cumQty.toFixed(2)}</td>
                                <td className="px-3 py-2.5 text-right text-gray-300 font-mono text-xs">{formatEGP(tx.cumAvg)}</td>
                                <td className={`px-3 py-2.5 text-right font-medium ${pnl == null ? "text-gray-600" : pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {pnl != null ? formatSignedEGP(tx.pnlOnSell) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Trade timeline chart */}
              {timelineData.length > 1 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-3">{t("pos.tradeTimeline")}</p>
                  <div dir="ltr">
                    <ResponsiveContainer width="100%" height={160} className="sm:!h-[200px]">
                      <ComposedChart data={timelineData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={48}
                          tickFormatter={(v: number) => compactEGP(v)} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          content={({ active, payload: tp, label }) => {
                            if (!active || !tp?.length) return null;
                            // Find all data points matching this label (date)
                            const matchingPoints = timelineData.filter(td => td.date === label);
                            if (matchingPoints.length === 0) return null;
                            // If multiple transactions on same date, show all
                            if (matchingPoints.length > 1) {
                              return (
                                <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "12px 16px", minWidth: 220, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
                                  <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 8 }}>{matchingPoints[0].fullDate}</p>
                                  {matchingPoints.map((mp, idx) => {
                                    const mpBuy = mp.type === "BUY";
                                    return (
                                      <div key={idx} style={{ background: mpBuy ? "rgba(249,115,22,0.1)" : "rgba(16,185,129,0.1)", borderLeft: `3px solid ${mpBuy ? "#f97316" : "#10b981"}`, borderRadius: 6, padding: "8px 10px", marginBottom: idx < matchingPoints.length - 1 ? 6 : 0 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                          <span style={{ color: mpBuy ? "#fdba74" : "#6ee7b7", fontSize: 11, fontWeight: 700 }}>{mpBuy ? "BUY" : "SELL"}</span>
                                          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>{formatEGP(mp.total)}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{mp.qty} shares @ {formatEGP(mp.price)}</div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 2 }}>
                                          <span style={{ color: "#9ca3af" }}>{t("common.fees")}: <span style={{ color: "#fbbf24" }}>{formatEGP(mp.fees)}</span></span>
                                          {mp.pnl != null && (
                                            <span style={{ color: mp.pnl >= 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 700 }}>
                                              {mp.pnl >= 0 ? "+" : ""}{formatEGP(mp.pnl)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            const d = matchingPoints[0];
                            const isBuy = d.type === "BUY";
                            const borderColor = isBuy ? "#f97316" : "#10b981";
                            return (
                              <div style={{ background: "#111827", border: `1px solid ${borderColor}`, borderRadius: 10, padding: "12px 16px", minWidth: 210, boxShadow: `0 4px 20px rgba(0,0,0,0.4)` }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                  <span style={{ color: "#9ca3af", fontSize: 11 }}>{d.fullDate}</span>
                                  <span style={{ color: isBuy ? "#fdba74" : "#6ee7b7", fontSize: 11, fontWeight: 700, background: isBuy ? "rgba(249,115,22,0.15)" : "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: 4 }}>
                                    {isBuy ? "BUY" : "SELL"}
                                  </span>
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                                  {formatEGP(d.total)}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "#6b7280" }}>{t("common.qty")}</span>
                                    <span style={{ color: "#d1d5db" }}>{d.qty} shares</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "#6b7280" }}>{t("common.price")}</span>
                                    <span style={{ color: "#d1d5db" }}>{formatEGP(d.price)}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                    <span style={{ color: "#6b7280" }}>{t("common.fees")}</span>
                                    <span style={{ color: "#fbbf24" }}>{formatEGP(d.fees)}</span>
                                  </div>
                                  {d.pnl != null && (
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: "1px solid #1f2937" }}>
                                      <span style={{ color: "#6b7280" }}>{t("tx.pnl")}</span>
                                      <span style={{ color: d.pnl >= 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 700 }}>
                                        {d.pnl >= 0 ? "+" : ""}{formatEGP(d.pnl)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine y={0} stroke="#374151" />
                        <Bar dataKey="buyVal" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={36} name={t("common.buy")}
                          label={{ position: "top", fill: "#fdba74", fontSize: 10, fontWeight: 600, formatter: ((v: unknown) => { const n = Number(v); return n > 0 ? compactEGP(n) : ""; }) as never }} />
                        <Bar dataKey="sellVal" stackId="b" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} name={t("common.sell")}
                          label={{ position: "top", fill: "#6ee7b7", fontSize: 10, fontWeight: 600, formatter: ((v: unknown) => { const n = Number(v); return n > 0 ? compactEGP(n) : ""; }) as never }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-500 inline-block" /> {t("common.buy")}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> {t("common.sell")}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Break-even Gauge — Enhanced */}
        {cp != null && (() => {
          const isAbove = gap != null && gap >= 0;
          const diff = cp - be;
          const qty = parseFloat(position.totalQuantity);
          const unrealizedVal = diff * qty;
          return (
          <div className="bg-gray-900 rounded-xl p-3 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-5">
              <div className="flex items-center gap-2">
                <Target size={14} className={`sm:w-4 sm:h-4 ${isAbove ? "text-emerald-400" : "text-red-400"}`} />
                <h2 className="text-sm sm:text-base font-bold text-white">{t("pos.breakEvenGauge")}</h2>
              </div>
              <span className={`text-lg font-bold px-3 py-1.5 rounded-lg ${isAbove ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                {gap != null ? (gap >= 0 ? "+" : "") + gap.toFixed(2) + "%" : "—"}
              </span>
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="bg-gray-800 rounded-xl p-2.5 sm:p-3.5 text-center border border-yellow-900/20">
                <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{t("portfolio.breakEven")}</p>
                <p className="text-yellow-400 font-bold text-sm sm:text-lg">{formatEGP(be)}</p>
              </div>
              <div className={`bg-gray-800 rounded-xl p-2.5 sm:p-3.5 text-center border ${isAbove ? "border-emerald-900/30" : "border-red-900/30"}`}>
                <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{t("pos.current")}</p>
                <p className={`font-bold text-sm sm:text-lg ${isAbove ? "text-emerald-400" : "text-red-400"}`}>{formatEGP(cp)}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-2.5 sm:p-3.5 text-center">
                <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{isAbove ? t("pos.aboveBreakEven") : t("pos.belowBreakEven")}</p>
                <p className={`font-bold text-sm sm:text-lg ${isAbove ? "text-emerald-400" : "text-red-400"}`}>{formatEGP(Math.abs(diff))}</p>
              </div>
              {!isClosed && qty > 0 && (
                <div className={`bg-gray-800 rounded-xl p-2.5 sm:p-3.5 text-center border ${isAbove ? "border-emerald-900/30" : "border-red-900/30"}`}>
                  <p className="text-gray-500 text-[10px] sm:text-xs mb-1">{t("pos.unrealizedLabel")}</p>
                  <p className={`font-bold text-sm sm:text-lg ${isAbove ? "text-emerald-400" : "text-red-400"}`}>
                    {unrealizedVal >= 0 ? "+" : ""}{formatEGP(unrealizedVal)}
                  </p>
                </div>
              )}
            </div>

            {/* Gauge bar — larger and clearer */}
            <div className="relative mb-2">
              {/* Labels above gauge */}
              <div className="flex justify-between mb-1 px-1">
                <span className="text-xs text-gray-500 font-mono">{formatEGP(gaugeMin)}</span>
                <span className="text-xs text-gray-500 font-mono">{formatEGP(gaugeMax)}</span>
              </div>
              <div className="relative h-10 rounded-xl overflow-hidden bg-gray-800">
                {/* Gradient background zones */}
                <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-red-900/60 to-red-900/20" />
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-emerald-900/20 to-emerald-900/60" />
                {/* Active fill from break-even to current */}
                {gaugeVal <= 50 ? (
                  <div className="absolute top-0 h-full bg-red-500/50 transition-all duration-700 ease-out" style={{ left: `${gaugeVal}%`, width: `${50 - gaugeVal}%` }} />
                ) : (
                  <div className="absolute top-0 h-full bg-emerald-500/50 transition-all duration-700 ease-out" style={{ left: "50%", width: `${gaugeVal - 50}%` }} />
                )}
                {/* Break-even marker line */}
                <div className="absolute top-0 h-full w-0.5 bg-yellow-400 z-10" style={{ left: "50%" }} />
                {/* Break-even label inside gauge */}
                <div className="absolute z-10 -translate-x-1/2 top-1/2 -translate-y-1/2" style={{ left: "50%" }}>
                  <span className="text-[10px] text-yellow-400 font-bold bg-gray-900/80 px-1.5 py-0.5 rounded">BE</span>
                </div>
                {/* Current price needle */}
                <div className="absolute top-0 h-full z-20 transition-all duration-700 ease-out flex flex-col items-center" style={{ left: `${gaugeVal}%`, transform: "translateX(-50%)" }}>
                  <div className="w-1 h-full bg-white rounded shadow-lg shadow-white/30" />
                </div>
              </div>
              {/* Current price label below needle */}
              <div className="relative h-5">
                <div className="absolute -translate-x-1/2 transition-all duration-700 ease-out" style={{ left: `${gaugeVal}%` }}>
                  <span className={`text-[10px] font-bold ${isAbove ? "text-emerald-400" : "text-red-400"}`}>{formatEGP(cp)}</span>
                </div>
                <div className="absolute -translate-x-1/2" style={{ left: "50%" }}>
                  <span className="text-[10px] font-medium text-yellow-400/60">{formatEGP(be)}</span>
                </div>
              </div>
            </div>

            {/* Percentage scale */}
            <div className="flex justify-between px-1 mb-4">
              <span className="text-[10px] text-red-400/50">−{gaugeRangePct}%</span>
              <span className="text-[10px] text-gray-600">0%</span>
              <span className="text-[10px] text-emerald-400/50">+{gaugeRangePct}%</span>
            </div>

            {/* Profit/Loss visualization */}
            {!isClosed && qty > 0 && (
              <div className="pt-4 border-t border-gray-800 space-y-4">
                {/* P&L banner */}
                <div className={`rounded-xl p-4 ${isAbove ? "bg-emerald-900/15 border border-emerald-800/20" : "bg-red-900/15 border border-red-800/20"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${isAbove ? "bg-emerald-900/40" : "bg-red-900/40"}`}>
                        {isAbove ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-red-400" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isAbove ? "text-emerald-400" : "text-red-400"}`}>
                          {isAbove ? "In Profit" : "In Loss"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatEGP(Math.abs(diff))}/share × {qty} shares
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl sm:text-2xl font-bold ${isAbove ? "text-emerald-400" : "text-red-400"}`}>
                        {unrealizedVal >= 0 ? "+" : ""}{formatEGP(unrealizedVal)}
                      </p>
                      <p className={`text-xs font-medium ${isAbove ? "text-emerald-400/70" : "text-red-400/70"}`}>
                        {gap != null ? (gap >= 0 ? "+" : "") + gap.toFixed(2) + "%" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual P&L bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>{t("common.invested")}: {formatEGP(be * qty)}</span>
                    <span>{t("pos.current")}: {formatEGP(cp * qty)}</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-gray-800 overflow-hidden">
                    {isAbove ? (
                      <>
                        <div className="absolute left-0 top-0 h-full bg-blue-600/40 transition-all duration-500" style={{ width: `${(be / cp) * 100}%` }} />
                        <div className="absolute top-0 h-full bg-emerald-500/60 transition-all duration-500" style={{ left: `${(be / cp) * 100}%`, width: `${100 - (be / cp) * 100}%` }} />
                      </>
                    ) : (
                      <>
                        <div className="absolute left-0 top-0 h-full bg-blue-600/40 transition-all duration-500" style={{ width: `${(cp / be) * 100}%` }} />
                        <div className="absolute top-0 h-full bg-red-500/60 transition-all duration-500" style={{ left: `${(cp / be) * 100}%`, width: `${100 - (cp / be) * 100}%` }} />
                      </>
                    )}
                  </div>
                  <div className="flex justify-between text-[10px] mt-1">
                    <span className="text-blue-400/60">{t("common.invested")}</span>
                    <span className={isAbove ? "text-emerald-400/60" : "text-red-400/60"}>
                      {isAbove ? "Profit" : "Loss"}: {formatEGP(Math.abs(unrealizedVal))}
                    </span>
                  </div>
                </div>

                {/* If below break-even, show how much more needed */}
                {!isAbove && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">
                    <Target size={12} className="text-yellow-400 shrink-0" />
                    <span>Needs <span className="text-yellow-400 font-semibold">{formatEGP(be - cp)}</span> more per share (<span className="text-yellow-400">{((be - cp) / cp * 100).toFixed(1)}%</span>) to break even</span>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}

        {/* Price Chart with Trade Markers */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
              <h2 className="text-xs sm:text-sm font-semibold text-gray-400">{t("pos.priceHistory")}</h2>
              <div className="flex gap-1">
                {(["1W","1M","3M","6M","1Y","ALL"] as const).map((r) => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium active:scale-95 transition-all duration-150 ${
                      range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
                    }`}>{r}</button>
                ))}
              </div>
            </div>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={280} className="sm:!h-[400px]">
              <ComposedChart data={chartData} margin={{ top: 8, right: dir === "rtl" ? 16 : 56, left: dir === "rtl" ? 56 : 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="positionPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="holdingProfitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="holdingLossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.95} />
                    <stop offset="50%" stopColor="#ef4444" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="holdingNeutralGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b7280" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#6b7280" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity={0.03} />
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
                  cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={({ active, payload: tooltipPayload }) => {
                    if (!active || !tooltipPayload?.length) return null;
                    const d = tooltipPayload[0]?.payload;
                    if (!d) return null;
                    const trades = (d.allTrades ?? []) as { type: string; price: number; qty: number }[];
                    const hasTrades = trades.length > 0;
                    return (
                      <div style={{ background: "#111827", border: hasTrades ? "1px solid #3b82f6" : "1px solid #374151", borderRadius: 10, padding: "10px 14px", minWidth: 180, boxShadow: hasTrades ? "0 0 16px rgba(59,130,246,0.15)" : undefined }}>
                        <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 4 }}>{d.label}</p>
                        <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: hasTrades ? 8 : 0 }}>
                          {t("common.price")}: {formatEGP(d.price)}
                        </p>
                        {trades.map((tr: { type: string; price: number; qty: number }, i: number) => {
                          const isBuy = tr.type === "BUY";
                          return (
                            <div key={i} style={{ background: isBuy ? "rgba(249,115,22,0.12)" : "rgba(16,185,129,0.12)", borderRadius: 6, padding: "6px 8px", marginBottom: i < trades.length - 1 ? 4 : 0, borderLeft: `3px solid ${isBuy ? "#f97316" : "#10b981"}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ color: isBuy ? "#fdba74" : "#6ee7b7", fontSize: 11, fontWeight: 700 }}>{isBuy ? "BUY" : "SELL"}</span>
                                <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{formatEGP(tr.price)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={{ color: "#9ca3af", fontSize: 10 }}>{tr.qty} {t("dashboard.shares")}</span>
                                <span style={{ color: "#9ca3af", fontSize: 10 }}>{t("common.total")}: {formatEGP(tr.price * tr.qty)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {d.sellPnL != null && (
                          <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: d.sellPnL >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", borderLeft: `3px solid ${d.sellPnL >= 0 ? "#10b981" : "#ef4444"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: "#9ca3af", fontSize: 10 }}>{t("tx.pnl")}</span>
                              <span style={{ color: d.sellPnL >= 0 ? "#6ee7b7" : "#fca5a5", fontSize: 13, fontWeight: 800 }}>
                                {d.sellPnL >= 0 ? "+" : ""}{formatEGP(d.sellPnL)}
                                {d.sellReturnPct != null && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.8 }}>({d.sellReturnPct >= 0 ? "+" : ""}{d.sellReturnPct.toFixed(1)}%)</span>}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                {/* Holding period shaded area — green tint when holding shares */}
                <Area type="monotone" dataKey="holdingProfit" stroke="#10b981" fill="url(#holdingProfitGrad)" strokeWidth={0.5} strokeOpacity={0.3} dot={false} activeDot={false} connectNulls={false} />
                <Area type="monotone" dataKey="holdingLoss" stroke="#ef4444" fill="url(#holdingLossGrad)" strokeWidth={0.5} strokeOpacity={0.3} dot={false} activeDot={false} connectNulls={false} />
                <Area type="monotone" dataKey="holdingNeutral" stroke="#6b7280" fill="url(#holdingNeutralGrad)" strokeWidth={0.5} strokeOpacity={0.3} dot={false} activeDot={false} connectNulls={false} />
                {/* Price line */}
                <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#positionPriceGrad)" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: "#3b82f6", stroke: "#111827", strokeWidth: 2 }} />
                <Scatter dataKey="buyMark" fill="#f97316" shape={(props: { cx?: number; cy?: number; payload?: { buyMark: unknown } }) => {
                  if (!props.payload?.buyMark) return <g />;
                  const cx = props.cx ?? 0, cy = props.cy ?? 0;
                  return (
                    <g>
                      <line x1={cx} y1={8} x2={cx} y2={392} stroke="#f97316" strokeWidth={1} strokeDasharray="4 3" opacity={0.25} />
                      <circle cx={cx} cy={cy} r={16} fill="#f97316" opacity={0.1} />
                      <circle cx={cx} cy={cy} r={10} fill="#f97316" stroke="#fff" strokeWidth={2} />
                      <text x={cx} y={cy + 1} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold" dominantBaseline="middle">B</text>
                    </g>
                  );
                }} />
                <Scatter dataKey="sellMark" fill="#10b981" shape={(props: { cx?: number; cy?: number; payload?: { sellMark: unknown; sellPnL: number | null } }) => {
                  if (!props.payload?.sellMark) return <g />;
                  const cx = props.cx ?? 0, cy = props.cy ?? 0;
                  const pnl = props.payload.sellPnL;
                  const isProfit = pnl != null && pnl >= 0;
                  const pnlColor = pnl != null ? (isProfit ? "#6ee7b7" : "#fca5a5") : "#6ee7b7";
                  const pnlBg = pnl != null ? (isProfit ? "#065f46" : "#7f1d1d") : "#065f46";
                  const pnlText = pnl != null ? `${isProfit ? "+" : ""}${Math.abs(pnl) >= 1000 ? (pnl / 1000).toFixed(1) + "K" : pnl.toFixed(0)}` : "";
                  const labelW = pnlText.length * 7 + 12;
                  return (
                    <g>
                      <line x1={cx} y1={8} x2={cx} y2={392} stroke="#10b981" strokeWidth={1} strokeDasharray="4 3" opacity={0.25} />
                      <circle cx={cx} cy={cy} r={16} fill="#10b981" opacity={0.1} />
                      <circle cx={cx} cy={cy} r={10} fill="#10b981" stroke="#fff" strokeWidth={2} />
                      <text x={cx} y={cy + 1} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold" dominantBaseline="middle">S</text>
                      {pnl != null && (
                        <g>
                          <line x1={cx} y1={cy + 12} x2={cx} y2={cy + 24} stroke={pnlColor} strokeWidth={1} opacity={0.5} />
                          <rect x={cx - labelW / 2} y={cy + 24} width={labelW} height={18} rx={4} fill={pnlBg} stroke={pnlColor} strokeWidth={0.5} opacity={0.95} />
                          <text x={cx} y={cy + 36} textAnchor="middle" fill={pnlColor} fontSize={10} fontWeight="700" dominantBaseline="middle">
                            {pnlText}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }} />
                <ReferenceLine y={be} stroke="#f59e0b" strokeDasharray="5 4" strokeWidth={1.5}
                  label={{ value: t("portfolio.breakEven"), fill: "#f59e0b", fontSize: 10, position: dir === "rtl" ? "left" : "right" }} />
              </ComposedChart>
            </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-5 justify-center mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-block" /> {t("common.buy")}</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block" /> {t("common.sell")}</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-3 rounded bg-emerald-500/20 inline-block border border-emerald-500/30" /> Profit</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-3 rounded bg-red-500/20 inline-block border border-red-500/30" /> Loss</span>
              <span className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-yellow-400 inline-block" /> {t("portfolio.breakEven")}</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 bg-blue-500 inline-block rounded" /> {t("common.price")}</span>
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
            <div className="bg-gray-900 rounded-xl p-3 sm:p-5">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-xs sm:text-sm font-semibold text-gray-400">{t("pos.costLadder")}</h2>
                <span className="text-[10px] sm:text-xs text-gray-500">{ladder.length} lot{ladder.length > 1 ? "s" : ""} · {formatEGP(totalLotValue)} total</span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 sm:mb-4">
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
        {cumulativePnLData.length > 0 && (() => {
          const totalCumPnL = cumulativePnLData[cumulativePnLData.length - 1]?.cumPnL ?? 0;
          const winTrades = cumulativePnLData.filter(d => d.tradePnL >= 0).length;
          const lossTrades = cumulativePnLData.length - winTrades;
          const bestTrade = Math.max(...cumulativePnLData.map(d => d.tradePnL));
          const worstTrade = Math.min(...cumulativePnLData.map(d => d.tradePnL));
          const avgTrade = cumulativePnLData.reduce((s, d) => s + d.tradePnL, 0) / cumulativePnLData.length;

          return (
            <div className="bg-gray-900 rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-gray-400" />
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-400">{t("pos.cumulativePnL")}</h2>
                </div>
                <span className={`text-lg font-bold ${totalCumPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatSignedEGP(totalCumPnL)}
                </span>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t("common.trades")}</p>
                  <p className="text-sm font-bold text-white">{cumulativePnLData.length}</p>
                  <p className="text-[10px] text-gray-500">
                    <span className="text-emerald-400">{winTrades}W</span> / <span className="text-red-400">{lossTrades}L</span>
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t("pos.bestTrade")}</p>
                  <p className={`text-sm font-bold ${bestTrade >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatSignedEGP(bestTrade)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t("pos.worstTrade")}</p>
                  <p className={`text-sm font-bold ${worstTrade >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatSignedEGP(worstTrade)}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t("pos.avgTrade")}</p>
                  <p className={`text-sm font-bold ${avgTrade >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatSignedEGP(avgTrade)}
                  </p>
                </div>
              </div>

              {/* Chart: bars for each trade P&L + cumulative line */}
              {cumulativePnLData.length < 2 ? (
                <div className="h-32 flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
                  {t("pos.needMoreTrades")}
                </div>
              ) : (<>
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={cumulativePnLData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cumPnLGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={totalCumPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={totalCumPnL >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={64}
                      tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)", strokeWidth: 0 }}
                      trigger="hover"
                      content={({ active, payload: tp, label }) => {
                        if (!active || !tp?.length) return null;
                        const matches = cumulativePnLData.filter(d => d.date === label);
                        if (matches.length === 0) return null;
                        return (
                          <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "12px 16px", minWidth: 230, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                            <p style={{ color: "#9ca3af", fontSize: 11, marginBottom: 8 }}>{matches[0].date}</p>
                            {matches.map((d, idx) => {
                              const isProfit = d.tradePnL >= 0;
                              return (
                                <div key={idx} style={{ background: isProfit ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", borderLeft: `3px solid ${isProfit ? "#10b981" : "#ef4444"}`, borderRadius: 6, padding: "8px 10px", marginBottom: idx < matches.length - 1 ? 6 : 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <span style={{ color: isProfit ? "#6ee7b7" : "#fca5a5", fontSize: 11, fontWeight: 700 }}>
                                      {isProfit ? "PROFIT" : "LOSS"}
                                    </span>
                                    <span style={{ color: isProfit ? "#6ee7b7" : "#fca5a5", fontSize: 16, fontWeight: 800 }}>
                                      {isProfit ? "+" : ""}{formatEGP(d.tradePnL)}
                                      {d.returnPct != null && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>({d.returnPct >= 0 ? "+" : ""}{d.returnPct.toFixed(1)}%)</span>}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
                                    <span>{d.qty} shares</span>
                                    <span>{formatEGP(d.buyPrice)} → {formatEGP(d.sellPrice)}</span>
                                  </div>
                                  <div style={{ fontSize: 11, marginTop: 2, color: "#9ca3af" }}>
                                    {t("common.fees")}: <span style={{ color: "#fbbf24" }}>{formatEGP(d.fees)}</span>
                                  </div>
                                </div>
                              );
                            })}
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1f2937", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                              <span style={{ color: "#6b7280" }}>{t("pos.cumulativePnL")}</span>
                              <span style={{ color: matches[matches.length - 1].cumPnL >= 0 ? "#6ee7b7" : "#fca5a5", fontWeight: 700 }}>
                                {matches[matches.length - 1].cumPnL >= 0 ? "+" : ""}{formatEGP(matches[matches.length - 1].cumPnL)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                    {/* Individual trade P&L bars */}
                    <Bar dataKey="tradePnL" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                      {cumulativePnLData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.tradePnL >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.7} />
                      ))}
                    </Bar>
                    {/* Cumulative line */}
                    <Area type="monotone" dataKey="cumPnL" stroke={totalCumPnL >= 0 ? "#10b981" : "#ef4444"}
                      fill="url(#cumPnLGrad)" strokeWidth={2.5}
                      dot={{ r: 5, fill: totalCumPnL >= 0 ? "#10b981" : "#ef4444", stroke: "#111827", strokeWidth: 2 }}
                      activeDot={{ r: 7, stroke: totalCumPnL >= 0 ? "#10b981" : "#ef4444", strokeWidth: 2, fill: "#111827" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-5 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-2 rounded-sm bg-emerald-500/70 inline-block" /> {t("pos.tradePnL")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 rounded bg-emerald-500 inline-block" /> {t("pos.cumulativePnL")}
                </span>
              </div>
              </>)}
            </div>
          );
        })()}

        {/* Transaction History */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h2 className="text-sm font-semibold text-gray-400">{t("pos.allTx")}</h2>
            <div className="flex gap-3 sm:gap-4 text-xs text-gray-500">
              <span className="text-orange-400">{allTransactions.filter(tx => tx.type === "BUY").length} {t("common.buy")}</span>
              <span className="text-emerald-400">{allTransactions.filter(tx => tx.type === "SELL").length} {t("common.sell")}</span>
              {totalFees > 0 && <span className="text-amber-400">{t("pos.totalFeesPaid")}: {formatEGP(totalFees)}</span>}
            </div>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden p-2 space-y-2">
            {(() => {
              let rq = 0, rc = 0, la = 0;
              return allTransactions.map((tx) => {
                const q = parseFloat(tx.quantity), p = parseFloat(tx.price);
                if (tx.type === "BUY") { rc += q * p; rq += q; }
                else { const ab = rq > 0 ? rc / rq : la; rq = Math.max(0, rq - q); rc = rq * ab; }
                la = rq > 0 ? rc / rq : la;
                const isBuy = tx.type === "BUY";
                return (
                  <Link key={tx.id} href={`/portfolio/transactions/${tx.id}`} className={`block rounded-lg p-3 border ${isBuy ? "border-orange-800/20 bg-orange-900/5" : "border-emerald-800/20 bg-emerald-900/5"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${isBuy ? "bg-orange-900/30 text-orange-400" : "bg-emerald-900/30 text-emerald-400"}`}>{tx.type}</span>
                        <span className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-white font-bold text-sm">{formatEGP(tx.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{tx.quantity} × {formatEGP(tx.price)}</span>
                      <span className="text-amber-400">{t("common.fees")}: {formatEGP(tx.fees)}</span>
                    </div>
                    {tx.pnlOnSell != null && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-800/40 flex justify-end">
                        <span className={`text-xs font-bold ${parseFloat(tx.pnlOnSell) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatSignedEGP(tx.pnlOnSell)}
                          {tx.returnPctOnSell != null && (
                            <span className="text-gray-500 ml-1">({parseFloat(tx.returnPctOnSell) >= 0 ? "+" : "−"}{Math.abs(parseFloat(tx.returnPctOnSell)).toFixed(1)}%)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </Link>
                );
              });
            })()}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="px-4 py-2 text-left">{t("tx.date")}</th>
                <th className="px-4 py-2 text-left">{t("tx.type")}</th>
                <th className="px-4 py-2 text-left">{t("common.qty")}</th>
                <th className="px-4 py-2 text-left">{t("common.price")}</th>
                <th className="px-4 py-2 text-left">{t("common.total")}</th>
                <th className="px-4 py-2 text-left">{t("common.fees")}</th>
                <th className="px-4 py-2 text-left">{t("pos.cumQty")}</th>
                <th className="px-4 py-2 text-left">{t("pos.cumAvg")}</th>
                <th className="px-4 py-2 text-left">{t("tx.pnl")}</th>
                <th className="px-4 py-2 text-left">{t("tx.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let rq = 0, rc = 0, la = 0;
                return allTransactions.map((tx) => {
                  const q = parseFloat(tx.quantity), p = parseFloat(tx.price);
                  if (tx.type === "BUY") { rc += q * p; rq += q; }
                  else { const ab = rq > 0 ? rc / rq : la; rq = Math.max(0, rq - q); rc = rq * ab; }
                  la = rq > 0 ? rc / rq : la;
                  const cq = rq, ca = la;
                  return (
                <tr key={tx.id} className="td-row border-b border-gray-800/50">
                  <td className="px-4 py-2 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${tx.type === "BUY" ? "bg-orange-900/30 text-orange-400" : "bg-emerald-900/30 text-emerald-400"}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">{tx.quantity}</td>
                  <td className="px-4 py-2">{formatEGP(tx.price)}</td>
                  <td className="px-4 py-2 font-medium">{formatEGP(tx.total)}</td>
                  <td className="px-4 py-2 text-amber-400/80 text-xs">{formatEGP(tx.fees)}</td>
                  <td className="px-4 py-2 font-mono text-gray-300">{cq % 1 === 0 ? cq : cq.toFixed(2)}</td>
                  <td className="px-4 py-2 font-mono text-gray-300">{formatEGP(ca)}</td>
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
                  );
                });
              })()}
            </tbody>
          </table>
          </div>
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
                        {retPct >= 0 ? "+" : "−"}{Math.abs(retPct).toFixed(2)}%
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
