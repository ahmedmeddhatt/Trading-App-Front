"use client";

import { useState } from "react";
import { CheckCircle, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { useTrade, type TradePayload } from "../hooks/useTrade";

type Side = "buy" | "sell";
type Step = "form" | "confirm";

interface TradeFormProps {
  symbol: string;
  currentPrice: number | null;
}

export default function TradeForm({ symbol, currentPrice }: TradeFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [side, setSide] = useState<Side>("buy");
  const [quantity, setQuantity] = useState<string>("1");
  const [showSuccess, setShowSuccess] = useState(false);

  const { submit, isPending, isError, error, reset } = useTrade();

  const qty = Math.max(0, parseFloat(quantity) || 0);
  const estimatedTotal = currentPrice ? currentPrice * qty : null;

  const handleReview = () => {
    if (qty <= 0 || !currentPrice) return;
    reset();
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!currentPrice) return;
    const payload: TradePayload = {
      symbol,
      side,
      quantity: qty,
      price: currentPrice,
    };
    submit(payload, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setStep("form");
          setQuantity("1");
        }, 2000);
      },
    });
  };

  // ── Success flash ────────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="bg-gray-900 rounded-xl p-5 flex flex-col items-center justify-center gap-3 min-h-[260px]">
        <CheckCircle className="text-emerald-400" size={40} />
        <p className="text-white font-semibold text-lg">Order Placed</p>
        <p className="text-gray-400 text-sm">
          {side.toUpperCase()} {qty} {symbol}
        </p>
      </div>
    );
  }

  // ── Confirm step ─────────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="bg-gray-900 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep("form")}
            disabled={isPending}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
            Review Order
          </h2>
        </div>

        <div className="space-y-2 bg-gray-800 rounded-lg p-4 text-sm">
          <Row label="Action" value={<span className={side === "buy" ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>{side.toUpperCase()}</span>} />
          <Row label="Symbol" value={symbol} />
          <Row label="Quantity" value={qty.toString()} />
          <Row label="Price" value={currentPrice ? `$${currentPrice.toFixed(2)}` : "—"} />
          <div className="border-t border-gray-700 pt-2 mt-2">
            <Row
              label="Est. Total"
              value={estimatedTotal ? `$${estimatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
              bold
            />
          </div>
        </div>

        {isError && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 rounded-lg p-3">
            <AlertCircle size={16} />
            <span>{error?.message ?? "Something went wrong"}</span>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={isPending}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2
            ${side === "buy"
              ? "bg-emerald-500 hover:bg-emerald-400 text-white"
              : "bg-red-500 hover:bg-red-400 text-white"}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>Placing Order…</span>
            </>
          ) : (
            `Confirm ${side === "buy" ? "Buy" : "Sell"}`
          )}
        </button>
      </div>
    );
  }

  // ── Form step ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-5">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
        Place Order
      </h2>

      {/* Side selector */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {(["buy", "sell"] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors
              ${side === s
                ? s === "buy"
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
                : "bg-transparent text-gray-400 hover:text-white"}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Symbol (read-only) */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs">Symbol</label>
        <div className="bg-gray-800 rounded-lg px-4 py-2 text-white text-sm font-mono">
          {symbol}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs">Quantity</label>
        <input
          type="number"
          min="0"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Price display */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs">Market Price</label>
        <div className={`bg-gray-800 rounded-lg px-4 py-2 text-sm font-mono ${isPending ? "animate-pulse text-gray-500" : "text-white"}`}>
          {currentPrice ? `$${currentPrice.toFixed(2)}` : "Loading…"}
        </div>
      </div>

      {/* Estimated total */}
      {estimatedTotal !== null && qty > 0 && (
        <div className="text-right text-gray-400 text-xs">
          Est. total:{" "}
          <span className="text-white font-medium">
            ${estimatedTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <button
        onClick={handleReview}
        disabled={qty <= 0 || !currentPrice}
        className="w-full py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Review Order
      </button>
    </div>
  );
}

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
