"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Award, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import { useLanguage } from "@/context/LanguageContext";

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

const fmtCurrency = new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 });
function fmtEGP(v: number) { return fmtCurrency.format(v); }
function fmtSignedEGP(v: number) { return `${v >= 0 ? "+" : "−"}${fmtCurrency.format(Math.abs(v))}`; }

const GRADE_COLORS = { A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316" };
const GRADE_BG: Record<string, string> = {
  A: "bg-emerald-900/30 text-emerald-400",
  B: "bg-blue-900/30 text-blue-400",
  C: "bg-amber-900/30 text-amber-400",
  D: "bg-orange-900/30 text-orange-400",
};

export default function ClosedTradesPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["closed-trades"],
    queryFn: () => apiClient.get<{ trades: ClosedTrade[]; summary: ClosedTradesSummary }>("/api/analytics/closed-trades"),
  });

  const trades = data?.trades ?? [];
  const summary = data?.summary;

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/analytics" className="text-blue-400 hover:text-blue-300 text-sm">&larr; {t("nav.analytics")}</Link>
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-400" />
            <h1 className="text-white font-bold text-lg">{t("analytics.closedScoring")}</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-gray-900 rounded-xl p-4 flex justify-center py-8">
            <Loader2 className="animate-spin text-gray-500" size={20} />
          </div>
        ) : trades.length === 0 ? (
          <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600 text-sm">
            {t("common.noData")}
          </div>
        ) : (
          <>
            {/* Summary stats */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t("analytics.totalClosed"), value: summary.totalTrades },
                  { label: t("analytics.avgHold"), value: `${parseFloat(String(summary.avgHoldDays)).toFixed(0)}d` },
                  { label: t("analytics.avgAnnReturn"), value: `${parseFloat(String(summary.avgAnnualizedReturn)).toFixed(1)}%` },
                  { label: t("analytics.gradeA"), value: summary.gradeDistribution.A, cls: "text-emerald-400" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-gray-900 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">{label}</p>
                    <p className={`text-xl font-bold ${cls ?? "text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Grade distribution + explanation */}
            {summary && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-xl p-4 space-y-2">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">{t("analytics.gradeDist")}</p>
                  {Object.entries(summary.gradeDistribution)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => {
                      const pct = summary.totalTrades > 0 ? (v / summary.totalTrades) * 100 : 0;
                      const color = GRADE_COLORS[k as keyof typeof GRADE_COLORS] ?? "#6b7280";
                      return (
                        <div key={k} className="flex items-center gap-3">
                          <span className={`w-8 text-center px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_BG[k]}`}>{k}</span>
                          <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden relative">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }} />
                            <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-white">
                              {v} {v === 1 ? "trade" : "trades"} ({pct.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="bg-gray-900 rounded-xl p-4 space-y-2">
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

            {/* Full trades table */}
            <div className="bg-gray-900 rounded-xl overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">{t("analytics.closedScoring")}</h2>
                <span className="text-gray-600 text-xs">{trades.length} {t("realized.trades")}</span>
              </div>
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
          </>
        )}
      </main>
    </AppShell>
  );
}
