"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, TrendingUp, TrendingDown, Minus, PieChart,
  RefreshCw, LineChart, Zap, AlertTriangle, Info, Calendar, Target, Activity,
  LayoutGrid, ListOrdered, Clock, Ban, Wifi, KeyRound, MessageCircleOff,
  ChevronDown, Trophy, Medal, Award, ArrowRight,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { useWeeklyPicks } from "@/features/recommendations/useWeeklyPicks";
import { WeeklyPickCard } from "@/features/recommendations/WeeklyPickCard";
import { AIModelBadge } from "@/features/recommendations/tracker/AIModelBadge";
import { parseProviderError, type ProviderErrorKind } from "@/features/recommendations/providerError";
import { useIsAdmin } from "@/features/auth/useCurrentUser";
import { useCanSeeRecommendations } from "@/features/auth/recsAllowList";
import { useQueryClient } from "@tanstack/react-query";

/** Pick a small icon to visualise an error kind on the failed-row card. */
function ProviderErrorIcon({ kind, className }: { kind: ProviderErrorKind; className?: string }) {
  switch (kind) {
    case "rate-limit":
    case "quota":
      return <Ban className={className} />;
    case "timeout":
      return <Clock className={className} />;
    case "empty":
      return <MessageCircleOff className={className} />;
    case "auth":
      return <KeyRound className={className} />;
    case "model-unavailable":
      return <AlertTriangle className={className} />;
    case "network":
      return <Wifi className={className} />;
    default:
      return <Info className={className} />;
  }
}

