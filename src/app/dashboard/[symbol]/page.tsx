"use client";

import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useActiveStock } from "@/store/useActiveStock";
import { usePriceStream } from "@/hooks/usePriceStream";
import PortfolioSummary from "@/features/portfolio/components/PortfolioSummary";
import TradeForm from "@/features/trade/components/TradeForm";

const SYMBOLS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "GOOGL"];

export default function DashboardPage() {
  const { symbol, setSymbol } = useActiveStock();
  const priceData = usePriceStream(symbol);

  const isPositive = priceData ? priceData.change >= 0 : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-400" size={20} />
          <span className="font-bold text-lg tracking-tight">TradeDesk</span>
        </div>

        {/* Symbol selector */}
        <div className="flex gap-2">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${symbol === s
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* Price ticker */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        <span className="text-2xl font-bold">
          {priceData ? `$${priceData.price.toFixed(2)}` : "—"}
        </span>
        {priceData && isPositive !== null && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {isPositive ? "+" : ""}{priceData.change.toFixed(2)} ({isPositive ? "+" : ""}{priceData.changePercent.toFixed(2)}%)
            </span>
          </div>
        )}
        <span className="text-gray-500 text-sm ml-auto">
          {symbol}
          {priceData && (
            <span className="ml-2 text-xs text-gray-600">
              {new Date(priceData.timestamp).toLocaleTimeString()}
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

        {/* Center: Chart placeholder */}
        <div className="lg:col-span-1 bg-gray-900 rounded-xl p-5 flex flex-col gap-3">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
            Price Chart
          </h2>
          <div className="flex-1 flex items-center justify-center text-gray-700 text-sm border border-dashed border-gray-800 rounded-lg min-h-[200px]">
            Connect charting library (e.g. Recharts / TradingView)
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Open" value={priceData ? `$${(priceData.price * 0.99).toFixed(2)}` : "—"} />
            <Stat label="Volume" value="14.2M" />
            <Stat label="52W High" value="$199.62" />
            <Stat label="52W Low" value="$124.17" />
          </div>
        </div>

        {/* Right: Trade form */}
        <div className="lg:col-span-1">
          <TradeForm symbol={symbol} currentPrice={priceData?.price ?? null} />
        </div>
      </main>
    </div>
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
