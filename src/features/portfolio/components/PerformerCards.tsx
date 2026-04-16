"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Performer {
  symbol: string;
  unrealizedPnL: string;
  returnPercent: number;
}

interface Props {
  best?: Performer | null;
  worst?: Performer | null;
}

const fmt = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 2,
});

function PerformerCard({
  title,
  performer,
  positive,
}: {
  title: string;
  performer: Performer;
  positive: boolean;
}) {
  const { t } = useLanguage();
  const pnl = parseFloat(performer.unrealizedPnL);
  return (
    <Link href={performer.symbol.startsWith("GOLD_") ? `/gold/${performer.symbol}` : `/stocks/${performer.symbol}`} className="flex-1">
      <div
        className={`td-hover-card bg-gray-900 rounded-xl p-3 sm:p-5 border ${
          positive ? "border-emerald-900/50" : "border-red-900/50"
        }`}
      >
        <p className="text-gray-500 text-[10px] sm:text-xs mb-1 sm:mb-2">{title}</p>
        <div className="flex items-center gap-2 mb-1">
          {positive ? (
            <TrendingUp className="text-emerald-400" size={16} />
          ) : (
            <TrendingDown className="text-red-400" size={16} />
          )}
          <span className="font-bold text-white text-lg sm:text-xl">{performer.symbol}</span>
        </div>
        <p className={`text-base sm:text-lg font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {pnl >= 0 ? "+" : "−"}
          {fmt.format(Math.abs(pnl))}
        </p>
        <p className={`text-xs sm:text-sm font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {(performer.returnPercent ?? 0) >= 0 ? "+" : "−"}
          {Math.abs(performer.returnPercent ?? 0).toFixed(2)}% {t("analytics.returnLabel")}
        </p>
      </div>
    </Link>
  );
}

export default function PerformerCards({ best, worst }: Props) {
  const { t } = useLanguage();
  if (!best && !worst) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
      {best && <PerformerCard title={t("analytics.bestPerformer")} performer={best} positive={true} />}
      {worst && <PerformerCard title={t("analytics.worstPerformer")} performer={worst} positive={false} />}
    </div>
  );
}
