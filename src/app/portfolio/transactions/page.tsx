"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Download, Loader2, ChevronUp, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatSignedEGP, formatPct, pnlColor } from "@/lib/tradeCalcs";
import { exportToCSV } from "@/lib/csvExport";
import { useLanguage } from "@/context/LanguageContext";
import AddTransactionModal from "@/features/trade/components/AddTransactionModal";

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
  const { t } = useLanguage();
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
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
    <>
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{t("tx.title")}</h1>
            <p className="text-gray-500 text-sm">{t("tx.sub")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={14} /> Add Transaction
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm"
            >
              <Download size={14} /> {t("tx.exportCsv")}
            </button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: t("tx.totalTrades"), value: summary.totalTrades },
              { label: t("tx.buys"), value: summary.totalBuys, cls: "text-emerald-400" },
              { label: t("tx.sells"), value: summary.totalSells, cls: "text-orange-400" },
              { label: t("tx.totalFees"), value: formatEGP(summary.totalFees) },
              { label: t("tx.realizedPnl"), value: formatSignedEGP(summary.totalRealizedPnL), cls: pnlColor(summary.totalRealizedPnL) },
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
            placeholder={t("tx.symbolPlaceholder")}
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("tx.allTypes")}</option>
            <option value="BUY">{t("common.buy")}</option>
            <option value="SELL">{t("common.sell")}</option>
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{t("common.from")}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" />
            <span>{t("common.to")}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {(symbolFilter || typeFilter || from || to) && (
            <button onClick={() => { setSymbolFilter(""); setTypeFilter(""); setFrom(""); setTo(""); }}
              className="text-sm text-gray-500 hover:text-white">{t("common.clear")}</button>
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
                    { key: "createdAt", label: t("tx.date") },
                    { key: "symbol", label: t("common.symbol") },
                    { key: "type", label: t("tx.type") },
                    { key: "quantity", label: t("common.qty") },
                    { key: "price", label: t("common.price") },
                    { key: "total", label: t("common.total") },
                    { key: "fees", label: t("common.fees") },
                    { key: "feesCumulative", label: t("tx.feesCum") },
                    { key: "runningBalance", label: t("tx.balance") },
                    { key: "pnlOnSell", label: t("common.profit") },
                  ].map(({ key, label }) => (
                    <th key={key} onClick={() => toggleSort(key as SortKey)}
                      className="px-4 py-3 text-left cursor-pointer hover:text-white transition-colors duration-150">
                      <span className="flex items-center gap-1">{label} <SortIcon k={key as SortKey} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">{t("tx.detail")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.id} className="td-row border-b border-gray-800/50">
                    <td className="px-4 py-3 text-gray-400">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono font-bold">
                      <Link href={`/portfolio/positions/${row.symbol}`} className="hover:text-blue-400">{row.symbol}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.type === "BUY" ? "bg-emerald-900/30 text-emerald-400" : "bg-orange-900/30 text-orange-400"}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.quantity}</td>
                    <td className="px-4 py-3">{formatEGP(row.price)}</td>
                    <td className="px-4 py-3 font-medium">{formatEGP(row.total)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatEGP(row.fees)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatEGP(row.feesCumulative)}</td>
                    <td className={`px-4 py-3 font-medium ${pnlColor(row.runningBalance)}`}>{formatEGP(row.runningBalance)}</td>
                    <td className={`px-4 py-3 font-medium ${row.pnlOnSell ? pnlColor(row.pnlOnSell) : "text-gray-600"}`}>
                      {row.pnlOnSell ? formatSignedEGP(row.pnlOnSell) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/portfolio/transactions/${row.id}`} className="text-blue-400 hover:text-blue-300 text-xs">{t("tx.view")}</Link>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-500">{t("tx.noTx")}</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>

    {showAddModal && (
      <AddTransactionModal onClose={() => setShowAddModal(false)} />
    )}
    </>
  );
}
