"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, TrendingUp, TrendingDown, Minus, PieChart, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { useWeeklyPicks } from "@/features/recommendations/useWeeklyPicks";
import { WeeklyPickCard } from "@/features/recommendations/WeeklyPickCard";
import { useQueryClient } from "@tanstack/react-query";

export default function RecommendationsPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError } = useWeeklyPicks();

  const marketIcon =
    data?.marketCondition === "Bull" ? <TrendingUp size={14} className="text-emerald-400" /> :
    data?.marketCondition === "Bear" ? <TrendingDown size={14} className="text-red-400" /> :
    <Minus size={14} className="text-gray-400" />;
  const marketColor =
    data?.marketCondition === "Bull" ? "text-emerald-400 bg-emerald-900/30 border-emerald-800/50" :
    data?.marketCondition === "Bear" ? "text-red-400 bg-red-900/30 border-red-800/50" :
    "text-gray-400 bg-gray-800 border-gray-700";

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} />
          {t("common.back") ?? "Back to Dashboard"}
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <p className="text-gray-500 text-sm italic">بسم الله الرحمن الرحيم</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-400" />
              <h1 className="text-2xl font-bold text-white">{t("recommendations.pageTitle") ?? "AI Weekly Stock Recommendations"}</h1>
            </div>
            {data?.marketCondition && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${marketColor}`}>
                {marketIcon} {data.marketCondition}
              </span>
            )}
            <button
              onClick={async () => {
                setRefreshing(true);
                try {
                  const res = await fetch(`/api/stocks/weekly-picks?lang=${lang}&refresh=true`);
                  if (res.ok) {
                    await queryClient.invalidateQueries({ queryKey: ["stocks", "weekly-picks"] });
                  }
                } catch {
                  // ignore — stale data stays
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? (lang === "ar" ? "جارٍ التحديث..." : "Refreshing...") : (lang === "ar" ? "تحديث البيانات" : "Refresh")}
            </button>
          </div>
          {data?.generatedAt && (
            <p className="text-gray-500 text-sm">
              {t("recommendations.generatedOn") ?? "Generated on"}{" "}
              {new Date(data.generatedAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · "}
              {t("recommendations.expiresOn")}{" "}
              {new Date(data.expiresAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          )}
        </div>

        {isError && (
          <div className="bg-gray-900/60 border border-amber-900/40 rounded-xl p-6 text-center">
            <span className="text-amber-400 text-sm">{t("recommendations.error") ?? "Could not load AI recommendations. Please try again later."}</span>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {data && data.picks.length > 0 && (
          <>
            {/* Top 3 highlight */}
            {data.top3Summary && (
              <div className="bg-gradient-to-r from-blue-900/30 to-emerald-900/20 border border-blue-800/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm font-semibold">{t("recommendations.top3") ?? "Top 3 for Immediate Entry"}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{data.top3Summary}</p>
              </div>
            )}

            {/* All 10 picks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.picks.map((pick) => (
                <WeeklyPickCard key={pick.symbol} pick={pick} expanded />
              ))}
            </div>

            {/* Allocation advice */}
            {data.allocationAdvice && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <PieChart size={16} className="text-blue-400" />
                  <span className="text-gray-300 text-sm font-semibold">{t("recommendations.allocation") ?? "Portfolio Allocation Advice"}</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{data.allocationAdvice}</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs leading-relaxed">
                {t("recommendations.disclaimer") ?? "This is an educational technical analysis. The final decision rests with the investor; there are no guarantees in the financial markets."}
              </p>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
