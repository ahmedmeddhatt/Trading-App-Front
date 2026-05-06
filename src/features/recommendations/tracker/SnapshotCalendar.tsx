"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { getProviderColors } from "./AIModelBadge";
import type { SnapshotSummary } from "./useTrackerSnapshots";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DotInfo {
  weekStartDate: string;
  aiProvider: string;
  scoreColor: string;
}

function scoreColor(s: SnapshotSummary): string {
  const total = s.summaryStats.t1Hits + s.summaryStats.t2Hits + s.summaryStats.stops;
  if (total === 0) return "bg-gray-500"; // pending only
  const positive = s.summaryStats.t1Hits + s.summaryStats.t2Hits;
  if (positive >= total * 0.6) return "bg-emerald-500";
  if (positive >= total * 0.4) return "bg-amber-500";
  return "bg-red-500";
}

export function SnapshotCalendar({
  snapshots,
  selected,
  onSelect,
}: {
  snapshots: SnapshotSummary[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const { t, lang } = useLanguage();
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const weekdayFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
    [locale],
  );
  const monthFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale],
  );
  const weekdays = useMemo(() => {
    // Sunday=0..Saturday=6 — pick a reference Sunday and increment.
    const refSunday = new Date(2024, 0, 7); // Sunday Jan 7 2024
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(refSunday);
      d.setDate(refSunday.getDate() + i);
      return weekdayFmt.format(d);
    });
  }, [weekdayFmt]);

  const [cursor, setCursor] = useState<Date>(() => {
    if (selected) return new Date(selected + "T00:00:00");
    return new Date();
  });

  const dots = useMemo(() => {
    const map = new Map<string, DotInfo>();
    for (const s of snapshots) {
      // Mark every day in the snapshot's week (Sun..Sat)
      const weekStart = new Date(s.weekStartDate + "T00:00:00");
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        map.set(isoDate(d), {
          weekStartDate: s.weekStartDate,
          aiProvider: s.aiProvider,
          scoreColor: scoreColor(s),
        });
      }
    }
    return map;
  }, [snapshots]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = isoDate(new Date());

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
          aria-label={t("tracker.calendar.prevMonth")}
        >
          {lang === "ar" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <div className="text-sm font-semibold text-white">
          {monthFmt.format(new Date(year, month, 1))}
        </div>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
          aria-label={t("tracker.calendar.nextMonth")}
        >
          {lang === "ar" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-[10px] uppercase text-gray-500 tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={idx} className="aspect-square" />;
          }
          const iso = isoDate(cell);
          const dot = dots.get(iso);
          const isSelected = selected === iso;
          const isToday = iso === today;
          const colors = dot ? getProviderColors(dot.aiProvider) : null;

          return (
            <button
              key={idx}
              onClick={() => onSelect(iso)}
              disabled={!dot}
              className={`aspect-square flex flex-col items-center justify-center rounded-md transition-colors text-xs relative ${
                dot ? "hover:bg-gray-800 cursor-pointer" : "cursor-default opacity-40"
              } ${isSelected ? "bg-blue-900/50 ring-1 ring-blue-500" : ""} ${
                isToday && !isSelected ? "ring-1 ring-gray-600" : ""
              }`}
            >
              <span className={`${dot ? "text-white" : "text-gray-500"} font-medium`}>
                {cell.getDate()}
              </span>
              {dot && colors && (
                <div className="absolute bottom-1 flex items-center gap-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${dot.scoreColor}`}
                    title={`Week ${dot.weekStartDate} · ${dot.aiProvider}`}
                  />
                  <span className={`text-[8px] font-bold ${colors.chipText}`}>
                    {colors.letter}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-800/60 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("tracker.legend.wins")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {t("tracker.legend.mixed")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {t("tracker.legend.lost")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> {t("tracker.legend.pending")}
        </span>
      </div>
    </div>
  );
}
