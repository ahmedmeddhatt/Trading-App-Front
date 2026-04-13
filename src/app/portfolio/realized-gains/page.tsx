"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import RangeSelector from "@/components/RangeSelector";
import { useLanguage } from "@/context/LanguageContext";
import { useAssetType, withAssetType } from "@/store/useTradingMode";
import { DateRange, rangeToFromTo } from "@/lib/rangeToFromTo";

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

const fmtCurrency = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

function fmt(val: string | number) {
  return fmtCurrency.format(parseFloat(String(val)));
}

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

export default function RealizedGainsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [range, setRange] = useState<DateRange>("1Y");
  const allTo = new Date().toISOString().slice(0, 10);
  const assetType = useAssetType();
  const { data: allData, isLoading } = useQuery<RealizedGainsResponse>({
    queryKey: ["portfolio", "realized-gains", "ALL", assetType],
    queryFn: () => apiClient.get<RealizedGainsResponse>(withAssetType(`/api/portfolio/realized-gains?from=2000-01-01&to=${allTo}`, assetType)),
    retry: 1,
    staleTime: 60_000,
  });

  const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
  const data = useMemo(() => {
    if (!allData) return allData;
    const cutoffMs = Date.now() - (RANGE_DAYS[range] ?? 365) * 86400000;
    const filteredGains = allData.gains.filter(g => new Date(g.date).getTime() >= cutoffMs);
    if (filteredGains.length === 0) return { gains: [], summary: null };
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
  const filteredIsWin = filteredProfit >= 0;

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 text-sm">&larr; {t("nav.portfolio")}</Link>
            <h1 className="text-white font-bold text-lg">{t("portfolio.realizedPnl")} — {t("realized.allTrades")}</h1>
          </div>
          <div className="flex gap-1">
            {(["1W","1M","3M","6M","1Y"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${
                  range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
                }`}>{r}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-gray-900 rounded-xl p-4 flex justify-center py-8">
            <Loader2 className="animate-spin text-gray-500" size={20} />
          </div>
        ) : !summary || summary.count === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600 text-sm">
            {t("common.noData")}
          </div>
        ) : (
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
                    <p className={`text-sm font-bold ${parseFloat(summary.totalProfit) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {parseFloat(summary.totalProfit) >= 0 ? "+" : "−"}{fmt(Math.abs(parseFloat(summary.totalProfit)))}
                    </p>
                  </div>
                </div>
              </div>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <p className="text-gray-500 text-xs mb-0.5">Total Return</p>
                  <p className={`text-sm font-bold ${summary.totalReturn == null ? "text-gray-400" : parseFloat(summary.totalReturn) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {summary.totalReturn != null ? `${parseFloat(summary.totalReturn) >= 0 ? "+" : ""}${parseFloat(summary.totalReturn).toFixed(2)}%` : "—"}
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

            {/* Preset chips */}
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
                      <tr key={g.id} className="border-b border-gray-800/60 hover:bg-gray-800/20 transition-colors cursor-pointer" onClick={() => router.push(`/portfolio/positions/${g.symbol}`)}>
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
        )}
      </main>
    </AppShell>
  );
}
