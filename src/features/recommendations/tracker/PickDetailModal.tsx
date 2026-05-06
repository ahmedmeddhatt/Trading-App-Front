"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { AccuracyBadge } from "./AccuracyBadge";
import { AIModelBadge } from "./AIModelBadge";
import { usePickDetail, type TrackerStatus } from "./useTrackerSnapshots";

export function PickDetailModal({
  pickId,
  onClose,
}: {
  pickId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = usePickDetail(pickId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div className="p-8 text-center text-gray-400">{t("tracker.modal.loading")}</div>
        )}
        {isError && (
          <div className="p-8 text-center text-red-400">{t("tracker.modal.error")}</div>
        )}
        {data && <PickDetailBody data={data} onClose={onClose} />}
      </div>
    </div>
  );
}

function PickDetailBody({
  data,
  onClose,
}: {
  data: NonNullable<ReturnType<typeof usePickDetail>["data"]>;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const fmt = (d: string | null): string =>
    d ? new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" }) : "—";

  const { pick, snapshot, priceHistory } = data;
  const perf = pick.performance;
  const status: TrackerStatus = (perf?.status as TrackerStatus) ?? "PENDING";

  const chartData = priceHistory.map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString(locale, { month: "short", day: "numeric" }),
    price: p.price,
  }));

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-bold">
              {pick.rank}
            </span>
            <h2 className="text-xl font-bold text-white">{pick.symbol}</h2>
            <AccuracyBadge status={status} />
            <AIModelBadge provider={snapshot.aiProvider} model={snapshot.aiModel} size="sm" />
          </div>
          <p className="text-gray-400 text-sm mt-1">{pick.company} · {pick.sector}</p>
          <p className="text-gray-500 text-xs">
            {t("tracker.modal.recommended")} {new Date(snapshot.generatedAt).toLocaleDateString(locale)} · {t("tracker.expires")}{" "}
            {new Date(snapshot.expiresAt).toLocaleDateString(locale)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white"
          aria-label={t("tracker.modal.close")}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Trade plan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label={t("tracker.modal.entry")} value={pick.entry.toFixed(2)} color="text-white" />
          <Stat label={t("tracker.modal.t1")} value={pick.targets.t1.toFixed(2)} color="text-emerald-400" />
          <Stat label={t("tracker.modal.t2")} value={pick.targets.t2.toFixed(2)} color="text-emerald-400" />
          <Stat label={t("tracker.modal.stop")} value={pick.stopLoss.toFixed(2)} color="text-red-400" />
        </div>

        {/* Performance */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            label={t("tracker.modal.latest")}
            value={perf?.latestPrice !== null && perf?.latestPrice !== undefined
              ? perf.latestPrice.toFixed(2) : "—"}
            color="text-white"
          />
          <Stat
            label={t("tracker.modal.return")}
            value={perf?.returnPct !== null && perf?.returnPct !== undefined
              ? `${perf.returnPct >= 0 ? "+" : ""}${perf.returnPct.toFixed(1)}%` : "—"}
            color={(perf?.returnPct ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}
          />
          <Stat
            label={t("tracker.modal.peak")}
            value={perf?.peakPrice !== null && perf?.peakPrice !== undefined
              ? perf.peakPrice.toFixed(2) : "—"}
            color="text-emerald-400"
          />
          <Stat
            label={t("tracker.modal.trough")}
            value={perf?.troughPrice !== null && perf?.troughPrice !== undefined
              ? perf.troughPrice.toFixed(2) : "—"}
            color="text-red-400"
          />
        </div>

        {/* Hit timeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("tracker.modal.hitTimeline")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <HitInfo label={t("tracker.modal.entry")} hit={!!perf?.entryHit} when={perf?.entryHitAt ?? null} color="text-blue-300" fmt={fmt} />
            <HitInfo label={t("tracker.modal.t1")} hit={!!perf?.t1Hit} when={perf?.t1HitAt ?? null}
              days={perf?.daysToT1 ?? null} color="text-emerald-300" fmt={fmt} />
            <HitInfo label={t("tracker.modal.t2")} hit={!!perf?.t2Hit} when={perf?.t2HitAt ?? null}
              days={perf?.daysToT2 ?? null} color="text-emerald-300" fmt={fmt} />
            <HitInfo label={t("tracker.modal.stop")} hit={!!perf?.stopHit} when={perf?.stopHitAt ?? null}
              days={perf?.daysToStop ?? null} color="text-red-300" fmt={fmt} />
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{t("tracker.modal.priceSince")}</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="2 2" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#0b0f19", border: "1px solid #1f2937", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                  />
                  <ReferenceLine y={pick.entry} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: t("tracker.modal.entry"), fill: "#60a5fa", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={pick.targets.t1} stroke="#10b981" strokeDasharray="3 3" label={{ value: t("tracker.modal.t1"), fill: "#34d399", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={pick.targets.t2} stroke="#10b981" strokeDasharray="3 3" label={{ value: t("tracker.modal.t2"), fill: "#34d399", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={pick.stopLoss} stroke="#ef4444" strokeDasharray="3 3" label={{ value: t("tracker.modal.stop"), fill: "#f87171", fontSize: 10, position: "right" }} />
                  <Line type="monotone" dataKey="price" stroke="#e5e7eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
            {t("tracker.modal.notEnoughData")}
          </div>
        )}

        {/* Catalysts & risks */}
        {(pick.catalysts || pick.risks) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2 text-xs">
            {pick.catalysts && (
              <p>
                <span className="text-emerald-400 font-semibold">{t("tracker.modal.catalysts")} </span>
                <span className="text-gray-300">{pick.catalysts}</span>
              </p>
            )}
            {pick.risks && (
              <p>
                <span className="text-red-400 font-semibold">{t("tracker.modal.risks")} </span>
                <span className="text-gray-300">{pick.risks}</span>
              </p>
            )}
          </div>
        )}

        {/* Eval meta */}
        {perf && (
          <p className="text-[10px] text-gray-600 text-end">
            {t("tracker.modal.evaluated")} {perf.evaluationCount} {t("tracker.modal.times")} {fmt(perf.lastEvaluatedAt)}
          </p>
        )}
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function HitInfo({
  label,
  hit,
  when,
  days,
  color,
  fmt,
}: {
  label: string;
  hit: boolean;
  when: string | null;
  days?: number | null;
  color: string;
  fmt: (d: string | null) => string;
}) {
  return (
    <div>
      <p className="text-gray-500 uppercase tracking-wider text-[10px]">{label}</p>
      {hit ? (
        <p className={`${color} font-semibold`}>
          ✓ {fmt(when)}
          {days !== undefined && days !== null && (
            <span className="text-gray-500 font-normal text-[10px]"> ({days}d)</span>
          )}
        </p>
      ) : (
        <p className="text-gray-600">—</p>
      )}
    </div>
  );
}
