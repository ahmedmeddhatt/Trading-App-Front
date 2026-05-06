"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { WeeklyPick } from "./useWeeklyPicks";
import { AIModelBadge } from "./tracker/AIModelBadge";

/* ── Confidence ring (circular) ─────────────────────────────────────────── */
function ConfidenceRing({ value }: { value: number }) {
  const clamped = Math.max(1, Math.min(10, Math.round(value)));
  const pct = clamped * 10;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color =
    clamped >= 8 ? "stroke-emerald-400" : clamped >= 5 ? "stroke-amber-400" : "stroke-red-400";
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#374151" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          className={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {clamped}
      </span>
    </div>
  );
}

/* ── Compact card for dashboard (shows key info only) ───────────────────── */
function CompactCard({ pick }: { pick: WeeklyPick }) {
  const { t } = useLanguage();
  const trendIcon =
    pick.trend === "Up" ? <TrendingUp size={11} /> :
    pick.trend === "Down" ? <TrendingDown size={11} /> :
    <Minus size={11} />;
  const trendColor =
    pick.trend === "Up" ? "text-emerald-400" : pick.trend === "Down" ? "text-red-400" : "text-gray-400";

  const gain = pick.entry > 0 ? (((pick.targets.t1 - pick.entry) / pick.entry) * 100).toFixed(1) : "0";

  return (
    <Link href={`/stocks/${pick.symbol}`}>
      <div className="td-hover-card bg-gray-900 rounded-2xl p-3 sm:p-4 h-full flex flex-col gap-2.5 sm:gap-3 border border-gray-800/50 hover:border-gray-700 transition-colors">
        {/* Row 1: Rank + Symbol + Trend */}
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white text-[11px] sm:text-xs font-bold flex-shrink-0">
            {pick.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-sm sm:text-base">{pick.symbol}</span>
              <span className={`flex items-center gap-0.5 ${trendColor}`}>
                {trendIcon}
              </span>
            </div>
            <p className="text-gray-500 text-[10px] sm:text-xs truncate leading-tight">{pick.company}</p>
          </div>
          <ConfidenceRing value={pick.confidence} />
        </div>

        {/* Row 2: Price */}
        <div className="flex items-baseline justify-between">
          <p className="text-xl sm:text-2xl font-bold text-white tracking-tight tabular-nums">{pick.currentPrice.toFixed(2)}</p>
          <span className="text-[10px] sm:text-xs text-gray-500">{t("recommendations.currency")}</span>
        </div>

        {/* Row 3: Entry → Target (compact on mobile, with line decoration on sm+) */}
        <div className="bg-gray-800/60 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="text-center min-w-0 flex-shrink-0">
            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-0.5">{t("recommendations.entry")}</p>
            <p className="text-xs sm:text-sm font-semibold text-white tabular-nums">{pick.entry.toFixed(2)}</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-w-0">
            <div className="hidden sm:block h-px flex-1 bg-gray-600" />
            <span className="px-1 sm:px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 text-[9px] sm:text-[10px] font-bold rounded whitespace-nowrap">
              +{gain}%
            </span>
            <div className="hidden sm:block h-px flex-1 bg-gray-600" />
          </div>
          <div className="text-center min-w-0 flex-shrink-0">
            <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-0.5">{t("recommendations.target")}</p>
            <p className="text-xs sm:text-sm font-semibold text-emerald-400 tabular-nums">{pick.targets.t1.toFixed(2)}</p>
          </div>
        </div>

        {/* Row 4: Stop loss + R:R + Timeframe */}
        <div className="flex items-center justify-between text-[10px] sm:text-xs gap-1.5">
          <span className="text-red-400/80 truncate">
            <span className="hidden sm:inline">{t("recommendations.stopLoss")} </span>
            <span className="sm:hidden">SL </span>
            <span className="tabular-nums">{pick.stopLoss.toFixed(2)}</span>
          </span>
          <span className="text-gray-500 tabular-nums shrink-0">{pick.riskReward}</span>
          <span className="text-gray-500 truncate">
            {pick.timeframe.includes("Short") ? t("recommendations.weeks") : t("recommendations.months")}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Expanded card for /recommendations page ────────────────────────────── */
function ExpandedCard({ pick }: { pick: WeeklyPick }) {
  const { t, lang } = useLanguage();
  const trendIcon =
    pick.trend === "Up" ? <TrendingUp size={13} /> :
    pick.trend === "Down" ? <TrendingDown size={13} /> :
    <Minus size={13} />;
  const trendColor =
    pick.trend === "Up"
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/40"
      : pick.trend === "Down"
        ? "text-red-600 dark:text-red-400 bg-red-100/70 dark:bg-red-900/30 border-red-200/60 dark:border-red-800/40"
        : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700";

  const rsiColor =
    pick.indicators.rsiStatus === "Oversold" ? "text-emerald-600 dark:text-emerald-400" :
    pick.indicators.rsiStatus === "Overbought" ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300";

  const macdColor =
    pick.indicators.macd.includes("Bullish") ? "text-emerald-600 dark:text-emerald-400" :
    pick.indicators.macd.includes("Bearish") ? "text-red-500 dark:text-red-400" : "text-gray-700 dark:text-gray-300";

  const statusLabel =
    pick.status.includes("Rebounded") ? t("recommendations.rebounded") :
    pick.status.includes("At") ? t("recommendations.atSupport") :
    t("recommendations.nearSupport");

  // Compute trade-plan metrics for the visual bar
  const upsideT1 = pick.entry > 0 ? ((pick.targets.t1 - pick.entry) / pick.entry) * 100 : 0;
  const upsideT2 = pick.entry > 0 ? ((pick.targets.t2 - pick.entry) / pick.entry) * 100 : 0;
  const downside = pick.entry > 0 ? ((pick.stopLoss - pick.entry) / pick.entry) * 100 : 0;

  // Position the entry on a horizontal track running from stop-loss (left) to target-2 (right)
  const trackMin = Math.min(pick.stopLoss, pick.entry);
  const trackMax = Math.max(pick.targets.t2, pick.entry);
  const trackRange = trackMax - trackMin || 1;
  const pos = (v: number) => ((v - trackMin) / trackRange) * 100;
  const entryPos = pos(pick.entry);
  const t1Pos = pos(pick.targets.t1);
  const stopPos = pos(pick.stopLoss);
  const currentPos = pos(pick.currentPrice);

  return (
    <Link href={`/stocks/${pick.symbol}`} className="block group">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 overflow-hidden h-full flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-900/40 transition-all duration-200">
        {/* Top accent rail — colored by trend */}
        <div className={`h-1 w-full ${
          pick.trend === "Up" ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
          : pick.trend === "Down" ? "bg-gradient-to-r from-red-400 to-red-500"
          : "bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"
        }`} />

        {/* Header */}
        <div className="bg-gray-50/60 dark:bg-gray-800/40 px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-extrabold flex-shrink-0 shadow-md shadow-blue-500/30">
              {pick.rank}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-gray-900 dark:text-white text-base font-mono">{pick.symbol}</span>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${trendColor}`}>
                  {trendIcon} {pick.trend}
                </span>
                {/* AI source badge — daily mode stamps each pick with its producing model. */}
                {pick.aiProvider && (
                  <AIModelBadge provider={pick.aiProvider} size="sm" />
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-500 text-xs truncate">{pick.company} · {pick.sector}</p>
            </div>
          </div>
          <ConfidenceRing value={pick.confidence} />
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3.5 flex-1">
          {/* Price + Status */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-none">
              {pick.currentPrice.toFixed(2)}
              <span className="ml-1 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t("recommendations.currency")}</span>
            </p>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
              pick.status.includes("Rebounded")
                ? "bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40"
                : "bg-amber-100/70 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40"
            }`}>
              {statusLabel}
            </span>
          </div>

          {/* ── Trade plan ── two prominent cards: target (gain) + stop loss (risk) ── */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Target T1 — primary upside */}
            <div className="relative overflow-hidden rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <TrendingUp size={11} /> {t("recommendations.target")} 1
                </span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">
                {pick.targets.t1.toFixed(2)}
              </p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                +{upsideT1.toFixed(1)}% <span className="text-[10px] font-medium opacity-70">if hit</span>
              </p>
            </div>

            {/* Stop Loss — primary downside */}
            <div className="relative overflow-hidden rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1">
                  <TrendingDown size={11} /> {t("recommendations.stopLoss")}
                </span>
              </div>
              <p className="text-2xl font-extrabold text-red-700 dark:text-red-400 leading-none tabular-nums">
                {pick.stopLoss.toFixed(2)}
              </p>
              <p className="text-sm font-bold text-red-600 dark:text-red-500 mt-1">
                {downside.toFixed(1)}% <span className="text-[10px] font-medium opacity-70">max risk</span>
              </p>
            </div>
          </div>

          {/* ── Trade plan visual track ── */}
          <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500">{t("recommendations.entry")}</span>
              <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">{pick.entry.toFixed(2)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500">T2</span>
              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{pick.targets.t2.toFixed(2)} <span className="text-[10px] opacity-70">+{upsideT2.toFixed(1)}%</span></span>
            </div>
            {/* Track */}
            <div className="relative h-3 rounded-full bg-gradient-to-r from-red-300 via-gray-200 to-emerald-300 dark:from-red-950/60 dark:via-gray-700 dark:to-emerald-950/60">
              {/* Stop loss marker */}
              <div className="absolute -top-1 w-1.5 h-5 bg-red-500 rounded-full shadow-sm" style={{ left: `${stopPos}%`, transform: "translateX(-50%)" }} title={`Stop Loss: ${pick.stopLoss.toFixed(2)}`} />
              {/* Entry marker */}
              <div className="absolute -top-1 w-1.5 h-5 bg-blue-500 rounded-full ring-2 ring-blue-500/30 shadow-sm" style={{ left: `${entryPos}%`, transform: "translateX(-50%)" }} title={`Entry: ${pick.entry.toFixed(2)}`} />
              {/* T1 marker */}
              <div className="absolute -top-1 w-1.5 h-5 bg-emerald-500 rounded-full shadow-sm" style={{ left: `${t1Pos}%`, transform: "translateX(-50%)" }} title={`Target 1: ${pick.targets.t1.toFixed(2)}`} />
              {/* Current price marker — bigger and clearer */}
              {Math.abs(pick.currentPrice - pick.entry) > 0.01 && (
                <div
                  className="absolute -top-2 w-3 h-3 rounded-full bg-white border-2 border-gray-900 dark:border-white shadow-lg z-10"
                  style={{ left: `${currentPos}%`, transform: "translateX(-50%)" }}
                  title={`Current price: ${pick.currentPrice.toFixed(2)}`}
                />
              )}
            </div>
            {/* Marker legend */}
            <div className="flex items-center justify-center gap-3 text-[9px] text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> SL</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> {t("recommendations.entry")}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> T1</span>
              {Math.abs(pick.currentPrice - pick.entry) > 0.01 && (
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-gray-900 dark:border-white" /> {lang === "ar" ? "السعر الآن" : "now"}</span>
              )}
            </div>
          </div>

          {/* Support / Resistance — bigger numbers */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40 p-2.5">
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 uppercase tracking-wider font-bold mb-1">
                {t("recommendations.support")}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{pick.support.s1}</span>
                <span className="text-xs text-emerald-600/70 dark:text-emerald-500/70 tabular-nums">{pick.support.s2}</span>
              </div>
            </div>
            <div className="rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100/80 dark:border-red-900/40 p-2.5">
              <p className="text-[10px] text-red-700/80 dark:text-red-400/80 uppercase tracking-wider font-bold mb-1">
                {t("recommendations.resistance")}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-red-700 dark:text-red-400 tabular-nums leading-none">{pick.resistance.r1}</span>
                <span className="text-xs text-red-600/70 dark:text-red-500/70 tabular-nums">{pick.resistance.r2}</span>
              </div>
            </div>
          </div>

          {/* Indicator chips — 2x2 grid with colored pills, larger values */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 px-2.5 py-2 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">RSI</span>
              <span className={`font-extrabold text-sm tabular-nums ${rsiColor}`}>
                {pick.indicators.rsi.toFixed(0)}
                <span className="opacity-70 text-[9px] ml-1 font-medium uppercase">{pick.indicators.rsiStatus}</span>
              </span>
            </div>
            <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 px-2.5 py-2 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">MACD</span>
              <span className={`font-bold text-xs truncate ml-2 ${macdColor}`}>{pick.indicators.macd}</span>
            </div>
            <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 px-2.5 py-2 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">{t("recommendations.volume")}</span>
              <span className={`font-bold text-xs ${pick.indicators.volume === "Accumulation" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}>
                {pick.indicators.volume}
              </span>
            </div>
            <div className="rounded-md bg-gray-50 dark:bg-gray-800/50 px-2.5 py-2 flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-500 font-semibold uppercase text-[10px] tracking-wider">MA 20/50</span>
              <span className="font-bold text-sm text-gray-800 dark:text-gray-200 tabular-nums">
                {pick.indicators.ma20.toFixed(0)}<span className="opacity-50 mx-0.5">/</span>{pick.indicators.ma50.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-gray-100 dark:border-gray-800/60 gap-2 flex-wrap">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              R:R <span className="text-blue-600 dark:text-blue-400">{pick.riskReward}</span>
            </span>
            {pick.pattern && (
              <span className="px-1.5 py-0.5 rounded-md bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold">
                {pick.pattern}
              </span>
            )}
            <span className="text-gray-500 dark:text-gray-500 font-medium">
              {pick.timeframe.includes("Short") ? t("recommendations.weeks") : t("recommendations.months")}
            </span>
          </div>

          {/* Catalysts & Risks */}
          {(pick.catalysts || pick.risks) && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800/60 text-[11px]">
              {pick.catalysts && (
                <p className="leading-relaxed">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-bold mr-1">
                    <TrendingUp size={10} />{t("recommendations.catalysts")}:
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{pick.catalysts}</span>
                </p>
              )}
              {pick.risks && (
                <p className="leading-relaxed">
                  <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-500 font-bold mr-1">
                    <TrendingDown size={10} />{t("recommendations.risks")}:
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{pick.risks}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── Public export ──────────────────────────────────────────────────────── */
export function WeeklyPickCard({ pick, expanded = false }: { pick: WeeklyPick; expanded?: boolean }) {
  return expanded ? <ExpandedCard pick={pick} /> : <CompactCard pick={pick} />;
}
