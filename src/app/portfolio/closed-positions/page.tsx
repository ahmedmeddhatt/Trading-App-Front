"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import RangeSelector from "@/components/RangeSelector";
import { useLanguage } from "@/context/LanguageContext";
import { DateRange, rangeToFromTo } from "@/lib/rangeToFromTo";
import { useAssetType, withAssetType } from "@/store/useTradingMode";
import { Loader2 } from "lucide-react";

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

const fmtCurrency = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

function fmt(val: string | number) {
  return fmtCurrency.format(parseFloat(String(val)));
}

export default function ClosedPositionsPage() {
  const { t } = useLanguage();
  const [range, setRange] = useState<DateRange>("1Y");
  const allTo = new Date().toISOString().slice(0, 10);
  const assetType = useAssetType();
  const { data: allClosedPositions = [], isLoading } = useQuery<ClosedPosition[]>({
    queryKey: ["portfolio", "closed-positions", "ALL", assetType],
    queryFn: () => apiClient.get<ClosedPosition[]>(withAssetType(`/api/portfolio/closed-positions?from=2000-01-01&to=${allTo}`, assetType)),
    retry: 1,
    staleTime: 60_000,
  });

  const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
  const closedPositions = useMemo(() => {
    const cutoffMs = Date.now() - (RANGE_DAYS[range] ?? 365) * 86400000;
    return allClosedPositions.filter((cp) => {
      const d = cp.closeDate ?? cp.lastSellDate;
      return d && new Date(d).getTime() >= cutoffMs;
    });
  }, [allClosedPositions, range]);

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 text-sm">&larr; {t("nav.portfolio")}</Link>
            <h1 className="text-white font-bold text-lg">{t("closed.tableTitle")}</h1>
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
        ) : closedPositions.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600 text-sm">
            {t("common.noData")}
          </div>
        ) : (
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
                  <th className="text-right px-4 py-3">{t("closed.fees")}</th>
                  <th className="text-right px-4 py-3">{t("closed.holdDays")}</th>
                  <th className="text-center px-4 py-3">{t("closed.winLoss")}</th>
                  <th className="text-right px-4 py-3">{t("closed.openDate")}</th>
                  <th className="text-right px-4 py-3">{t("closed.closeDate")}</th>
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
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">{fmt(cp.totalFees)}</td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {cp.holdDays != null ? `${cp.holdDays}d` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-emerald-400 text-xs font-medium">{cp.winCount}W</span>
                        <span className="text-gray-600 mx-1">/</span>
                        <span className="text-orange-400 text-xs font-medium">{cp.lossCount}L</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {cp.openDate ? new Date(cp.openDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
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
        )}
      </main>
    </AppShell>
  );
}
