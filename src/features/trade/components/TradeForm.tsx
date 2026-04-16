"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Loader2, AlertCircle, ChevronLeft, TrendingUp, TrendingDown } from "lucide-react";
import { useTrade, type TradePayload } from "../hooks/useTrade";
import { useLanguage } from "@/context/LanguageContext";

type Side = "buy" | "sell";
type Step = "form" | "confirm";

interface TradeFormProps {
  symbol: string;
  currentPrice: number | null;
  ownedQuantity?: number;
  assetType?: "STOCK" | "GOLD";
  unit?: string;
}

const FEE_RATE = 0.00175;

export default function TradeForm({ symbol, currentPrice, ownedQuantity = 0, assetType = "STOCK", unit }: TradeFormProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("form");
  const [side, setSide] = useState<Side>("buy");
  const [quantity, setQuantity] = useState<string>("1");
  const [priceInput, setPriceInput] = useState<string>(currentPrice != null ? currentPrice.toFixed(2) : "");
  const [feesInput, setFeesInput] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [localQtyAdjust, setLocalQtyAdjust] = useState(0);

  const effectiveOwned = Math.max(0, parseFloat(String(ownedQuantity)) + localQtyAdjust);

  useEffect(() => { setLocalQtyAdjust(0); }, [ownedQuantity]);

  const { submit, isPending, isError, error, reset } = useTrade();

  useEffect(() => {
    if (currentPrice != null && priceInput === "") {
      setPriceInput(currentPrice.toFixed(2));
    }
  }, [currentPrice, priceInput]);

  useEffect(() => {
    if (side === "sell" && effectiveOwned <= 0) setSide("buy");
  }, [effectiveOwned, side]);

  const qty = Math.max(0, parseFloat(quantity) || 0);
  const parsedPrice = parseFloat(priceInput) || 0;

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
    ? `${t("trade.cantSell")} ${qty} — ${t("trade.youOnlyOwn")} ${effectiveOwned} ${unit ?? t("trade.sharesUnit")}`
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
      assetType,
    };
    submit(payload, {
      onSuccess: () => {
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
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="text-emerald-400" size={32} />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">{t("trade.orderPlaced")}</p>
          <p className="text-gray-400 text-sm mt-1">
            {side === "buy" ? "Bought" : "Sold"} {qty} {unit ?? t("trade.sharesUnit")} of {symbol}
          </p>
        </div>
      </div>
    );
  }

  // ── Confirm step ─────────────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("form")}
            disabled={isPending}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-white font-semibold text-sm">{t("trade.reviewOrder")}</h2>
            <p className="text-gray-500 text-xs">Double-check before confirming</p>
          </div>
        </div>

        {/* Order summary card */}
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className={`px-4 py-3 ${side === "buy" ? "bg-emerald-500/10 border-b border-emerald-500/20" : "bg-orange-500/10 border-b border-orange-500/20"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 ${side === "buy" ? "text-emerald-400" : "text-orange-400"}`}>
                {side === "buy" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {side === "buy" ? t("trade.buy") : t("trade.sell")}
              </span>
              <span className="text-gray-400 text-xs font-mono">{symbol}</span>
            </div>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <ConfirmRow label={t("trade.quantity")} value={`${qty} ${unit ?? t("trade.sharesUnit")}`} />
            <ConfirmRow label={t("common.price")} value={fmtEGP(parsedPrice)} />
            <ConfirmRow label={t("trade.brokerageFee")} value={fmtEGP(parsedFees)} muted />
            <div className="pt-2 border-t border-gray-800">
              <ConfirmRow label={t("common.total")} value={fmtEGP(total)} bold />
            </div>
          </div>
        </div>

        {isError && (
          <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-900/20 border border-amber-800/40 rounded-xl p-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error?.message ?? "Something went wrong"}</span>
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={isPending}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
            side === "buy"
              ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
              : "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20"
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
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">{t("trade.placeOrder")}</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-gray-500 text-xs">Live</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">1</div>
            <span className="text-white text-xs font-medium">{t("trade.orderDetails")}</span>
          </div>
          <div className="flex-1 h-px bg-gray-800 mx-1" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold">2</div>
            <span className="text-gray-500 text-xs">{t("trade.reviewConfirm")}</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Buy / Sell toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-800 rounded-xl">
          {(["buy", "sell"] as Side[]).map((s) => {
            const disabled = s === "sell" && effectiveOwned <= 0;
            return (
              <button
                key={s}
                onClick={() => !disabled && setSide(s)}
                disabled={disabled}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  disabled
                    ? "text-gray-600 cursor-not-allowed"
                    : side === s
                    ? s === "buy"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-orange-500 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {s === "buy" ? t("trade.buy") : t("trade.sell")}
              </button>
            );
          })}
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-xs font-medium">{t("trade.quantity")}</label>
            {side === "sell" && effectiveOwned > 0 && (
              <button
                type="button"
                onClick={() => setQuantity(String(effectiveOwned))}
                className="text-orange-400 hover:text-orange-300 text-xs font-semibold transition-colors"
              >
                Max ({effectiveOwned})
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            step={assetType === "GOLD" ? "0.01" : "1"}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-xs font-medium">{t("trade.price")}</label>
            {currentPrice != null && (
              <button
                type="button"
                onClick={() => setPriceInput(currentPrice.toFixed(2))}
                className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
              >
                {t("trade.livePrice")} {currentPrice.toLocaleString()}
              </button>
            )}
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
            placeholder={currentPrice != null ? currentPrice.toFixed(2) : "Enter price"}
          />
        </div>

        {/* Brokerage Fee */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-xs font-medium">{t("trade.fee")}</label>
            <span className="text-gray-600 text-xs">0.175% of value</span>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={feesInput}
            onChange={(e) => setFeesInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
          />
        </div>

        {/* Total */}
        {qty > 0 && parsedPrice > 0 && (
          <div className={`rounded-xl px-4 py-3 flex justify-between items-center border ${
            side === "buy" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-orange-500/5 border-orange-500/20"
          }`}>
            <span className="text-gray-400 text-sm">{t("common.total")}</span>
            <span className={`font-bold text-base ${side === "buy" ? "text-emerald-400" : "text-orange-400"}`}>
              {fmtEGP(total)}
            </span>
          </div>
        )}

        {/* Errors & hints */}
        {sellError && (
          <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/20 border border-amber-800/40 rounded-xl p-3">
            <AlertCircle size={14} className="shrink-0" />
            <span>{sellError}</span>
          </div>
        )}

        {side === "sell" && effectiveOwned > 0 && !sellError && (
          <p className="text-gray-600 text-xs text-right">
            {t("trade.available")} {effectiveOwned} {unit ?? t("trade.sharesUnit")}
          </p>
        )}

        <button
          onClick={handleReview}
          disabled={!canReview}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
            side === "buy"
              ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
              : "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20"
          }`}
        >
          {t("trade.reviewOrder")}
        </button>
      </div>
    </div>
  );
}

function ConfirmRow({
  label,
  value,
  bold = false,
  muted = false,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm ${bold ? "text-white font-semibold" : muted ? "text-gray-400" : "text-gray-200"}`}>
        {value}
      </span>
    </div>
  );
}
