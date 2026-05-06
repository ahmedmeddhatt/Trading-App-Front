"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { AccuracyBadge } from "./AccuracyBadge";
import type { TrackedPick, TrackerStatus } from "./useTrackerSnapshots";

function HitPill({
  label,
  hit,
  hitAt,
  color,
}: {
  label: string;
  hit: boolean;
  hitAt: string | null;
  color: "blue" | "emerald" | "red";
}) {
  const { t, lang } = useLanguage();
  const colorMap = {
    blue: hit ? "bg-blue-700/60 text-blue-200" : "bg-gray-800 text-gray-600",
    emerald: hit ? "bg-emerald-700/60 text-emerald-200" : "bg-gray-800 text-gray-600",
    red: hit ? "bg-red-700/60 text-red-200" : "bg-gray-800 text-gray-600",
  };
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const tooltip = hit && hitAt
    ? `${label} ${t("tracker.tooltip.hitOn")} ${new Date(hitAt).toLocaleDateString(locale)}`
    : `${label} ${t("tracker.tooltip.notYet")}`;
  return (
    <span
      title={tooltip}
      className={`flex-1 text-center text-[10px] font-semibold rounded px-1 py-0.5 ${colorMap[color]}`}
    >
      {label}
    </span>
  );
}

export function TrackedPickCard({
  pick,
  onClick,
}: {
  pick: TrackedPick;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const trendIcon =
    pick.trend === "Up" ? <TrendingUp size={11} /> :
    pick.trend === "Down" ? <TrendingDown size={11} /> :
    <Minus size={11} />;
  const trendColor =
    pick.trend === "Up" ? "text-emerald-400" :
    pick.trend === "Down" ? "text-red-400" : "text-gray-400";

  const perf = pick.performance;
  const status: TrackerStatus = (perf?.status as TrackerStatus) ?? "PENDING";
  const ret = perf?.returnPct;
  const retColor = ret === null || ret === undefined
    ? "text-gray-500"
    : ret >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <button
      onClick={onClick}
      className="text-left bg-gray-900 rounded-2xl p-4 h-full flex flex-col gap-3 border border-gray-800/50 hover:border-gray-700 hover:bg-gray-900/80 transition-colors"
    >
      {/* Row 1: Rank + Symbol + Trend + Status */}
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
        <AccuracyBadge status={status} size="sm" />
      </div>

      {/* Row 2: Entry / latest / return */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-2xl font-bold text-white tracking-tight">
            {(perf?.latestPrice ?? pick.currentPrice).toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-500">
            {t("tracker.entryShort")} {pick.entry.toFixed(2)}
          </p>
        </div>
        <span className={`text-sm font-bold ${retColor}`}>
          {ret === null || ret === undefined
            ? "—"
            : `${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`}
        </span>
      </div>

      {/* Row 3: Hit pills */}
      <div className="flex items-center gap-1">
        <HitPill label={t("tracker.pill.entry")} hit={!!perf?.entryHit} hitAt={perf?.entryHitAt ?? null} color="blue" />
        <HitPill label={t("tracker.pill.t1")}    hit={!!perf?.t1Hit}    hitAt={perf?.t1HitAt ?? null}    color="emerald" />
        <HitPill label={t("tracker.pill.t2")}    hit={!!perf?.t2Hit}    hitAt={perf?.t2HitAt ?? null}    color="emerald" />
        <HitPill label={t("tracker.pill.stop")}  hit={!!perf?.stopHit}  hitAt={perf?.stopHitAt ?? null}  color="red" />
      </div>

      {/* Row 4: Peak / Trough / Days */}
      <div className="grid grid-cols-3 gap-2 text-[10px] pt-1 border-t border-gray-800/60">
        <div>
          <p className="text-gray-500 uppercase tracking-wider">{t("tracker.peak")}</p>
          <p className="text-emerald-400 font-semibold">
            {perf?.peakPrice !== null && perf?.peakPrice !== undefined
              ? perf.peakPrice.toFixed(2) : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase tracking-wider">{t("tracker.trough")}</p>
          <p className="text-red-400 font-semibold">
            {perf?.troughPrice !== null && perf?.troughPrice !== undefined
              ? perf.troughPrice.toFixed(2) : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 uppercase tracking-wider">{t("tracker.daysToT1")}</p>
          <p className="text-gray-300 font-semibold">
            {perf?.daysToT1 !== null && perf?.daysToT1 !== undefined ? perf.daysToT1 : "—"}
          </p>
        </div>
      </div>

      {/* Row 5: Targets / stop */}
      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800/60">
        <span>{t("tracker.modal.t1")} {pick.targets.t1.toFixed(2)}</span>
        <span>{t("tracker.modal.t2")} {pick.targets.t2.toFixed(2)}</span>
        <span className="text-red-400/70">{t("tracker.sl")} {pick.stopLoss.toFixed(2)}</span>
        <span>{pick.confidence}/10</span>
      </div>
    </button>
  );
}
