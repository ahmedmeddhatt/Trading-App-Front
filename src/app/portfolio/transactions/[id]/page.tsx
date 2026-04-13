"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart, Line, ReferenceLine, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Area,
} from "recharts";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatSignedEGP, formatPct, pnlColor } from "@/lib/tradeCalcs";

interface PricePoint { timestamp: string; price: number }
interface CostBasis { beforeTrade: { avgPrice: string; quantity: string } | null; afterTrade: { avgPrice: string; quantity: string } | null }
interface TimelineEntry { id: string; createdAt: string; type: "BUY" | "SELL"; quantity: string; price: string; isCurrentTrade: boolean }
type RealizedImpact = { profit: string; returnPct: string; holdDays: number | null } | null

interface TxDetail {
  transaction: {
    id: string; symbol: string; type: "BUY" | "SELL";
    quantity: string; price: string; fees: string; total: string; createdAt: string;
  };
  priceContext: { priceAtTrade: string | null; currentPrice: string | null; priceHistory: PricePoint[] };
  costBasis: CostBasis;
  feeImpact: { feePct: string };
  symbolTimeline: TimelineEntry[];
  realizedImpact: RealizedImpact;
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/portfolio/transactions/${id}`);
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["transactions-master"] });
      queryClient.invalidateQueries({ queryKey: ["position-detail"] });
      router.push("/portfolio/transactions");
    } catch (e) {
      alert((e as Error).message ?? "Failed to delete");
      setDeleting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["tx-detail", id],
    queryFn: () => apiClient.get<TxDetail>(`/api/portfolio/transactions/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-gray-500" size={32} />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500">
          Transaction not found
        </div>
      </AppShell>
    );
  }

  const { transaction: tx, priceContext, costBasis, feeImpact, symbolTimeline, realizedImpact } = data;
  const isBuy = tx.type === "BUY";
  const tradeDate = new Date(tx.createdAt).toLocaleDateString();
  const tradeDateMs = new Date(tx.createdAt).getTime();

  const chartData = (priceContext.priceHistory ?? []).map((p) => ({
    ts: new Date(p.timestamp).getTime(),
    label: new Date(p.timestamp).toLocaleDateString(),
    price: p.price,
  }));

  const tradePrice = parseFloat(tx.price);
  const currentPrice = priceContext.currentPrice ? parseFloat(priceContext.currentPrice) : null;
  const priceChange = currentPrice != null ? ((currentPrice - tradePrice) / tradePrice) * 100 : null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back + Header */}
        <div>
          <Link href="/portfolio/transactions" className="flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-4">
            <ArrowLeft size={14} /> All Transactions
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl font-bold font-mono">{tx.symbol}</span>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${isBuy ? "bg-orange-900/40 text-orange-400" : "bg-emerald-900/40 text-emerald-400"}`}>
                  {tx.type}
                </span>
              </div>
              <p className="text-gray-500 text-sm">{tradeDate}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold">{formatEGP(tx.total)}</p>
                <p className="text-gray-500 text-sm">Total Value</p>
              </div>
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  title="Delete transaction"
                >
                  <Trash2 size={18} />
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  <span className="text-red-400 text-xs">Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2 py-1 rounded text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                  >
                    {deleting ? "..." : "Yes"}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-2 py-1 rounded text-xs font-bold bg-gray-700 hover:bg-gray-600 text-gray-300"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Trade Price", value: formatEGP(tx.price) },
            { label: "Quantity", value: tx.quantity },
            { label: "Fees", value: formatEGP(tx.fees), sub: `${parseFloat(feeImpact.feePct).toFixed(2)}% of value` },
            {
              label: "Current Price",
              value: currentPrice ? formatEGP(currentPrice) : "—",
              sub: priceChange != null ? formatPct(priceChange) : undefined,
              cls: priceChange != null ? pnlColor(priceChange) : "text-gray-400",
            },
          ].map(({ label, value, sub, cls }) => (
            <div key={label} className="bg-gray-900 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className="text-lg font-bold text-white">{value}</p>
              {sub && <p className={`text-xs mt-0.5 ${cls ?? "text-gray-500"}`}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* Price Chart */}
        {chartData.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Price History Around Trade</h2>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v, i) => (i % Math.ceil(chartData.length / 6) === 0 ? v : "")}
                />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v: unknown) => [formatEGP(v as number), "Price"]}
                />
                <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} dot={false} />
                <ReferenceLine y={tradePrice} stroke={isBuy ? "#10b981" : "#ef4444"} strokeDasharray="4 4" label={{ value: "Trade", fill: "#9ca3af", fontSize: 10 }} />
                {currentPrice && (
                  <ReferenceLine y={currentPrice} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Now", fill: "#f59e0b", fontSize: 10, position: "right" }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cost Basis Before / After */}
        {(costBasis.beforeTrade || costBasis.afterTrade) && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Cost Basis Impact</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-gray-600 uppercase tracking-wider">Before Trade</p>
                {costBasis.beforeTrade ? (
                  <>
                    <p className="text-white font-medium">{formatEGP(costBasis.beforeTrade.avgPrice)} <span className="text-gray-500 text-xs">avg</span></p>
                    <p className="text-gray-400 text-sm">{costBasis.beforeTrade.quantity} units</p>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm">No prior position</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-600 uppercase tracking-wider">After Trade</p>
                {costBasis.afterTrade ? (
                  <>
                    <p className="text-white font-medium">{formatEGP(costBasis.afterTrade.avgPrice)} <span className="text-gray-500 text-xs">avg</span></p>
                    <p className="text-gray-400 text-sm">{costBasis.afterTrade.quantity} units</p>
                  </>
                ) : (
                  <p className="text-gray-600 text-sm">Position closed</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Realized Impact (SELL only) */}
        {realizedImpact && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">Realized P&L</h2>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-gray-500 text-xs mb-1">Profit / Loss</p>
                <p className={`text-2xl font-bold ${pnlColor(realizedImpact.profit)}`}>
                  {parseFloat(realizedImpact.profit) >= 0 ? <TrendingUp className="inline mr-1" size={18} /> : <TrendingDown className="inline mr-1" size={18} />}
                  {formatSignedEGP(realizedImpact.profit)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Return %</p>
                <p className={`text-xl font-bold ${pnlColor(realizedImpact.returnPct)}`}>
                  {formatPct(realizedImpact.returnPct)}
                </p>
              </div>
              {realizedImpact.holdDays != null && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Hold Days</p>
                  <p className="text-xl font-bold text-white">{realizedImpact.holdDays}d</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Symbol Timeline */}
        {symbolTimeline.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">{tx.symbol} Trade History</h2>
            <div className="relative pl-4">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
              {symbolTimeline.map((entry, i) => (
                <div key={entry.id} className={`relative pl-6 pb-4 ${i === symbolTimeline.length - 1 ? "" : ""}`}>
                  <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 ${
                    entry.isCurrentTrade
                      ? "bg-blue-500 border-blue-400"
                      : entry.type === "BUY" ? "bg-orange-950 border-orange-500" : "bg-emerald-900 border-emerald-500"
                  }`} />
                  <div className={`flex items-center gap-3 ${entry.isCurrentTrade ? "text-white" : "text-gray-400"}`}>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      entry.type === "BUY" ? "bg-orange-900/30 text-orange-400" : "bg-emerald-900/30 text-emerald-400"
                    }`}>{entry.type}</span>
                    <span className="text-sm">{new Date(entry.createdAt).toLocaleDateString()}</span>
                    <span className="text-sm">{entry.quantity} @ {formatEGP(entry.price)}</span>
                    {entry.isCurrentTrade && <span className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">This Trade</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
