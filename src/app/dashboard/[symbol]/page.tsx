"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import RangeSelector from "@/components/RangeSelector";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useActiveStock } from "@/store/useActiveStock";
import { usePriceStream } from "@/hooks/usePriceStream";
import { apiClient } from "@/lib/apiClient";
import { DateRange, rangeToFromTo } from "@/lib/rangeToFromTo";
import PortfolioSummary from "@/features/portfolio/components/PortfolioSummary";
import TradeForm from "@/features/trade/components/TradeForm";

const SYMBOLS = ["COMI", "HRHO", "EKHC", "ESRS", "MNHD", "FWRY"];

interface HistoryPoint {
  price: number;
  timestamp: number;
}

function useStockHistory(symbol: string) {
  const to = new Date().toISOString().slice(0, 10);
  return useQuery<HistoryPoint[]>({
    queryKey: ["stock-history", symbol, "ALL"],
    queryFn: () => apiClient.get<HistoryPoint[]>(`/api/prices/history/${symbol}?from=2000-01-01&to=${to}`),
    retry: 1,
    staleTime: 60_000,
  });
}

const RANGE_DAYS: Record<string, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

export default function DashboardPage() {
  const { symbol, setSymbol } = useActiveStock();
  const [range, setRange] = useState<DateRange>("1Y");
  const { prices } = usePriceStream([symbol]);
  const priceData = prices[symbol] ?? null;
  const { data: allHistory = [], isLoading: histLoading } = useStockHistory(symbol);

  const isPositive = priceData ? priceData.change >= 0 : null;

  // Filter history client-side by range
  const history = useMemo(() => {
    const cutoffMs = Date.now() - (RANGE_DAYS[range] ?? 365) * 86400000;
    return allHistory.filter(h => h.timestamp >= cutoffMs);
  }, [allHistory, range]);

  // Compute stats from history
  const histPrices = history.map((h) => h.price);
  const openPrice = histPrices[0] ?? null;
  const high52w = histPrices.length ? Math.max(...histPrices) : null;
  const low52w = histPrices.length ? Math.min(...histPrices) : null;

  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: h.price,
  }));
  const chartColor = (history.length >= 2 && history[history.length - 1].price >= history[0].price)
    ? "#34d399"
    : "#f87171";

  return (
    <AppShell>
      {/* Symbol selector sub-header */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              symbol === s ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Price ticker */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <span className="text-2xl font-bold">
          {priceData ? `$${priceData.price.toFixed(2)}` : "—"}
        </span>
        {priceData && isPositive !== null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {isPositive ? "+" : "−"}{Math.abs(priceData.change).toFixed(2)} ({isPositive ? "+" : "−"}{Math.abs(priceData.changePercent).toFixed(2)}%)
            </span>
          </div>
        )}
        <span className="text-gray-500 text-sm ml-auto">
          {symbol}
          {priceData && (
            <span className="ml-2 text-xs text-gray-600">
              {new Date(priceData.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
            </span>
          )}
        </span>
      </div>

      {/* Main 3-column grid */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-w-7xl mx-auto">
        {/* Left: Portfolio */}
        <div className="lg:col-span-1">
          <PortfolioSummary />
        </div>

        {/* Center: Chart */}
        <div className="lg:col-span-1 bg-gray-900 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
              Price Chart
            </h2>
            <div className="flex gap-1">
              {(["1W","1M","3M","6M","1Y"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded text-xs font-medium active:scale-95 transition-all duration-150 ${
                    range === r ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-white hover:bg-gray-800"
                  }`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[200px]">
            {histLoading ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <Loader2 className="animate-spin text-gray-600" size={24} />
              </div>
            ) : chartData.length < 2 ? (
              <div className="flex items-center justify-center h-full min-h-[200px] text-gray-700 text-sm border border-dashed border-gray-800 rounded-lg">
                No historical data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={55} tickFormatter={(v) => `$${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: chartColor }}
                    formatter={(v: unknown) => [`$${((v as number) ?? 0).toFixed(2)}`, "Price"]}
                  />
                  <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Open" value={openPrice != null ? `$${openPrice.toFixed(2)}` : "—"} />
            <Stat label="52W High" value={high52w != null ? `$${high52w.toFixed(2)}` : "—"} />
            <Stat label="52W Low" value={low52w != null ? `$${low52w.toFixed(2)}` : "—"} />
            <Stat label="Current" value={priceData ? `$${priceData.price.toFixed(2)}` : "—"} />
          </div>
        </div>

        {/* Right: Trade form */}
        <div className="lg:col-span-1">
          <TradeForm symbol={symbol} currentPrice={priceData?.price ?? null} />
        </div>
      </main>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
