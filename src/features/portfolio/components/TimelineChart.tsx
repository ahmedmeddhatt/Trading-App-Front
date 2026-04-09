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
  if (range === "1W") return d.toLocaleDateString("en-US", { weekday: "short" });
  if (range === "1Y" || range === "ALL") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipEntry {
  value: number;
  payload: { fullDate: string; totalValue: number; revenue: number };
}

function ChartTooltip({
  active, payload, firstValue, lineColor,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  firstValue: number;
  lineColor: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const fullDate = payload[0].payload.fullDate;
  const change = value - firstValue;
  const changePct = firstValue > 0 ? (change / firstValue) * 100 : 0;
  const isGain = change >= 0;
  const changeColor = isGain ? "#34d399" : "#f87171";

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: `1px solid ${lineColor}33`,
      borderRadius: 12,
      padding: "12px 16px",
      boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${lineColor}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
      minWidth: 200,
      pointerEvents: "none",
      backdropFilter: "blur(12px)",
    }}>
      <p style={{ color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {fullDate}
      </p>
      <p style={{ color: "#f1f5f9", fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>
        {fmt.format(value)}
      </p>
      <div style={{ height: 1, background: "#1e293b", marginBottom: 8 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isGain
          ? <TrendingUp size={13} color={changeColor} />
          : <TrendingDown size={13} color={changeColor} />
        }
        <span style={{ color: changeColor, fontSize: 13, fontWeight: 700 }}>
          {isGain ? "+" : "−"}{fmt.format(Math.abs(change))}
        </span>
        <span style={{
          color: changeColor,
          fontSize: 11,
          fontWeight: 600,
          background: `${changeColor}18`,
          borderRadius: 4,
          padding: "1px 5px",
        }}>
          {isGain ? "+" : "−"}{Math.abs(changePct).toFixed(2)}%
        </span>
      </div>
      <p style={{ color: "#475569", fontSize: 10, marginTop: 5 }}>vs period start</p>
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

  const maxVal = numericValues.length >= 2 ? Math.max(...numericValues) : null;
  const minVal = numericValues.length >= 2 ? Math.min(...numericValues) : null;

  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
            {mode === "value" ? t("analytics.portfolioOverTime") : t("analytics.revenueOverTime")}
          </h2>
          <div className="flex gap-0.5 bg-gray-800 rounded-lg p-0.5">
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
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${
                range === r
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        {loading ? (
          <div className="h-full bg-gray-800 rounded-lg animate-pulse" />
        ) : data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
            {t("analytics.noTimeline")}
          </div>
        ) : (
          <div dir="ltr" style={{ height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: dir === "rtl" ? 48 : 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                orientation={dir === "rtl" ? "right" : "left"}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v.toFixed(0)}`
                }
                width={44}
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
                  />
                )}
                cursor={false}
              />
              {maxVal != null && (
                <ReferenceLine y={maxVal} stroke={lineColor} strokeDasharray="3 3" strokeOpacity={0.4}
                  label={{ value: `H: ${fmt.format(maxVal)}`, fill: lineColor, fontSize: 9, position: dir === "rtl" ? "left" : "right" }} />
              )}
              {minVal != null && (
                <ReferenceLine y={minVal} stroke="#6b7280" strokeDasharray="3 3" strokeOpacity={0.4}
                  label={{ value: `L: ${fmt.format(minVal)}`, fill: "#6b7280", fontSize: 9, position: dir === "rtl" ? "left" : "right" }} />
              )}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={lineColor}
                strokeWidth={2.5}
                fill={lineColor}
                fillOpacity={0.08}
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
