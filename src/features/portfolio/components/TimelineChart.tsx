"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface TimelinePoint {
  timestamp: string;
  totalValue: number;
}

const fmt = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

const RANGES = ["1W", "1M", "3M", "6M", "1Y"] as const;
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
  if (range === "1Y") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TimelineChart({ data, range, onRangeChange, loading }: Props) {
  const chartData = data.map((p) => ({
    date: formatDate(p.timestamp, range),
    totalValue: p.totalValue,
  }));

  const isPositive =
    data.length >= 2 ? data[data.length - 1].totalValue >= data[0].totalValue : true;
  const lineColor = isPositive ? "#34d399" : "#f87171";

  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
          Portfolio Value Over Time
        </h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                range === r
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-56">
        {loading ? (
          <div className="h-full bg-gray-800 rounded-lg animate-pulse" />
        ) : data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
            No timeline data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(val: unknown) => [fmt.format((val as number) ?? 0), "Value"]}
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
