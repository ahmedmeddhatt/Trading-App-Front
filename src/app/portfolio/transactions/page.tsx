"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Download, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatPct, pnlColor } from "@/lib/tradeCalcs";
import { exportToCSV } from "@/lib/csvExport";

interface TxRow {
  id: string; symbol: string; type: "BUY" | "SELL";
  quantity: string; price: string; fees: string; total: string;
  createdAt: string; runningBalance: string; feesCumulative: string;
  pnlOnSell: string | null;
}

interface Summary {
  totalTrades: number; totalBuys: number; totalSells: number;
  totalFees: string; totalRealizedPnL: string;
}

type SortKey = keyof TxRow;
type SortDir = "asc" | "desc";

export default function TransactionsPage() {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const qs = new URLSearchParams();
  if (symbolFilter) qs.set("symbol", symbolFilter);
  if (typeFilter) qs.set("type", typeFilter);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions-master", symbolFilter, typeFilter, from, to],
    queryFn: () => apiClient.get<{ transactions: TxRow[]; summary: Summary }>(
      `/api/portfolio/transactions?${qs}`
    ),
  });

  const sorted = useMemo(() => {
    if (!data?.transactions) return [];
    return [...data.transactions].sort((a, b) => {
      const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      : <ArrowUpDown size={12} className="text-gray-600" />;

  const handleExport = () => {
    if (!sorted.length) return;
    exportToCSV(sorted.map((t) => ({
      Date: new Date(t.createdAt).toLocaleDateString(),
      Symbol: t.symbol, Type: t.type,
      Quantity: t.quantity, Price: t.price, Fees: t.fees, Total: t.total,
      "Running Balance": t.runningBalance, "P&L (Sell)": t.pnlOnSell ?? "",
    })), `transactions_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const summary = data?.summary;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">All Transactions</h1>
            <p className="text-gray-500 text-sm">Full trade history with running P&L</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total Trades", value: summary.totalTrades },
              { label: "Buys", value: summary.totalBuys, cls: "text-emerald-400" },
              { label: "Sells", value: summary.totalSells, cls: "text-red-400" },
              { label: "Total Fees", value: formatEGP(summary.totalFees) },
              { label: "Realized P&L", value: formatEGP(summary.totalRealizedPnL), cls: pnlColor(summary.totalRealizedPnL) },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-gray-900 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">{label}</p>
                <p className={`text-lg font-bold ${cls ?? "text-white"}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-gray-900 rounded-xl p-4">
          <input
            placeholder="Symbol (e.g. ORAS)"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(symbolFilter || typeFilter || from || to) && (
            <button onClick={() => { setSymbolFilter(""); setTypeFilter(""); setFrom(""); setTo(""); }}
              className="text-sm text-gray-500 hover:text-white">Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-xl overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-500" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  {[
                    { key: "createdAt", label: "Date" },
                    { key: "symbol", label: "Symbol" },
                    { key: "type", label: "Type" },
                    { key: "quantity", label: "Qty" },
                    { key: "price", label: "Price" },
                    { key: "total", label: "Total" },
                    { key: "fees", label: "Fees" },
                    { key: "feesCumulative", label: "Fees Cum." },
                    { key: "runningBalance", label: "Balance" },
                    { key: "pnlOnSell", label: "P&L" },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => toggleSort(key as SortKey)}
                      className="px-4 py-3 text-left cursor-pointer hover:text-white">
                      <span className="flex items-center gap-1">{label} <SortIcon k={key as SortKey} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Detail</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <Link href={`/portfolio/positions/${t.symbol}`} className="hover:text-blue-400">{t.symbol}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.type === "BUY" ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t.quantity}</td>
                    <td className="px-4 py-3">{formatEGP(t.price)}</td>
                    <td className="px-4 py-3 font-medium">{formatEGP(t.total)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatEGP(t.fees)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatEGP(t.feesCumulative)}</td>
                    <td className={`px-4 py-3 font-medium ${pnlColor(t.runningBalance)}`}>{formatEGP(t.runningBalance)}</td>
                    <td className={`px-4 py-3 font-medium ${t.pnlOnSell ? pnlColor(t.pnlOnSell) : "text-gray-600"}`}>
                      {t.pnlOnSell ? formatEGP(t.pnlOnSell) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/portfolio/transactions/${t.id}`} className="text-blue-400 hover:text-blue-300 text-xs">View →</Link>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
