"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { WeeklyPick } from "./useWeeklyPicks";

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
      <div className="td-hover-card bg-gray-900 rounded-2xl p-4 h-full flex flex-col gap-3 border border-gray-800/50 hover:border-gray-700 transition-colors">
        {/* Row 1: Rank + Symbol + Trend */}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold flex-shrink-0">
            {pick.rank}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base">{pick.symbol}</span>
              <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                {trendIcon}
              </span>
            </div>
            <p className="text-gray-500 text-xs truncate">{pick.company}</p>
          </div>
          <ConfidenceRing value={pick.confidence} />
        </div>

        {/* Row 2: Price */}
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold text-white tracking-tight">{pick.currentPrice.toFixed(2)}</p>
          <span className="text-xs text-gray-500">{t("recommendations.currency")}</span>
        </div>

        {/* Row 3: Entry → Target (visual) */}
        <div className="bg-gray-800/60 rounded-xl p-2.5 flex items-center justify-between">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("recommendations.entry")}</p>
            <p className="text-sm font-semibold text-white">{pick.entry.toFixed(2)}</p>
          </div>
          <div className="flex-1 mx-2 flex items-center">
            <div className="h-px flex-1 bg-gray-600" />
            <span className="px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 text-[10px] font-bold rounded">
              +{gain}%
            </span>
            <div className="h-px flex-1 bg-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t("recommendations.target")}</p>
            <p className="text-sm font-semibold text-emerald-400">{pick.targets.t1.toFixed(2)}</p>
          </div>
        </div>

        {/* Row 4: Stop loss + R:R + Timeframe */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-red-400/80">
            {t("recommendations.stopLoss")} {pick.stopLoss.toFixed(2)}
          </span>
          <span className="text-gray-500">{pick.riskReward}</span>
          <span className="text-gray-500">
            {pick.timeframe.includes("Short") ? t("recommendations.weeks") : t("recommendations.months")}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Expanded card for /recommendations page ────────────────────────────── */
function ExpandedCard({ pick }: { pick: WeeklyPick }) {
  const { t } = useLanguage();
  const trendIcon =
    pick.trend === "Up" ? <TrendingUp size={13} /> :
    pick.trend === "Down" ? <TrendingDown size={13} /> :
    <Minus size={13} />;
  const trendColor =
    pick.trend === "Up" ? "text-emerald-400" : pick.trend === "Down" ? "text-red-400" : "text-gray-400";

  const rsiColor =
    pick.indicators.rsiStatus === "Oversold" ? "text-emerald-400" :
    pick.indicators.rsiStatus === "Overbought" ? "text-red-400" : "text-gray-300";

  const macdColor =
    pick.indicators.macd.includes("Bullish") ? "text-emerald-400" :
    pick.indicators.macd.includes("Bearish") ? "text-red-400" : "text-gray-300";

  const statusLabel =
    pick.status.includes("Rebounded") ? t("recommendations.rebounded") :
    pick.status.includes("At") ? t("recommendations.atSupport") :
    t("recommendations.nearSupport");

  return (
    <Link href={`/stocks/${pick.symbol}`}>
      <div className="td-hover-card bg-gray-900 rounded-2xl border border-gray-800/50 hover:border-gray-700 transition-colors overflow-hidden h-full flex flex-col">
        {/* Header bar */}
        <div className="bg-gray-800/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-bold flex-shrink-0">
              {pick.rank}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">{pick.symbol}</span>
                <span className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                  {trendIcon} {pick.trend}
                </span>
              </div>
              <p className="text-gray-500 text-xs">{pick.company} · {pick.sector}</p>
            </div>
          </div>
          <ConfidenceRing value={pick.confidence} />
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          {/* Price + Status */}
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold text-white tracking-tight">
              {pick.currentPrice.toFixed(2)} <span className="text-xs font-normal text-gray-500">{t("recommendations.currency")}</span>
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-md ${
              pick.status.includes("Rebounded") ? "bg-emerald-900/40 text-emerald-400" : "bg-amber-900/40 text-amber-400"
            }`}>
              {statusLabel}
            </span>
          </div>

          {/* Support / Resistance levels */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t("recommendations.support")}</p>
              <div className="flex gap-3 text-sm">
                <span className="text-gray-300">{pick.support.s1}</span>
                <span className="text-gray-500">{pick.support.s2}</span>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{t("recommendations.resistance")}</p>
              <div className="flex gap-3 text-sm">
                <span className="text-gray-300">{pick.resistance.r1}</span>
                <span className="text-gray-500">{pick.resistance.r2}</span>
              </div>
            </div>
          </div>

          {/* Trade plan */}
          <div className="bg-gray-800/40 rounded-xl p-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">{t("recommendations.entry")}</p>
                <p className="text-sm font-semibold text-white">{pick.entry.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">{t("recommendations.t1")}</p>
                <p className="text-sm font-semibold text-emerald-400">{pick.targets.t1.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">{t("recommendations.t2")}</p>
                <p className="text-sm font-semibold text-emerald-400">{pick.targets.t2.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">{t("recommendations.stopLoss")}</p>
                <p className="text-sm font-semibold text-red-400">{pick.stopLoss.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">RSI</span>
              <span className={rsiColor}>{pick.indicators.rsi.toFixed(0)} {pick.indicators.rsiStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">MACD</span>
              <span className={`${macdColor} truncate ml-2`}>{pick.indicators.macd}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("recommendations.volume")}</span>
              <span className={pick.indicators.volume === "Accumulation" ? "text-emerald-400" : "text-gray-300"}>{pick.indicators.volume}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">MA 20/50</span>
              <span className="text-gray-300">{pick.indicators.ma20.toFixed(0)}/{pick.indicators.ma50.toFixed(0)}</span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-800/60">
            <span className="text-gray-400">{pick.riskReward}</span>
            {pick.pattern && <span className="text-blue-400">{pick.pattern}</span>}
            <span className="text-gray-500">{pick.timeframe.includes("Short") ? t("recommendations.weeks") : t("recommendations.months")}</span>
          </div>

          {/* Catalysts & Risks */}
          {(pick.catalysts || pick.risks) && (
            <div className="space-y-1.5 pt-1 border-t border-gray-800/60 text-xs">
              {pick.catalysts && (
                <p><span className="text-emerald-500/70">{t("recommendations.catalysts")}:</span>{" "}
                <span className="text-gray-400">{pick.catalysts}</span></p>
              )}
              {pick.risks && (
                <p><span className="text-red-500/70">{t("recommendations.risks")}:</span>{" "}
                <span className="text-gray-400">{pick.risks}</span></p>
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
