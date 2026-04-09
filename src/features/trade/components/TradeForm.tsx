"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { useTrade, type TradePayload } from "../hooks/useTrade";
import { useLanguage } from "@/context/LanguageContext";

type Side = "buy" | "sell";
type Step = "form" | "confirm";

interface TradeFormProps {
  symbol: string;
  currentPrice: number | null;
  ownedQuantity?: number;
}

const FEE_RATE = 0.00175;

export default function TradeForm({ symbol, currentPrice, ownedQuantity = 0 }: TradeFormProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("form");
  const [side, setSide] = useState<Side>("buy");
  const [quantity, setQuantity] = useState<string>("1");
  const [priceInput, setPriceInput] = useState<string>(currentPrice != null ? currentPrice.toFixed(2) : "");
  const [feesInput, setFeesInput] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [localQtyAdjust, setLocalQtyAdjust] = useState(0);

  const effectiveOwned = Math.max(0, ownedQuantity + localQtyAdjust);

  // Reset local adjustment when prop changes (portfolio refetched)
  useEffect(() => { setLocalQtyAdjust(0); }, [ownedQuantity]);

  const { submit, isPending, isError, error, reset } = useTrade();

  // Sync priceInput when live price arrives for the first time
  useEffect(() => {
    if (currentPrice != null && priceInput === "") {
      setPriceInput(currentPrice.toFixed(2));
    }
  }, [currentPrice, priceInput]);

  // Reset to buy if sell is selected but no position
  useEffect(() => {
    if (side === "sell" && effectiveOwned <= 0) setSide("buy");
  }, [effectiveOwned, side]);

  const qty = Math.max(0, parseFloat(quantity) || 0);
  const parsedPrice = parseFloat(priceInput) || 0;

  // Auto-update fees when qty or price changes
  useEffect(() => {
    const computed = qty * parsedPrice * FEE_RATE;
    setFeesInput(computed.toFixed(2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, priceInput]);

  const parsedFees = parseFloat(feesInput) || 0;
  const total = side === "sell"
    ? qty * parsedPrice - parsedFees
    : qty * parsedPrice + parsedFees;

  const sellError = side === "sell" && qty > effectiveOwned
    ? `${t("trade.cantSell")} ${qty} — ${t("trade.youOnlyOwn")} ${effectiveOwned} ${t("trade.sharesUnit")}`
    : null;

  const canReview = qty > 0 && parsedPrice > 0 && !sellError;

  const handleReview = () => {
    if (!canReview) return;
    reset();
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (parsedPrice <= 0) return;
    const payload: TradePayload = {
      symbol,
      side,
      quantity: qty,
      price: parsedPrice,
      fees: parsedFees,
    };
    submit(payload, {
      onSuccess: () => {
        // Immediately adjust local owned quantity
        setLocalQtyAdjust(prev => prev + (side === "sell" ? -qty : qty));
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setStep("form");
          setQuantity("1");
        }, 2000);
      },
    });
  };

  const fmtEGP = (val: number) =>
    new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(val);

  // ── Success flash ────────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="bg-gray-900 rounded-xl p-5 flex flex-col items-center justify-center gap-3 min-h-[260px]">
        <CheckCircle className="text-emerald-400" size={40} />
        <p className="text-white font-semibold text-lg">{t("trade.orderPlaced")}</p>
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
            {t("trade.reviewOrder")}
          </h2>
        </div>

        <div className="space-y-2 bg-gray-800 rounded-lg p-4 text-sm">
          <Row label={t("trade.action")} value={<span className={side === "buy" ? "text-emerald-400 font-bold" : "text-orange-400 font-bold"}>{side.toUpperCase()}</span>} />
          <Row label={t("common.symbol")} value={symbol} />
          <Row label={t("trade.quantity")} value={qty.toString()} />
          <Row label={t("common.price")} value={fmtEGP(parsedPrice)} />
          <Row label={t("trade.brokerageFee")} value={fmtEGP(parsedFees)} />
          <div className="border-t border-gray-700 pt-2 mt-2">
            <Row label={t("common.total")} value={fmtEGP(total)} bold />
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
              <span>{t("trade.placingOrder")}</span>
            </>
          ) : (
            side === "buy" ? t("trade.confirmBuy") : t("trade.confirmSell")
          )}
        </button>
      </div>
    );
  }

  // ── Form step ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-900 rounded-xl p-5 space-y-5">
      <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
        {t("trade.placeOrder")}
      </h2>

      {/* Side selector */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {(["buy", "sell"] as Side[]).map((s) => {
          const disabled = s === "sell" && effectiveOwned <= 0;
          return (
            <button
              key={s}
              onClick={() => !disabled && setSide(s)}
              disabled={disabled}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                disabled
                  ? "bg-transparent text-gray-600 cursor-not-allowed"
                  : side === s
                  ? s === "buy"
                    ? "bg-emerald-500 text-white"
                    : "bg-orange-500 text-white"
                  : "bg-transparent text-gray-400 hover:text-white"
              }`}
            >
              {s === "buy" ? t("trade.buy") : t("trade.sell")}
            </button>
          );
        })}
      </div>

      {/* Symbol (read-only) */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs">{t("common.symbol")}</label>
        <div className="bg-gray-800 rounded-lg px-4 py-2 text-white text-sm font-mono">
          {symbol}
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs flex justify-between">
          <span>{t("trade.quantity")}</span>
          {side === "sell" && effectiveOwned > 0 && (
            <button
              type="button"
              onClick={() => setQuantity(String(effectiveOwned))}
              className="text-orange-400 hover:text-orange-300 text-xs font-semibold"
            >
              ALL ({effectiveOwned})
            </button>
          )}
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Price (editable, pre-filled with live price) */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs flex justify-between">
          <span>{t("trade.price")}</span>
          {currentPrice != null && (
            <button
              type="button"
              onClick={() => setPriceInput(currentPrice.toFixed(2))}
              className="text-blue-400 hover:text-blue-300 text-xs"
            >
              {t("trade.livePrice")} {currentPrice.toFixed(2)}
            </button>
          )}
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={currentPrice != null ? currentPrice.toFixed(2) : "Enter price"}
        />
      </div>

      {/* Brokerage Fee */}
      <div className="space-y-1">
        <label className="text-gray-500 text-xs flex justify-between">
          <span>{t("trade.fee")}</span>
          <span className="text-gray-600">{t("trade.brokerageSuggested")}</span>
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

      {/* Total */}
      {qty > 0 && parsedPrice > 0 && (
        <div className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between text-sm">
          <span className="text-gray-400">{t("common.total")}</span>
          <span className="text-white font-semibold">{fmtEGP(total)}</span>
        </div>
      )}

      {/* Sell validation error */}
      {sellError && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-900/20 rounded-lg p-3">
          <AlertCircle size={16} />
          <span>{sellError}</span>
        </div>
      )}

      {/* Owned shares hint when selling */}
      {side === "sell" && effectiveOwned > 0 && !sellError && (
        <p className="text-gray-500 text-xs text-right">{t("trade.available")} {effectiveOwned} {t("trade.sharesUnit")}</p>
      )}
      {side === "sell" && effectiveOwned === 0 && (
        <p className="text-gray-500 text-xs text-right">{t("trade.noShares")}</p>
      )}

      <button
        onClick={handleReview}
        disabled={!canReview}
        className="w-full py-3 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t("trade.reviewOrder")}
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
