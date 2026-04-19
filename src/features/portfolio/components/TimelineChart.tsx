"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type ChartMode = "value" | "revenue";

export interface TimelinePoint {
  timestamp: string;
  totalValue: string | number;
  totalInvested?: string | number;
}

const fmt = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

const RANGES = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
export type DateRange = (typeof RANGES)[number];

interface Props {
  data: TimelinePoint[];
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  loading?: boolean;
}

function formatDate(ts: string, range: DateRange) {
  const d = new Date(ts);
  if (range === "1W") return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (range === "1Y") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (range === "ALL") return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipEntry {
  value: number;
  payload: { fullDate: string; totalValue: number; revenue: number };
}

function ChartTooltip({
  active, payload, firstValue, lineColor, mode,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  firstValue: number;
  lineColor: string;
  mode: ChartMode;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const fullDate = payload[0].payload.fullDate;
  const revenue = payload[0].payload.revenue;

  // In revenue mode, the value IS the gain/loss — color by its sign
  // In value mode, compare against the first data point
  const isRevenueMode = mode === "revenue";
  const isGain = isRevenueMode ? value >= 0 : value >= firstValue;
  const pointColor = isGain ? "#34d399" : value === 0 ? "#9ca3af" : "#f87171";

  const change = isRevenueMode ? value : value - firstValue;
  const changePct = isRevenueMode
    ? 0 // not meaningful for revenue
    : firstValue > 0 ? (change / firstValue) * 100 : 0;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: `1px solid ${pointColor}33`,
      borderRadius: 10,
      padding: "8px 12px",
      boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${pointColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
      minWidth: 160,
      maxWidth: "calc(100vw - 40px)",
      pointerEvents: "none" as const,
      backdropFilter: "blur(12px)",
    }}>
      <p style={{ color: "#64748b", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        {fullDate}
      </p>
      <p style={{ color: pointColor, fontSize: 16, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.02em" }}>
        {isRevenueMode ? `${value >= 0 ? "+" : "−"}${fmt.format(Math.abs(value))}` : fmt.format(value)}
      </p>
      {!isRevenueMode && (
        <>
          <div style={{ height: 1, background: "#1e293b", marginBottom: 4 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {isGain
              ? <TrendingUp size={11} color={pointColor} />
              : <TrendingDown size={11} color={pointColor} />
            }
            <span style={{ color: pointColor, fontSize: 12, fontWeight: 700 }}>
              {isGain ? "+" : "−"}{fmt.format(Math.abs(change))}
            </span>
            <span style={{
              color: pointColor,
              fontSize: 10,
              fontWeight: 600,
              background: `${pointColor}18`,
              borderRadius: 4,
              padding: "1px 4px",
            }}>
              {isGain ? "+" : "−"}{Math.abs(changePct).toFixed(2)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function TimelineChart({ data, range, onRangeChange, loading }: Props) {
  const { t, dir } = useLanguage();
  const [mode, setMode] = useState<ChartMode>("value");

  // API returns totalValue as a decimal string — convert to number throughout
  const chartData = data.map((p) => {
    const value = Number(p.totalValue);
    const invested = p.totalInvested != null ? Number(p.totalInvested) : null;
    const revenue = invested != null ? value - invested : 0;
    return {
      date: formatDate(p.timestamp, range),
      fullDate: new Date(p.timestamp).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      }),
      totalValue: value,
      revenue,
    };
  });

  const dataKey = mode === "revenue" ? "revenue" : "totalValue";
  const numericValues = chartData.map((d) => d[dataKey]);
  const isPositive =
    numericValues.length >= 2
      ? numericValues[numericValues.length - 1] >= numericValues[0]
      : true;
  const lineColor = isPositive ? "#34d399" : "#f87171";

  // For revenue mode: compute gradient offset so green is above 0, red below, gray at 0
  const revenueMax = Math.max(...numericValues, 0);
  const revenueMin = Math.min(...numericValues, 0);
  const revenueRange = revenueMax - revenueMin;
  // zeroOffset = fraction from top where y=0 sits (0 = top, 1 = bottom)
  const zeroOffset = revenueRange > 0 ? revenueMax / revenueRange : 0.5;

  const maxVal = numericValues.length >= 2 ? Math.max(...numericValues) : null;
  const minVal = numericValues.length >= 2 ? Math.min(...numericValues) : null;

  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-5 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-gray-400 text-[10px] sm:text-xs font-semibold uppercase tracking-widest whitespace-nowrap">
            {mode === "value" ? t("analytics.portfolioOverTime") : t("analytics.revenueOverTime")}
          </h2>
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => setMode("value")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 ${
                mode === "value"
                  ? "bg-gray-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("analytics.value")}
            </button>
            <button
              onClick={() => setMode("revenue")}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-150 ${
                mode === "revenue"
                  ? "bg-gray-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t("analytics.revenue")}
            </button>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-800/60 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-medium active:scale-95 transition-all duration-150 whitespace-nowrap ${
                range === r
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-52 sm:h-72">
        {loading ? (
          <div className="h-full bg-gray-800 rounded-lg animate-pulse" />
        ) : data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
            {t("analytics.noTimeline")}
          </div>
        ) : (
          <div dir="ltr" style={{ height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: dir === "rtl" ? 40 : 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                  <stop offset={`${(zeroOffset * 100).toFixed(1)}%`} stopColor="#9ca3af" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id="revenueStrokeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset={`${(zeroOffset * 100).toFixed(1)}%`} stopColor="#9ca3af" />
                  <stop offset="100%" stopColor="#f87171" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                orientation={dir === "rtl" ? "right" : "left"}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}`
                }
                width={38}
              />
              <Tooltip
                wrapperStyle={{ backgroundColor: "transparent" }}
                animationDuration={300}
                animationEasing="ease-out"
                content={(props) => (
                  <ChartTooltip
                    active={props.active}
                    payload={props.payload as unknown as TooltipEntry[] | undefined}
                    firstValue={numericValues[0] ?? 0}
                    lineColor={lineColor}
                    mode={mode}
                  />
                )}
                cursor={false}
              />
              {maxVal != null && (
                <ReferenceLine y={maxVal} stroke={lineColor} strokeDasharray="3 3" strokeOpacity={0.1}
                  label={{ value: `H: ${fmt.format(maxVal)}`, fill: lineColor, fontSize: 9, position: dir === "rtl" ? "left" : "right" }} />
              )}
              {minVal != null && (
                <ReferenceLine y={minVal} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.1}
                  label={{ value: `L: ${fmt.format(minVal)}`, fill: "#6b7280", fontSize: 9, position: dir === "rtl" ? "left" : "right" }} />
              )}
              {mode === "revenue" && (
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" strokeOpacity={0.1} />
              )}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={mode === "revenue" ? "url(#revenueStrokeGradient)" : lineColor}
                strokeWidth={2.5}
                fill={mode === "revenue" ? "url(#revenueFillGradient)" : lineColor}
                fillOpacity={mode === "revenue" ? 1 : 0.08}
                dot={false}
                activeDot={{ r: 7, fill: lineColor, stroke: "#0f172a", strokeWidth: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
