"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, CheckCircle, Loader2, AlertCircle, ChevronLeft, Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTrade } from "../hooks/useTrade";
import { apiClient } from "@/lib/apiClient";

interface StockResult {
  symbol: string;
  name: string | null;
}

interface OwnedPosition {
  symbol: string;
  quantity: number;
}

interface AddTransactionModalProps {
  onClose: () => void;
  ownedPositions?: OwnedPosition[];
}

const FEE_RATE = 0.00175;

const fmtEGP = (val: number) =>
  new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format(val);

function Row({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`text-white ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

export default function AddTransactionModal({ onClose, ownedPositions = [] }: AddTransactionModalProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [symbolInput, setSymbolInput] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("1");
  const [priceInput, setPriceInput] = useState("");
  const [feesInput, setFeesInput] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { submit, isPending, isError, error, reset } = useTrade();

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(symbolInput), 300);
    return () => clearTimeout(timer);
  }, [symbolInput]);

  const { data: stocksData } = useQuery({
    queryKey: ["stocks-search", debouncedSearch],
    queryFn: () =>
      apiClient.get<{ stocks: StockResult[]; total: number }>(
        `/api/stocks?search=${encodeURIComponent(debouncedSearch)}&limit=8`
      ),
    enabled: debouncedSearch.length >= 1 && !selectedSymbol && side === "buy",
  });

  // When selling, only show owned stocks filtered by search input
  const ownedFiltered = ownedPositions
    .filter((p) => p.quantity > 0)
    .filter((p) => !debouncedSearch || p.symbol.includes(debouncedSearch.toUpperCase()))
    .map((p) => ({ symbol: p.symbol, name: null as string | null }));

  const stocks = side === "sell" ? ownedFiltered : (stocksData?.stocks ?? []);

  const ownedQtyForSelected = ownedPositions.find((p) => p.symbol === selectedSymbol)?.quantity ?? 0;

  const qty = Math.max(0, parseFloat(quantity) || 0);
  const parsedPrice = parseFloat(priceInput) || 0;

  const sellError = side === "sell" && qty > ownedQtyForSelected && selectedSymbol
    ? `Cannot sell ${qty} — you only own ${ownedQtyForSelected} shares`
    : null;

  // Auto-calculate fees
  useEffect(() => {
    const computed = qty * parsedPrice * FEE_RATE;
    setFeesInput(computed.toFixed(2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, priceInput]);

  const parsedFees = parseFloat(feesInput) || 0;
  const total = side === "sell" ? qty * parsedPrice - parsedFees : qty * parsedPrice + parsedFees;
  const canReview = qty > 0 && parsedPrice > 0 && selectedSymbol.length > 0 && !sellError;

  const handleSelectSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSymbolInput(symbol);
    setShowDropdown(false);
  };

  const handleReview = () => {
    if (!canReview) return;
    reset();
    setStep("confirm");
  };

  const handleConfirm = () => {
    submit(
      { symbol: selectedSymbol, side, quantity: qty, price: parsedPrice, fees: parsedFees, date },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => onClose(), 1500);
        },
      }
    );
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, isPending]);

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!isPending) onClose(); }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          {step === "confirm" && !showSuccess ? (
            <button
              onClick={() => setStep("form")}
              disabled={isPending}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div className="w-5" />
          )}
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
            {step === "confirm" ? "Review Transaction" : "Add Transaction"}
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Success */}
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <CheckCircle className="text-emerald-400" size={44} />
              <p className="text-white font-semibold text-lg">Transaction Added</p>
              <p className="text-gray-400 text-sm">
                {side.toUpperCase()} {qty} {selectedSymbol}
              </p>
            </div>
          ) : step === "confirm" ? (
            /* ── Confirm step ──────────────────────────────────── */
            <>
              <div className="space-y-2 bg-gray-800 rounded-lg p-4 text-sm">
                <Row
                  label="Action"
                  value={
                    <span className={side === "buy" ? "text-emerald-400 font-bold" : "text-orange-400 font-bold"}>
                      {side.toUpperCase()}
                    </span>
                  }
                />
                <Row label="Symbol" value={<span className="font-mono">{selectedSymbol}</span>} />
                <Row
                  label="Date"
                  value={new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                />
                <Row label="Quantity" value={qty.toString()} />
                <Row label="Price per Share" value={fmtEGP(parsedPrice)} />
                <Row label="Brokerage Fee" value={fmtEGP(parsedFees)} />
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <Row label="Total" value={fmtEGP(total)} bold />
                </div>
              </div>

              {isError && (
                <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-900/20 rounded-lg p-3">
                  <AlertCircle size={16} />
                  <span>{error?.message ?? "Something went wrong"}</span>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  side === "buy"
                    ? "bg-emerald-500 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/30 text-white"
                    : "bg-orange-500 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/30 text-white"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Adding...</span>
                  </>
                ) : (
                  `Confirm ${side === "buy" ? "Buy" : "Sell"}`
                )}
              </button>
            </>
          ) : (
            /* ── Form step ─────────────────────────────────────── */
            <>
              {/* BUY / SELL toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                {(["buy", "sell"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSide(s); setSelectedSymbol(""); setSymbolInput(""); }}
                    className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                      side === s
                        ? s === "buy"
                          ? "bg-emerald-500 text-white"
                          : "bg-orange-500 text-white"
                        : "bg-transparent text-gray-400 hover:text-white"
                    }`}
                  >
                    {s === "buy" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>

              {/* Symbol search */}
              <div className="space-y-1" ref={dropdownRef}>
                <label className="text-gray-500 text-xs">Symbol</label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={symbolInput}
                    onChange={(e) => {
                      setSymbolInput(e.target.value.toUpperCase());
                      setSelectedSymbol("");
                      setShowDropdown(true);
                    }}
                    onFocus={() => { if ((symbolInput || side === "sell") && !selectedSymbol) setShowDropdown(true); }}
                    placeholder="Search symbol..."
                    className="w-full bg-gray-800 rounded-lg pl-9 pr-4 py-2 text-white text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showDropdown && stocks.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {stocks.map((s) => (
                        <button
                          key={s.symbol}
                          onMouseDown={() => handleSelectSymbol(s.symbol)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-700 text-left transition-colors"
                        >
                          <span className="font-mono text-sm text-white">{s.symbol}</span>
                          {s.name && (
                            <span className="text-gray-500 text-xs truncate ml-3 max-w-[160px]">
                              {s.name}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSymbol && (
                  <p className="text-emerald-500 text-xs">✓ {selectedSymbol} selected</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-gray-500 text-xs">Transaction Date</label>
                <input
                  type="date"
                  value={date}
                  max={todayStr}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-gray-500 text-xs flex justify-between">
                  <span>Quantity</span>
                  {side === "sell" && selectedSymbol && ownedQtyForSelected > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuantity(String(ownedQtyForSelected))}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Max: {ownedQtyForSelected}
                    </button>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max={side === "sell" && ownedQtyForSelected > 0 ? ownedQtyForSelected : undefined}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                {sellError && (
                  <div className="flex items-center gap-2 text-amber-400 text-xs mt-1">
                    <AlertCircle size={12} />
                    <span>{sellError}</span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <label className="text-gray-500 text-xs">Price per Share (EGP)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Fees */}
              <div className="space-y-1">
                <label className="text-gray-500 text-xs flex justify-between">
                  <span>Brokerage Fee</span>
                  <span className="text-gray-600">0.175% suggested</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feesInput}
                  onChange={(e) => setFeesInput(e.target.value)}
                  className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Total preview */}
              {qty > 0 && parsedPrice > 0 && (
                <div className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between text-sm">
                  <span className="text-gray-400">Total</span>
                  <span className="text-white font-semibold">{fmtEGP(total)}</span>
                </div>
              )}

              <button
                onClick={handleReview}
                disabled={!canReview}
                className="w-full py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review Transaction
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
