"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";

export interface AllocationSlice {
  name: string;
  value: number;
  percentage: number;
}

interface Props {
  bySector: AllocationSlice[];
  bySymbol: AllocationSlice[];
  onSectorFilter: (sector: string | null) => void;
  onSymbolFilter: (symbol: string | null) => void;
  activeSector: string | null;
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

function DonutChart({
  title,
  data,
  activeKey,
  onFilter,
}: {
  title: string;
  data: AllocationSlice[];
  activeKey: string | null;
  onFilter: (key: string | null) => void;
}) {
  const { t } = useLanguage();
  const clearFilterLabel = t("common.clear");
  if (!data.length) {
    return (
      <div className="flex-1">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">{title}</p>
        <div className="flex items-center justify-center h-44 text-gray-600 text-sm border border-dashed border-gray-800 rounded-lg">
          No data
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">{title}</p>
      <div dir="ltr">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={105}
            innerRadius={64}
            dataKey="value"
            nameKey="name"
            onClick={(entry: unknown) =>
              onFilter(activeKey === (entry as AllocationSlice).name ? null : (entry as AllocationSlice).name)
            }
            style={{ cursor: "pointer" }}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={COLORS[i % COLORS.length]}
                opacity={activeKey && activeKey !== entry.name ? 0.35 : 1}
                stroke={activeKey === entry.name ? "#fff" : "none"}
                strokeWidth={activeKey === entry.name ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0];
              const slice = data.find((d) => d.name === entry.name);
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
            onClick={(e) => onFilter(activeKey === e.value ? null : (e.value as string))}
          />
        </PieChart>
      </ResponsiveContainer>
      </div>
      {activeKey && (
        <button
          onClick={() => onFilter(null)}
          className="mt-1 text-xs text-blue-400 hover:text-blue-300 block mx-auto"
        >
          {clearFilterLabel}
        </button>
      )}
    </div>
  );
}

export default function AllocationCharts({
  bySector,
  bySymbol,
  onSectorFilter,
  onSymbolFilter,
  activeSector,
  activeSymbol,
}: Props) {
  const { t } = useLanguage();
  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
        {(activeSector || activeSymbol) ? `${t("analytics.sectorAlloc")} (${t("common.filtered")})` : t("analytics.sectorAlloc")}
      </h2>
      <div className="flex gap-6">
        <DonutChart
          title={t("analytics.sectorAlloc")}
          data={bySector}
          activeKey={activeSector}
          onFilter={onSectorFilter}
        />
        <DonutChart
          title={t("analytics.symbolAlloc")}
          data={bySymbol}
          activeKey={activeSymbol}
          onFilter={onSymbolFilter}
        />
      </div>
    </div>
  );
}
