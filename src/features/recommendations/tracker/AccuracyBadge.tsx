"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { TrackerStatus } from "./useTrackerSnapshots";

const STATUS_STYLES: Record<TrackerStatus, { bg: string; text: string; key: string }> = {
  PENDING: { bg: "bg-gray-800",       text: "text-gray-400",    key: "tracker.status.pending" },
  ENTERED: { bg: "bg-blue-900/40",    text: "text-blue-300",    key: "tracker.status.entered" },
  T1_HIT:  { bg: "bg-emerald-900/40", text: "text-emerald-300", key: "tracker.status.t1Hit" },
  T2_HIT:  { bg: "bg-emerald-700/50", text: "text-emerald-200", key: "tracker.status.t2Hit" },
  STOPPED: { bg: "bg-red-900/40",     text: "text-red-300",     key: "tracker.status.stopped" },
  EXPIRED: { bg: "bg-amber-900/40",   text: "text-amber-300",   key: "tracker.status.expired" },
};

export function AccuracyBadge({
  status,
  size = "md",
}: {
  status: TrackerStatus;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";
  return (
    <span className={`inline-flex items-center rounded-md font-semibold ${style.bg} ${style.text} ${padding}`}>
      {t(style.key)}
    </span>
  );
}
