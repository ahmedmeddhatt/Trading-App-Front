"use client";

import Link from "next/link";
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

function TrophyIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 opacity-90">
      <defs>
        <linearGradient id="trophyBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="trophyShine" x1="0%" y1="0%" x2="60%" y2="100%">
          <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#fef9c3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trophyBase" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* Cup body */}
      <path d="M24 14 Q22 34 28 42 Q34 48 40 48 Q46 48 52 42 Q58 34 56 14 Z" fill="url(#trophyBody)" />
      {/* Shine on cup */}
      <path d="M28 16 Q27 28 30 36 Q33 30 32 18 Z" fill="url(#trophyShine)" />
      {/* Handles */}
      <path d="M24 18 Q14 20 14 28 Q14 36 24 36" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M56 18 Q66 20 66 28 Q66 36 56 36" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Stem */}
      <rect x="36" y="48" width="8" height="10" rx="1" fill="url(#trophyBase)" />
      {/* Base platform */}
      <rect x="28" y="58" width="24" height="6" rx="3" fill="url(#trophyBase)" />
      {/* Star on cup */}
      <path d="M40 22 L41.8 27.5 H47.5 L43 31 L44.8 36.5 L40 33 L35.2 36.5 L37 31 L32.5 27.5 H38.2 Z" fill="#92400e" opacity="0.5" />
      {/* Sparkles */}
      <circle cx="18" cy="12" r="1.5" fill="#fbbf24" opacity="0.8" />
      <circle cx="62" cy="16" r="1" fill="#fbbf24" opacity="0.7" />
      <circle cx="14" cy="42" r="1" fill="#fde68a" opacity="0.6" />
      <path d="M65 8 L65 13 M62.5 10.5 L67.5 10.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M12 22 L12 26 M10 24 L14 24" stroke="#fde68a" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function DowntrendIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 opacity-85">
      <defs>
        <linearGradient id="chartBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <line x1="12" y1="20" x2="68" y2="20" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.2" />
      <line x1="12" y1="35" x2="68" y2="35" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.2" />
      <line x1="12" y1="50" x2="68" y2="50" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.2" />
      {/* Area fill under the line */}
      <path d="M12 24 L26 28 L38 34 L50 42 L63 54 L63 65 L12 65 Z" fill="url(#chartBg)" />
      {/* Downtrend line */}
      <polyline points="12,24 26,28 38,34 50,42 63,54" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Dots on line */}
      <circle cx="12" cy="24" r="2.5" fill="#f87171" />
      <circle cx="26" cy="28" r="2" fill="#ef4444" opacity="0.8" />
      <circle cx="38" cy="34" r="2" fill="#ef4444" opacity="0.8" />
      <circle cx="50" cy="42" r="2" fill="#ef4444" opacity="0.8" />
      <circle cx="63" cy="54" r="3" fill="#ef4444" />
      {/* Down arrow at end */}
      <path d="M63 58 L60 64 L66 64 Z" fill="#ef4444" />
      {/* X axis */}
      <line x1="12" y1="65" x2="68" y2="65" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  );
}

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
        className={`td-hover-card relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border ${
          positive
            ? "border-emerald-200 dark:border-emerald-900/50"
            : "border-red-200 dark:border-red-900/50"
        }`}
      >
        {/* Subtle gradient bg */}
        <div className={`absolute inset-0 ${positive ? "bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-900/10 dark:to-transparent" : "bg-gradient-to-br from-red-50/60 to-transparent dark:from-red-900/10 dark:to-transparent"}`} />

        <div className="relative flex items-center justify-between gap-3">
          {/* Left: text content */}
          <div className="min-w-0 flex-1">
            <p className={`text-xs sm:text-sm font-semibold uppercase tracking-wide mb-2 ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {title}
            </p>
            <p className="font-extrabold text-gray-900 dark:text-white text-xl sm:text-2xl leading-none mb-1.5 truncate">
              {performer.symbol}
            </p>
            <p className={`text-base sm:text-lg font-bold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {pnl >= 0 ? "+" : "−"}{fmt.format(Math.abs(pnl))}
            </p>
            <p className={`text-xs sm:text-sm font-medium mt-0.5 ${positive ? "text-emerald-500 dark:text-emerald-500" : "text-red-400 dark:text-red-500"}`}>
              {(performer.returnPercent ?? 0) >= 0 ? "+" : "−"}
              {Math.abs(performer.returnPercent ?? 0).toFixed(2)}% {t("analytics.returnLabel")}
            </p>
          </div>

          {/* Right: illustration */}
          <div className="shrink-0">
            {positive ? <TrophyIllustration /> : <DowntrendIllustration />}
          </div>
        </div>
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
