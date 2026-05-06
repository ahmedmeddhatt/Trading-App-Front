"use client";

import { Trophy } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { TrackerStats } from "./useTrackerSnapshots";
import { getProviderColors } from "./AIModelBadge";

const pct = (v: number): string => `${(v * 100).toFixed(0)}%`;
const ret = (v: number | null): string =>
  v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export function AIModelLeaderboard({ stats }: { stats: TrackerStats }) {
  const { t, lang } = useLanguage();
  const entries = Object.entries(stats.byModel);
  if (entries.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-sm text-center">{t("tracker.leaderboard.empty")}</p>
      </div>
    );
  }

  // Leader = highest T2 rate, tie-broken by avg return.
  const leader = [...entries].sort((a, b) => {
    if (b[1].t2Rate !== a[1].t2Rate) return b[1].t2Rate - a[1].t2Rate;
    return (b[1].avgReturn ?? -Infinity) - (a[1].avgReturn ?? -Infinity);
  })[0]?.[0];

  const startAlign = lang === "ar" ? "text-right" : "text-left";
  const endAlign = lang === "ar" ? "text-left" : "text-right";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2">
        <Trophy size={14} className="text-amber-400" />
        <span className="text-sm font-semibold text-white">{t("tracker.leaderboard.title")}</span>
        <span className="text-xs text-gray-500 ms-auto">
          {stats.overall.sampleSize} {t("tracker.leaderboard.totalPicks")} · {stats.closedSize} {t("tracker.leaderboard.closed")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/40 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className={`${startAlign} px-4 py-2`}>{t("tracker.leaderboard.col.model")}</th>
              <th className={`${endAlign} px-3 py-2`}>{t("tracker.leaderboard.col.picks")}</th>
              <th className={`${endAlign} px-3 py-2`}>{t("tracker.leaderboard.col.t1Rate")}</th>
              <th className={`${endAlign} px-3 py-2`}>{t("tracker.leaderboard.col.t2Rate")}</th>
              <th className={`${endAlign} px-3 py-2`}>{t("tracker.leaderboard.col.stopRate")}</th>
              <th className={`${endAlign} px-3 py-2`}>{t("tracker.leaderboard.col.avgReturn")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([provider, data]) => {
              const colors = getProviderColors(provider);
              const isLeader = provider === leader;
              return (
                <tr
                  key={provider}
                  className={`border-t border-gray-800/60 ${isLeader ? "bg-emerald-950/20" : ""}`}
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${colors.avatarBg} ${colors.avatarText}`}
                      >
                        {colors.letter}
                      </span>
                      <div>
                        <div className="text-white font-medium flex items-center gap-1.5">
                          {provider}
                          {isLeader && <Trophy size={11} className="text-amber-400" />}
                        </div>
                        <div className="text-gray-500 text-[10px]">{data.aiModel}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${endAlign} px-3 py-2 text-gray-300`}>{data.sampleSize}</td>
                  <td className={`${endAlign} px-3 py-2 text-emerald-300`}>{pct(data.t1Rate)}</td>
                  <td className={`${endAlign} px-3 py-2 text-emerald-300 font-semibold`}>{pct(data.t2Rate)}</td>
                  <td className={`${endAlign} px-3 py-2 text-red-300`}>{pct(data.stopRate)}</td>
                  <td
                    className={`${endAlign} px-3 py-2 font-semibold ${
                      (data.avgReturn ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {ret(data.avgReturn)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
