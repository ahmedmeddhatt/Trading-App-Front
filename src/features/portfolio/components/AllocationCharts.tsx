"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";

export interface AllocationSlice {
  name: string;
  value: number;
  percentage: number;
}

interface Props {
  bySymbol: AllocationSlice[];
  onSymbolFilter: (symbol: string | null) => void;
  activeSymbol: string | null;
}

const COLORS = [
  "#3b82f6", "#34d399", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#a78bfa",
];

const fmt = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 0,
});

export default function AllocationCharts({
  bySymbol,
  onSymbolFilter,
  activeSymbol,
}: Props) {
  const { t } = useLanguage();

  if (!bySymbol.length) {
    return (
      <div className="bg-gray-900 rounded-xl p-5">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
          {t("analytics.symbolAlloc")}
        </h2>
        <div className="flex items-center justify-center h-44 text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
          No data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
        {activeSymbol ? `${t("analytics.symbolAlloc")} (${t("common.filtered")})` : t("analytics.symbolAlloc")}
      </h2>
      <div dir="ltr">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={bySymbol}
              cx="50%"
              cy="50%"
              outerRadius={105}
              innerRadius={64}
              dataKey="value"
              nameKey="name"
              onClick={(entry: unknown) =>
                onSymbolFilter(activeSymbol === (entry as AllocationSlice).name ? null : (entry as AllocationSlice).name)
              }
              style={{ cursor: "pointer" }}
            >
              {bySymbol.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[i % COLORS.length]}
                  opacity={activeSymbol && activeSymbol !== entry.name ? 0.35 : 1}
                  stroke={activeSymbol === entry.name ? "#fff" : "none"}
                  strokeWidth={activeSymbol === entry.name ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const entry = payload[0];
                const slice = bySymbol.find((d) => d.name === entry.name);
                return (
                  <div style={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 12,
                    color: "#f1f5f9",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}>
                    <p style={{ color: "#94a3b8", marginBottom: 4 }}>{entry.name}</p>
                    <p style={{ color: entry.color ?? "#f1f5f9", fontWeight: 600 }}>
                      {fmt.format((entry.value as number) ?? 0)}
                      {slice ? ` (${slice.percentage.toFixed(1)}%)` : ""}
                    </p>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
              onClick={(e) => onSymbolFilter(activeSymbol === e.value ? null : (e.value as string))}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {activeSymbol && (
        <button
          onClick={() => onSymbolFilter(null)}
          className="mt-1 text-xs text-blue-400 hover:text-blue-300 block mx-auto"
        >
          {t("common.clear")}
        </button>
      )}
    </div>
  );
}
