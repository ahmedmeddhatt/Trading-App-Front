"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { AIModelBadge } from "@/features/recommendations/tracker/AIModelBadge";
import { AIModelLeaderboard } from "@/features/recommendations/tracker/AIModelLeaderboard";
import { SnapshotCalendar } from "@/features/recommendations/tracker/SnapshotCalendar";
import { TrackedPickCard } from "@/features/recommendations/tracker/TrackedPickCard";
import { PickDetailModal } from "@/features/recommendations/tracker/PickDetailModal";
import {
  useSnapshotByDate,
  useSnapshotList,
  useTrackerStats,
} from "@/features/recommendations/tracker/useTrackerSnapshots";

export default function TrackerPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const [aiFilter, setAiFilter] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openPickId, setOpenPickId] = useState<string | null>(null);

  const { data: snapshots, isLoading: loadingList, isError: errorList } = useSnapshotList(
    aiFilter || undefined,
  );
  const { data: stats } = useTrackerStats();
  const { data: detail, isLoading: loadingDetail } = useSnapshotByDate(selectedDate);

  // Auto-select most recent snapshot when list arrives
  useEffect(() => {
    if (!selectedDate && snapshots && snapshots.length > 0) {
      setSelectedDate(snapshots[0].weekStartDate);
    }
  }, [snapshots, selectedDate]);

  const providers = useMemo(() => {
    if (!stats) return [];
    return Object.keys(stats.byModel);
  }, [stats]);

  const marketIcon =
    detail?.marketCondition === "Bull" ? <TrendingUp size={14} className="text-emerald-400" /> :
    detail?.marketCondition === "Bear" ? <TrendingDown size={14} className="text-red-400" /> :
    <Minus size={14} className="text-gray-400" />;
  const marketColor =
    detail?.marketCondition === "Bull" ? "text-emerald-400 bg-emerald-900/30 border-emerald-800/50" :
    detail?.marketCondition === "Bear" ? "text-red-400 bg-red-900/30 border-red-800/50" :
    "text-gray-400 bg-gray-800 border-gray-700";
  const marketLabel =
    detail?.marketCondition === "Bull" ? t("tracker.market.bull") :
    detail?.marketCondition === "Bear" ? t("tracker.market.bear") :
    t("tracker.market.neutral");

  // True when the snapshot has any pick whose performance has been touched
  // (entry hit, T1/T2/stop hit, or non-zero return). Used to decide whether
  // to surface the explanatory "how tracking works" banner.
  const allPending = detail?.picks?.every(
    (p) => !p.performance?.entryHit && !p.performance?.t1Hit && !p.performance?.t2Hit && !p.performance?.stopHit && (p.performance?.evaluationCount ?? 0) === 0,
  ) ?? false;

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        <Link href="/recommendations" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} className={lang === "ar" ? "rotate-180" : ""} />
          {t("tracker.backToRecs")}
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Sparkles size={20} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-white">{t("tracker.title")}</h1>
          </div>
          <p className="text-gray-500 text-sm">{t("tracker.subtitle")}</p>
        </div>

        {/* AI model leaderboard */}
        {stats ? (
          <AIModelLeaderboard stats={stats} />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-24" />
        )}

        {/* AI filter */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-gray-400">{t("tracker.filterByAi")}</span>
          <button
            onClick={() => setAiFilter("")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              aiFilter === "" ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {t("tracker.all")}
          </button>
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setAiFilter(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                aiFilter === p ? "bg-blue-700 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-5">
          {/* Calendar column */}
          <div className="space-y-3">
            {loadingList && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-80" />
            )}
            {errorList && (
              <div className="bg-gray-900 border border-amber-900/40 rounded-xl p-4 text-center text-amber-400 text-sm">
                {t("tracker.loadFailed")}
              </div>
            )}
            {snapshots && snapshots.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center text-gray-400 text-sm">
                {t("tracker.noSnapshots")}
              </div>
            )}
            {snapshots && snapshots.length > 0 && (
              <SnapshotCalendar
                snapshots={snapshots}
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            )}

            {/* Native date input as keyboard fallback */}
            <input
              type="date"
              value={selectedDate ?? ""}
              onChange={(e) => setSelectedDate(e.target.value || null)}
              className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Detail column */}
          <div className="space-y-4">
            {!selectedDate && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                {t("tracker.selectDate")}
              </div>
            )}
            {selectedDate && loadingDetail && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}
            {selectedDate && !loadingDetail && !detail && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400 text-sm">
                {t("tracker.noCoverage")} ({selectedDate})
              </div>
            )}
            {detail && (
              <>
                {/* Snapshot header */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-white">
                      {t("tracker.weekOf")}{" "}
                      {new Date(detail.weekStartDate + "T00:00:00").toLocaleDateString(locale, {
                        weekday: "long", month: "long", day: "numeric", year: "numeric",
                      })}
                    </h2>
                    <AIModelBadge provider={detail.aiProvider} model={detail.aiModel} />
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${marketColor}`}>
                      {marketIcon} {marketLabel}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {t("tracker.generated")} {new Date(detail.generatedAt).toLocaleString(locale)} · {t("tracker.expires")}{" "}
                    {new Date(detail.expiresAt).toLocaleDateString(locale)}
                  </p>
                  {detail.top3Summary && (
                    <p className="text-gray-300 text-sm leading-relaxed pt-2 border-t border-gray-800/60">
                      <span className="text-amber-400 font-semibold">{t("tracker.top3Summary")} </span>
                      {detail.top3Summary}
                    </p>
                  )}
                  {detail.allocationAdvice && (
                    <p className="text-gray-400 text-xs leading-relaxed flex items-start gap-1.5">
                      <PieChart size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      {detail.allocationAdvice}
                    </p>
                  )}
                </div>

                {allPending && (
                  <div className="bg-blue-950/30 border border-blue-900/50 rounded-xl p-3 text-xs text-blue-200 leading-relaxed">
                    <p className="font-semibold mb-1 text-blue-300">{t("tracker.howItWorks.title")}</p>
                    <p className="text-blue-200/80">{t("tracker.howItWorks.body")}</p>
                  </div>
                )}

                {/* Pick grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detail.picks.map((p) => (
                    <TrackedPickCard
                      key={p.id}
                      pick={p}
                      onClick={() => setOpenPickId(p.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {openPickId && (
        <PickDetailModal pickId={openPickId} onClose={() => setOpenPickId(null)} />
      )}
    </AppShell>
  );
}
