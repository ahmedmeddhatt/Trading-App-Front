"use client";

import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";

export default function PortfolioSummary() {
  const { data, isLoading, isError } = usePortfolio();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-900 rounded-xl">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-900 rounded-xl text-amber-400 text-sm">
        Failed to load portfolio
      </div>
    );
  }

  const isPositive = data.totalPnl >= 0;

  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-4">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
        Portfolio
      </h2>

      <div>
        <p className="text-3xl font-bold text-white">
          ${data.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>
            {isPositive ? "+" : "−"}
            {Math.abs(data.totalPnlPercent).toFixed(2)}%
          </span>
          <span className="text-gray-500 font-normal">
            ({isPositive ? "+" : "−"}${Math.abs(data.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })})
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {data.positions.map((pos) => (
          <div key={pos.symbol} className="flex items-center justify-between py-2">
            <div>
              <p className="text-white font-medium text-sm">{pos.symbol}</p>
              <p className="text-gray-500 text-xs">{pos.quantity} shares</p>
            </div>
            <div className="text-right">
              <p className="text-white text-sm">
                ${(pos.currentPrice * pos.quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs ${pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {pos.pnl >= 0 ? "+" : "−"}{Math.abs(pos.pnlPercent).toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
