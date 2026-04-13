"use client";

import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useWeeklyPicks } from "./useWeeklyPicks";
import { WeeklyPickCard } from "./WeeklyPickCard";

export default function WeeklyPicksSection() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useWeeklyPicks();

  if (isError) {
    return (
      <div className="space-y-3">
        <SectionHeader t={t} />
        <div className="bg-gray-900/60 border border-amber-900/40 rounded-xl p-4 text-center">
          <span className="text-amber-400 text-sm">{t("recommendations.error") ?? "Could not load AI recommendations"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader t={t} generatedAt={data?.generatedAt} />

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[220px] sm:min-w-0">
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : data?.picks && data.picks.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
          {data.picks.slice(0, 5).map((pick) => (
            <div key={pick.symbol} className="min-w-[220px] sm:min-w-0">
              <WeeklyPickCard pick={pick} />
            </div>
          ))}
        </div>
      ) : null}

      {data?.picks && data.picks.length > 5 && (
        <div className="flex justify-center pt-1">
          <Link
            href="/recommendations"
            className="inline-flex items-center gap-1.5 px-5 py-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {t("recommendations.showMore") ?? "View All 10 Recommendations"}
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ t, generatedAt }: { t: (key: string) => string | undefined; generatedAt?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-amber-400" />
        <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">
          {t("recommendations.title") ?? "AI Weekly Picks"}
        </h2>
        {generatedAt && (
          <span className="text-gray-600 text-xs hidden sm:inline">
            {new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      <Link href="/recommendations" className="text-base sm:text-xs text-blue-400 hover:text-blue-300 font-medium">
        {t("common.viewAll") ?? "View All"}
      </Link>
    </div>
  );
}
