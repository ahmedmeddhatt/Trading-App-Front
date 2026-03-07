"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={50}
            dataKey="value"
            nameKey="name"
            onClick={(entry: AllocationSlice) =>
              onFilter(activeKey === entry.name ? null : entry.name)
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
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(val: number, name: string) => [
              `${fmt.format(val)} (${data.find((d) => d.name === name)?.percentage.toFixed(1)}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
            onClick={(e) => onFilter(activeKey === e.value ? null : (e.value as string))}
          />
        </PieChart>
      </ResponsiveContainer>
      {activeKey && (
        <button
          onClick={() => onFilter(null)}
          className="mt-1 text-xs text-blue-400 hover:text-blue-300 block mx-auto"
        >
          Clear filter
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
  return (
    <div className="bg-gray-900 rounded-xl p-5">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
        Allocation{(activeSector || activeSymbol) && " (filtered — click chart to clear)"}
      </h2>
      <div className="flex gap-6">
        <DonutChart
          title="By Sector"
          data={bySector}
          activeKey={activeSector}
          onFilter={onSectorFilter}
        />
        <DonutChart
          title="By Symbol"
          data={bySymbol}
          activeKey={activeSymbol}
          onFilter={onSymbolFilter}
        />
      </div>
    </div>
  );
}
