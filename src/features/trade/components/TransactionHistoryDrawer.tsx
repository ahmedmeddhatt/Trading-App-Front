"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Transaction {
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: string;
  total?: number;
}

interface HistoryResponse {
  transactions: Transaction[];
  summary?: {
    totalBought?: number;
    totalSold?: number;
    netFlow?: number;
  };
}

interface Props {
  symbol: string;
  open: boolean;
  onClose: () => void;
}

const fmt = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

function useTransactions(symbol: string, enabled: boolean) {
  return useQuery<HistoryResponse>({
    queryKey: ["portfolio", "stock-history", symbol],
    queryFn: () =>
      apiClient.get<HistoryResponse>(`/api/portfolio/stock/${symbol}/history`),
    enabled,
    retry: 1,
  });
}

export default function TransactionHistoryDrawer({ symbol, open, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const { data, isLoading } = useTransactions(symbol, open);
  const transactions = data?.transactions ?? [];

  // Prefer backend summary; fall back to calculating from transactions
  const totalBought =
    data?.summary?.totalBought ??
    transactions.filter((t) => t.type === "BUY")
      .reduce((sum, t) => sum + (t.total ?? t.price * t.quantity), 0);
  const totalSold =
    data?.summary?.totalSold ??
    transactions.filter((t) => t.type === "SELL")
      .reduce((sum, t) => sum + (t.total ?? t.price * t.quantity), 0);
  const netFlow = data?.summary?.netFlow ?? (totalSold - totalBought);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="font-bold text-white">Transaction History</h2>
            <p className="text-gray-500 text-sm">{symbol}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-500" size={20} />
            </div>
          )}

          {!isLoading && transactions.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No transactions yet for {symbol}.
            </div>
          )}

          {transactions?.map((tx, i) => {
            const isBuy = tx.type === "BUY";
            const total = tx.total ?? tx.price * tx.quantity;
            return (
              <div
                key={i}
                className="bg-gray-800 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      isBuy
                        ? "bg-emerald-900/60 text-emerald-400"
                        : "bg-orange-900/60 text-orange-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(tx.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" · "}
                    {new Date(tx.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {tx.quantity} shares @ {fmt.format(tx.price)}
                  </span>
                  <span
                    className={`font-bold ${
                      isBuy ? "text-orange-400" : "text-emerald-400"
                    }`}
                  >
                    {isBuy ? "−" : "+"}
                    {fmt.format(total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer summary */}
        {transactions.length > 0 && (
          <div className="border-t border-gray-800 p-5 shrink-0 space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total bought</span>
              <span className="text-orange-400">{fmt.format(totalBought)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total sold</span>
              <span className="text-emerald-400">{fmt.format(totalSold)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-gray-800 pt-2 mt-2">
              <span className="text-gray-400">Net cash flow</span>
              <span
                className={`flex items-center gap-1 ${
                  netFlow >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {netFlow >= 0 ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                {netFlow >= 0 ? "+" : "−"}
                {fmt.format(Math.abs(netFlow))}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