export default function RecommendationsPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const { allowed, ready } = useCanSeeRecommendations();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"sorted" | "grouped">("sorted");
  // Multi-select badge filter — providers excluded here have their picks hidden.
  // Default = all providers visible; toggling a chip removes only that AI's picks.
  const [excludedProviders, setExcludedProviders] = useState<Set<string>>(new Set());
  // Per-provider collapsed state in the grouped view. Tracks which providers
  // the user has explicitly *collapsed*; failed providers also default to
  // collapsed (their body is just an error). Successful providers default open.
  const [collapsedProviders, setCollapsedProviders] = useState<Set<string>>(new Set());
  const { data, isLoading, isError } = useWeeklyPicks();
  const isAdmin = useIsAdmin();

  const marketIcon =
    data?.marketCondition === "Bull" ? <TrendingUp size={14} /> :
    data?.marketCondition === "Bear" ? <TrendingDown size={14} /> :
    <Minus size={14} />;
  const marketStyle =
    data?.marketCondition === "Bull"
      ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50"
      : data?.marketCondition === "Bear"
        ? "text-red-700 dark:text-red-400 bg-red-100/80 dark:bg-red-900/30 border-red-200 dark:border-red-800/50"
        : "text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700";

  // Aggregate stats across all picks for the hero strip
  const stats = useMemo(() => {
    if (!data?.picks?.length) return null;
    const picks = data.picks;
    const avgConfidence = picks.reduce((s, p) => s + p.confidence, 0) / picks.length;
    const sectors = new Set(picks.map((p) => p.sector));
    const upTrend = picks.filter((p) => p.trend === "Up").length;
    const avgUpside = picks.reduce((s, p) => {
      const gain = p.entry > 0 ? ((p.targets.t1 - p.entry) / p.entry) * 100 : 0;
      return s + gain;
    }, 0) / picks.length;
    return {
      count: picks.length,
      avgConfidence,
      sectorsCount: sectors.size,
      upTrend,
      avgUpside,
    };
  }, [data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/stocks/weekly-picks?lang=${lang}&refresh=true`);
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["stocks", "weekly-picks"] });
      }
    } catch {
      /* stale data stays */
    } finally {
      setRefreshing(false);
    }
  };

  // Gate the page to the recs allow-list. Render a neutral "not available"
  // screen for everyone else — same shell, no AI fetching, no flicker. While
  // the auth query is in-flight (`ready=false`) we render the page normally
  // because most visitors are allow-listed; flipping to a denied screen on
  // first paint would be jarring. If the query resolves and they aren't
  // allowed, swap in the placeholder.
  if (ready && !allowed) {
    return (
      <AppShell>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            {t("common.back") ?? "Back to Dashboard"}
          </Link>
          <section className="rounded-3xl border border-gray-200 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-900/40 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
              <Sparkles size={26} className="text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
              {lang === "ar" ? "غير متاح حاليًا" : "Not available"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
              {lang === "ar"
                ? "ميزة التوصيات بالذكاء الاصطناعي مقصورة على حسابات محددة في الوقت الحالي."
                : "The AI Recommendations feature is currently restricted to specific accounts."}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {t("common.back") ?? "Back to Dashboard"}
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          {t("common.back") ?? "Back to Dashboard"}
        </Link>

        {/* ─── Hero header ─────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-gray-100 dark:border-gray-800/60 bg-gradient-to-br from-blue-50 via-white to-amber-50 dark:from-blue-950/30 dark:via-gray-900 dark:to-amber-950/20 shadow-sm">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-300/20 dark:bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-amber-300/20 dark:bg-amber-500/10 blur-3xl" />

          <div className="relative p-5 sm:p-7 space-y-4">
            {/* Bismillah */}
            <p className="text-gray-500 dark:text-gray-500 text-sm italic font-arabic" style={{ direction: "rtl" }}>
              بسم الله الرحمن الرحيم
            </p>

            {/* Title row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-500/30">
                  <Sparkles size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                    {t("recommendations.pageTitleDaily") ?? "AI Daily Stock Recommendations"}
                  </h1>
                  {data?.generatedAt && (
                    <p className="text-gray-500 dark:text-gray-500 text-xs sm:text-sm flex items-center gap-1.5 mt-1">
                      <Calendar size={12} className="opacity-70" />
                      {new Date(data.generatedAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      <span className="opacity-50 mx-1">•</span>
                      {t("recommendations.refreshesDaily") ?? "Refreshes daily at 8:00 Cairo"}
                    </p>
                  )}
                </div>
              </div>

              {/* Action chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {data?.marketCondition && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${marketStyle}`}>
                    {marketIcon}
                    {data.marketCondition} {t("common.market") ?? "Market"}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? (lang === "ar" ? "جارٍ التحديث..." : "Refreshing...") : (lang === "ar" ? "تحديث" : "Refresh")}
                </button>
                {isAdmin && (
                  <Link
                    href="/recommendations/tracker"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/50 transition-all shadow-sm"
                  >
                    <LineChart size={13} />
                    {t("tracker.viewTracker")}
                  </Link>
                )}
              </div>
            </div>

            {/* Quick stats strip */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="rounded-xl bg-white/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t("recommendations.totalPicks") ?? "Picks"}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-none mt-0.5">{stats.count}</p>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t("recommendations.avgConfidence") ?? "Avg Confidence"}</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-none mt-0.5">
                    {stats.avgConfidence.toFixed(1)}<span className="text-xs font-medium text-gray-400 ml-0.5">/10</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t("recommendations.avgUpside") ?? "Avg Upside"}</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                    +{stats.avgUpside.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl bg-white/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 px-3 py-2.5 backdrop-blur-sm">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{t("recommendations.sectors") ?? "Sectors"}</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-none mt-0.5">
                    {stats.sectorsCount}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── Error state ─────────────────────────────────────── */}
        {isError && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-900/10 p-5 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 dark:text-amber-300 font-semibold text-sm">
                {lang === "ar" ? "تعذر التحميل" : "Couldn't load recommendations"}
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80 text-xs mt-1">
                {t("recommendations.error") ?? "Could not load AI recommendations. Please try again later."}
              </p>
            </div>
          </div>
        )}

        {/* ─── Loading skeleton ───────────────────────────────── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {data && data.picks.length > 0 && (
          <>
            {/* ─── All picks ──────────────────────────────────── */}
            {(() => {
              // Build a list of all providers that contributed picks, ordered by source provider order.
              const providersWithPicks = (data.providers ?? []).filter(
                (pr) => pr.status === "ok" && data.picks.some((p) => p.aiProvider === pr.provider),
              );
              // Apply badge filter
              const filteredPicks = data.picks.filter(
                (p) => !p.aiProvider || !excludedProviders.has(p.aiProvider),
              );
              const toggleProvider = (provider: string) => {
                setExcludedProviders((prev) => {
                  const next = new Set(prev);
                  if (next.has(provider)) next.delete(provider);
                  else next.add(provider);
                  return next;
                });
              };
              const allFiltered = excludedProviders.size === 0;
              const clearFilters = () => setExcludedProviders(new Set());

              return (
                <section className="space-y-4">
                  {/* Title + view toggle + count */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                      <Target size={16} className="text-blue-500" />
                      {t("recommendations.allPicks") ?? "All Picks"}
                    </h2>
                    <div className="flex items-center gap-2">
                      {data.picks.some((p) => p.aiProvider) && (
                        <div className="inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 p-0.5 text-xs">
                          <button
                            onClick={() => setViewMode("sorted")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-colors ${
                              viewMode === "sorted"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <ListOrdered size={11} />
                            {t("recommendations.viewSorted") ?? "Sorted"}
                          </button>
                          <button
                            onClick={() => setViewMode("grouped")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-colors ${
                              viewMode === "grouped"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <LayoutGrid size={11} />
                            {t("recommendations.viewGrouped") ?? "By AI"}
                          </button>
                        </div>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-500 font-medium tabular-nums">
                        {viewMode === "sorted"
                          ? `${filteredPicks.length}/${data.picks.length}`
                          : `${data.picks.length}`}{" "}
                        {t("recommendations.opportunities") ?? "opportunities"}
                      </span>
                    </div>
                  </div>

                  {/* Badge filter row — clickable AI chips. Only shown in Sorted view (Grouped already separates by AI). */}
                  {viewMode === "sorted" && providersWithPicks.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap rounded-xl border border-gray-200/70 dark:border-gray-800/60 bg-gray-50/60 dark:bg-gray-900/40 px-3 py-2.5">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 font-bold mr-1">
                        {t("recommendations.filterByAi") ?? "Filter"}
                      </span>
                      {providersWithPicks.map((pr) => {
                        const isExcluded = excludedProviders.has(pr.provider);
                        const count = data.picks.filter((p) => p.aiProvider === pr.provider).length;
                        return (
                          <button
                            key={pr.provider}
                            onClick={() => toggleProvider(pr.provider)}
                            className={`group inline-flex items-center gap-1.5 transition-all ${
                              isExcluded ? "opacity-30 hover:opacity-60" : "opacity-100 hover:scale-[1.04]"
                            } active:scale-95`}
                            title={isExcluded ? `Show ${pr.provider}` : `Hide ${pr.provider}`}
                          >
                            <AIModelBadge provider={pr.provider} size="sm" />
                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-500 tabular-nums">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                      {!allFiltered && (
                        <button
                          onClick={clearFilters}
                          className="ml-auto text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline-offset-2 hover:underline"
                        >
                          {lang === "ar" ? "إظهار الكل" : "Show all"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Sorted view — filtered, confidence-ranked grid */}
                  {viewMode === "sorted" ? (
                    filteredPicks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30 px-4 py-12 text-center">
                        <p className="text-gray-500 dark:text-gray-500 text-sm">
                          {lang === "ar"
                            ? "لا توجد توصيات مطابقة للمرشحات. أزل بعض المرشحات للعرض."
                            : "No picks match the active filters. Clear filters to see everything."}
                        </p>
                        <button
                          onClick={clearFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          {lang === "ar" ? "إظهار الكل" : "Show all"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPicks.map((pick) => (
                          <WeeklyPickCard
                            key={pick.symbol + (pick.aiProvider ?? "")}
                            pick={pick}
                            expanded
                          />
                        ))}
                      </div>
                    )
                  ) : (() => {
                    /* Grouped — one row per AI model with clear visual separation.
                       Available (status=ok) providers are listed first, failed
                       providers sink to the bottom — within each group the
                       original backend order is preserved (stable sort).
                       Each row is independently collapsible (click the header).
                       A summary chip strip above mirrors the row collapse state. */
                    const sortedProviders = [...(data.providers ?? [])]
                      .map((pr, idx) => ({ pr, idx }))
                      .sort((a, b) => {
                        const aRank = a.pr.status === "ok" ? 0 : 1;
                        const bRank = b.pr.status === "ok" ? 0 : 1;
                        if (aRank !== bRank) return aRank - bRank;
                        return a.idx - b.idx;
                      })
                      .map(({ pr }) => pr);

                    // Helpers — share the "default collapsed" rule between strip + rows
                    // so the visual state is consistent.
                    const computeDefaultCollapsed = (provider: string, status: "ok" | "failed") => {
                      if (status === "failed") return true;
                      const picks = data.picks.filter((p) => p.aiProvider === provider);
                      return picks.length === 0;
                    };
                    const isProviderCollapsed = (provider: string, status: "ok" | "failed") => {
                      const def = computeDefaultCollapsed(provider, status);
                      return collapsedProviders.has(provider) ? !def : def;
                    };
                    const toggleProviderCollapsed = (provider: string) => {
                      setCollapsedProviders((prev) => {
                        const next = new Set(prev);
                        if (next.has(provider)) next.delete(provider);
                        else next.add(provider);
                        return next;
                      });
                    };

                    return (
                    <div className="space-y-3">
                      {/* ── Per-model summary strip (toggles) ──
                          One chip per provider showing badge + pick count + failure
                          mark. Clicking a chip toggles that provider's row open/closed
                          so the user can navigate quickly without scrolling. */}
                      {sortedProviders.length > 0 && (
                        <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/60 bg-gradient-to-br from-gray-50/80 to-white dark:from-gray-900/60 dark:to-gray-900/30 p-3 sm:p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 font-bold flex items-center gap-1.5">
                              <Activity size={11} className="opacity-70" />
                              {lang === "ar" ? "ملخص النماذج" : "Model summary"}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-medium">
                              {lang === "ar" ? "اضغط لفتح/طي" : "Tap to expand · collapse"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {sortedProviders.map((pr) => {
                              const failed = pr.status === "failed";
                              const picks = data.picks.filter((p) => p.aiProvider === pr.provider);
                              const isCollapsed = isProviderCollapsed(pr.provider, pr.status);
                              const errorParsed = failed && pr.status === "failed"
                                ? parseProviderError(pr.error)
                                : null;
                              return (
                                <button
                                  key={pr.provider}
                                  onClick={() => toggleProviderCollapsed(pr.provider)}
                                  aria-expanded={!isCollapsed}
                                  aria-controls={`provider-row-${pr.provider}`}
                                  title={
                                    failed
                                      ? `${pr.provider} — ${errorParsed?.message ?? "failed"}`
                                      : `${pr.provider} · ${picks.length} ${picks.length === 1 ? "pick" : "picks"}`
                                  }
                                  className={`group inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border text-[11px] font-bold transition-all active:scale-95 ${
                                    failed
                                      ? "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                                      : picks.length === 0
                                      ? "bg-gray-50 dark:bg-gray-800/40 border-gray-200/60 dark:border-gray-700/50 text-gray-400 dark:text-gray-600"
                                      : isCollapsed
                                      ? "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20"
                                      : "bg-blue-50 dark:bg-blue-950/40 border-blue-300/70 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 shadow-sm"
                                  }`}
                                >
                                  <AIModelBadge provider={pr.provider} size="sm" />
                                  <span className="tabular-nums">{picks.length}</span>
                                  {failed && errorParsed ? (
                                    <ProviderErrorIcon kind={errorParsed.kind} className="w-3 h-3 opacity-70" />
                                  ) : (
                                    <ChevronDown
                                      size={11}
                                      className={`transition-transform duration-200 ${
                                        isCollapsed ? "" : "rotate-180"
                                      } opacity-60 group-hover:opacity-100`}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {/* Aggregate counts at end of strip */}
                          <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {sortedProviders.filter((p) => p.status === "ok" && data.picks.some((pp) => pp.aiProvider === p.provider)).length} {lang === "ar" ? "متاح" : "available"}
                              </span>
                              {sortedProviders.some((p) => p.status === "failed") && (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  {sortedProviders.filter((p) => p.status === "failed").length} {lang === "ar" ? "فشل" : "failed"}
                                </span>
                              )}
                            </div>
                            <span className="tabular-nums font-semibold text-gray-600 dark:text-gray-400">
                              {data.picks.length} {t("recommendations.opportunities") ?? "picks"}
                            </span>
                          </div>
                        </div>
                      )}

                      {sortedProviders.map((pr) => {
                        const failed = pr.status === "failed";
                        const providerPicks = data.picks.filter((p) => p.aiProvider === pr.provider);
                        const isEmpty = !failed && providerPicks.length === 0;
                        const errorParsed = failed && pr.status === "failed"
                          ? parseProviderError(pr.error)
                          : null;
                        const isCollapsed = isProviderCollapsed(pr.provider, pr.status);
                        const toggleRow = () => toggleProviderCollapsed(pr.provider);
                        return (
                          <div
                            key={pr.provider}
                            className={`rounded-2xl border overflow-hidden transition-shadow ${
                              failed
                                ? "border-red-200/70 dark:border-red-900/30 bg-red-50/40 dark:bg-red-950/10"
                                : isEmpty
                                ? "border-gray-200/70 dark:border-gray-800/60 bg-gray-50/40 dark:bg-gray-900/30"
                                : "border-gray-200/70 dark:border-gray-800/60 bg-white/40 dark:bg-gray-900/30 hover:shadow-sm"
                            }`}
                          >
                            {/* Row header — clickable to toggle the body */}
                            <button
                              type="button"
                              onClick={toggleRow}
                              aria-expanded={!isCollapsed}
                              aria-controls={`provider-row-${pr.provider}`}
                              className={`w-full px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap text-left transition-colors ${
                                isCollapsed ? "" : "border-b border-gray-100/80 dark:border-gray-800/60"
                              } hover:bg-gray-50/60 dark:hover:bg-gray-800/30 active:bg-gray-100/60 dark:active:bg-gray-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
                            >
                              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                {/* Chevron — rotates when expanded */}
                                <ChevronDown
                                  size={14}
                                  className={`text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${
                                    isCollapsed ? "" : "rotate-180"
                                  }`}
                                />
                                <AIModelBadge
                                  provider={pr.provider}
                                  model={pr.status === "ok" ? pr.model : undefined}
                                  size="md"
                                />
                                {pr.status === "ok" && pr.summary && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400 italic min-w-0 line-clamp-1 hidden sm:inline">
                                    {pr.summary}
                                  </span>
                                )}
                                {failed && errorParsed && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200/70 dark:border-red-800/50">
                                    <ProviderErrorIcon kind={errorParsed.kind} className="w-3 h-3" />
                                    {errorParsed.message}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500 tabular-nums shrink-0">
                                {failed
                                  ? "—"
                                  : `${providerPicks.length} ${
                                      providerPicks.length === 1
                                        ? lang === "ar"
                                          ? "توصية"
                                          : "pick"
                                        : t("recommendations.opportunities") ?? "picks"
                                    }`}
                              </span>
                            </button>

                            {/* Row body — collapse via display toggle (reliable across browsers).
                                We deliberately avoid the grid-template-rows fr-trick because Safari
                                and some Chrome versions don't reliably collapse non-zero content. */}
                            {!isCollapsed && (
                              <div
                                id={`provider-row-${pr.provider}`}
                                className="p-3 sm:p-4"
                              >
                                {failed && errorParsed ? (
                                  <div className="flex items-start gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                      <ProviderErrorIcon kind={errorParsed.kind} className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold leading-snug">
                                        {errorParsed.message}
                                      </p>
                                      {errorParsed.hint && (
                                        <p className="text-[11px] text-gray-500 dark:text-gray-500 leading-snug mt-0.5">
                                          {errorParsed.hint}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : providerPicks.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {providerPicks.map((pick) => (
                                      <WeeklyPickCard
                                        key={pick.symbol + pr.provider}
                                        pick={pick}
                                        expanded
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 dark:text-gray-600 italic">
                                    {lang === "ar" ? "لا توجد توصيات" : "No picks"}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Bulk actions when there's any state to manage */}
                      {(data.providers ?? []).length > 1 && (
                        <div className="flex items-center justify-end gap-3 pt-1">
                          <button
                            onClick={() => {
                              const all = (data.providers ?? []).map((p) => p.provider);
                              // Force everything collapsed regardless of default state:
                              // for ok rows the toggle moves them to collapsed; for failed
                              // rows (default collapsed) toggling sets them to expanded — so
                              // we need the *exact opposite* logic: clear, then add toggles
                              // for any provider whose default is not "collapsed".
                              setCollapsedProviders(new Set(all.filter((p) => {
                                const pr = (data.providers ?? []).find((x) => x.provider === p);
                                const f = pr?.status === "failed";
                                const e = !f && data.picks.filter((pp) => pp.aiProvider === p).length === 0;
                                // default collapsed for failed/empty; we want all collapsed
                                // → add a toggle ONLY for those whose default is NOT collapsed
                                return !(f || e);
                              })));
                            }}
                            className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                          >
                            {lang === "ar" ? "طي الكل" : "Collapse all"}
                          </button>
                          <span className="text-gray-300 dark:text-gray-700">·</span>
                          <button
                            onClick={() => {
                              const all = (data.providers ?? []).map((p) => p.provider);
                              // Inverse — toggle the failed/empty rows (whose default is collapsed)
                              setCollapsedProviders(new Set(all.filter((p) => {
                                const pr = (data.providers ?? []).find((x) => x.provider === p);
                                const f = pr?.status === "failed";
                                const e = !f && data.picks.filter((pp) => pp.aiProvider === p).length === 0;
                                return f || e;
                              })));
                            }}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            {lang === "ar" ? "فتح الكل" : "Expand all"}
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })()}
                </section>
              );
            })()}

            {/* ─── Top 3 Spotlight (redesigned) ──────────────────
                Showcased AFTER the picks list as a "what to enter
                first" reminder, with the actual top-3 picks in a
                podium layout instead of a flat blurb. */}
            {data.picks.length >= 3 && (() => {
              const top3 = data.picks.slice(0, 3);
              const place = ["1", "2", "3"];
              const podiumStyle = [
                {
                  ring: "ring-amber-300 dark:ring-amber-500/50",
                  bg: "from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30",
                  border: "border-amber-300/70 dark:border-amber-700/40",
                  badge: "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
                  Icon: Trophy,
                  label: lang === "ar" ? "الأول" : "1st",
                },
                {
                  ring: "ring-gray-300 dark:ring-gray-500/40",
                  bg: "from-gray-50 to-slate-50 dark:from-gray-900/60 dark:to-slate-900/50",
                  border: "border-gray-300/70 dark:border-gray-700/50",
                  badge: "bg-gradient-to-br from-gray-300 to-gray-500 text-white",
                  Icon: Medal,
                  label: lang === "ar" ? "الثاني" : "2nd",
                },
                {
                  ring: "ring-orange-300 dark:ring-orange-500/40",
                  bg: "from-orange-50 to-rose-50 dark:from-orange-950/40 dark:to-rose-950/30",
                  border: "border-orange-300/70 dark:border-orange-700/40",
                  badge: "bg-gradient-to-br from-orange-400 to-amber-600 text-white",
                  Icon: Award,
                  label: lang === "ar" ? "الثالث" : "3rd",
                },
              ];

              return (
                <section className="relative overflow-hidden rounded-3xl border border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-rose-50/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/20 shadow-sm">
                  {/* Decorative orbs */}
                  <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber-300/20 dark:bg-amber-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-rose-300/20 dark:bg-rose-500/10 blur-3xl" />

                  <div className="relative p-4 sm:p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 shrink-0">
                        <Zap size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h2 className="text-amber-700 dark:text-amber-300 font-extrabold text-base sm:text-lg tracking-tight">
                            {t("recommendations.top3") ?? "Top 3 for Immediate Entry"}
                          </h2>
                          <span className="text-[10px] sm:text-xs text-amber-600/80 dark:text-amber-400/70 font-bold uppercase tracking-wider">
                            {lang === "ar" ? "أعلى ثقة" : "Highest conviction"}
                          </span>
                        </div>
                        {data.top3Summary && (
                          <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed mt-1">
                            {data.top3Summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Podium row — 3 mini-cards. On mobile, stack 1 column.
                        We keep the order 1-2-3 so the eye lands on #1 first. */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                      {top3.map((pick, idx) => {
                        const style = podiumStyle[idx];
                        const PlaceIcon = style.Icon;
                        const gainT1 = pick.entry > 0
                          ? ((pick.targets.t1 - pick.entry) / pick.entry) * 100
                          : 0;
                        return (
                          <Link
                            key={pick.symbol + (pick.aiProvider ?? "")}
                            href={`/stocks/${pick.symbol}`}
                            className={`relative rounded-2xl border-2 ${style.border} bg-gradient-to-br ${style.bg} p-3 sm:p-4 group hover:-translate-y-0.5 hover:shadow-md transition-all`}
                          >
                            {/* Place medallion */}
                            <div className="absolute -top-2 -left-2 sm:-top-2.5 sm:-left-2.5 flex items-center gap-1.5">
                              <span className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full ${style.badge} ring-4 ${style.ring} ring-white dark:ring-gray-900 shadow-md font-extrabold text-xs sm:text-sm`}>
                                {place[idx]}
                              </span>
                            </div>

                            <div className="pt-1 space-y-2.5">
                              {/* Symbol + AI badge */}
                              <div className="flex items-center justify-between gap-2 ms-7 sm:ms-8">
                                <div className="min-w-0">
                                  <p className="font-extrabold text-gray-900 dark:text-white text-base sm:text-lg font-mono leading-none">
                                    {pick.symbol}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                                    {pick.company}
                                  </p>
                                </div>
                                <PlaceIcon size={16} className="text-amber-500/80 dark:text-amber-400/70 shrink-0" />
                              </div>

                              {/* Price + gain */}
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums leading-none">
                                  {pick.currentPrice.toFixed(2)}
                                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase ml-1">
                                    {t("recommendations.currency")}
                                  </span>
                                </p>
                                <span className="inline-flex items-center gap-0.5 text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  <TrendingUp size={11} />+{gainT1.toFixed(1)}%
                                </span>
                              </div>

                              {/* Entry → Target row */}
                              <div className="rounded-lg bg-white/60 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-800/60 px-2 py-1.5 flex items-center justify-between text-[10px] sm:text-xs">
                                <div className="text-center">
                                  <p className="text-gray-500 dark:text-gray-500 uppercase tracking-wider font-bold leading-none mb-0.5">
                                    {t("recommendations.entry")}
                                  </p>
                                  <p className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                    {pick.entry.toFixed(2)}
                                  </p>
                                </div>
                                <ArrowRight size={12} className="text-gray-400 dark:text-gray-600 mx-1" />
                                <div className="text-center">
                                  <p className="text-gray-500 dark:text-gray-500 uppercase tracking-wider font-bold leading-none mb-0.5">
                                    {t("recommendations.target")}
                                  </p>
                                  <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {pick.targets.t1.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {/* Footer — confidence + AI provider */}
                              <div className="flex items-center justify-between gap-1.5 pt-1">
                                <div className="flex items-center gap-1 text-[10px]">
                                  <span className="text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider">
                                    {lang === "ar" ? "ثقة" : "Conf"}
                                  </span>
                                  <span className={`font-extrabold tabular-nums ${
                                    pick.confidence >= 8 ? "text-emerald-600 dark:text-emerald-400"
                                      : pick.confidence >= 5 ? "text-amber-600 dark:text-amber-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}>
                                    {pick.confidence}/10
                                  </span>
                                </div>
                                {pick.aiProvider && (
                                  <AIModelBadge provider={pick.aiProvider} size="sm" />
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* ─── Allocation Advice ──────────────────────────── */}
            {data.allocationAdvice && (
              <section className="rounded-2xl border border-blue-200/60 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-gray-900 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                    <PieChart size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-gray-900 dark:text-white font-bold text-sm mb-1">
                      {t("recommendations.allocation") ?? "Portfolio Allocation Advice"}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{data.allocationAdvice}</p>
                  </div>
                </div>
              </section>
            )}

            {/* ─── Disclaimer ─────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-900/40 px-4 py-3 flex items-start gap-2.5">
              <Info size={14} className="text-gray-400 dark:text-gray-600 shrink-0 mt-0.5" />
              <p className="text-gray-500 dark:text-gray-500 text-[11px] leading-relaxed">
                {t("recommendations.disclaimer") ?? "This is an educational technical analysis. The final decision rests with the investor; there are no guarantees in the financial markets."}
              </p>
            </section>

            {/* AI provider footnote — show every provider that contributed today,
                with failed providers faded so the user sees the degradation. */}
            {data.providers && data.providers.length > 0 ? (
              <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] text-gray-400 dark:text-gray-600">
                <Activity size={10} className="opacity-70" />
                <span>{lang === "ar" ? "مدعوم بـ" : "Powered by"}</span>
                {data.providers.map((pr) => (
                  <span
                    key={pr.provider}
                    className={pr.status === "failed" ? "opacity-40" : ""}
                    title={pr.status === "failed" ? pr.error : pr.model}
                  >
                    <AIModelBadge provider={pr.provider} model={pr.status === "ok" ? pr.model : undefined} size="sm" />
                  </span>
                ))}
              </div>
            ) : (data.aiProvider || data.aiModel) ? (
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 flex items-center justify-center gap-1.5">
                <Activity size={10} />
                {lang === "ar" ? "مدعوم بـ" : "Powered by"} {data.aiProvider ?? ""} {data.aiModel ? `· ${data.aiModel}` : ""}
              </p>
            ) : null}
          </>
        )}
      </main>
    </AppShell>
  );
}
