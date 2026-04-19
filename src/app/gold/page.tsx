"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

interface GoldCategory {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  purity: string | null;
  weightGrams: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
  changePercent: number;
  lastUpdate: string | null;
  spread: number | null;
}

export default function GoldListPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const { data: categories, isLoading, isFetching, refetch } = useQuery<GoldCategory[]>({
    queryKey: ["gold", "categories"],
    queryFn: () => apiClient.get<GoldCategory[]>("/api/gold/categories"),
    refetchInterval: 60_000,
  });

  const firstCat = categories?.[0];
  const dailyChange = firstCat?.changePercent ?? 0;
  const dailyIsPos = dailyChange >= 0;
  const lastUpdate = firstCat?.lastUpdate;

  return (
    <AppShell>
      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 space-y-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {isAr ? "أسعار الذهب اليوم" : "Gold Prices Today"}
              </h1>
              {dailyChange !== 0 && (
                <span className={`text-xs font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                  dailyIsPos
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
                    : "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
                }`}>
                  {dailyIsPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {dailyIsPos ? "+" : "−"}{Math.abs(dailyChange).toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">
              {isAr ? "أسعار الذهب في مصر بجميع الأعيرة" : "Egyptian gold prices across all karats"}
              {lastUpdate && (
                <span className="ml-2">
                  · {isAr ? "آخر تحديث" : "Last updated"}{" "}
                  {new Date(lastUpdate).toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={async () => {
              try { await fetch("/api/gold/refresh", { method: "POST" }); } catch {}
              refetch();
            }}
            disabled={isFetching}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-lg border border-amber-200 dark:border-amber-500/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? (isAr ? "..." : "...") : (isAr ? "تحديث" : "Refresh")}
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-900 rounded-xl h-16 animate-pulse border border-gray-200 dark:border-gray-800" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(categories ?? []).map((cat) => {
              const name = isAr ? cat.nameAr : cat.nameEn;
              const isPos = cat.changePercent >= 0;

              return (
                <Link key={cat.categoryId} href={`/gold/${cat.categoryId}`}>
                  <div className="group bg-white dark:bg-gray-900 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700/50 hover:shadow-sm transition-all flex items-center gap-3">

                    {/* Gold icon */}
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center">
                      <span className="text-amber-500 text-sm font-bold leading-none">
                        {cat.purity ? `${Math.round(parseFloat(cat.purity) * 24)}K` : "Au"}
                      </span>
                    </div>

                    {/* Name + purity */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-amber-700 dark:text-amber-300 truncate">{name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-600">
                        {cat.purity && `${(parseFloat(cat.purity) * 100).toFixed(0)}% purity`}
                        {cat.unit && ` · /${cat.unit}`}
                      </p>
                    </div>

                    {/* Prices */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {cat.buyPrice?.toLocaleString()}
                        <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1">EGP</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Sell: {cat.sellPrice?.toLocaleString()}
                      </p>
                    </div>

                    {/* Change + spread */}
                    <div className="shrink-0 text-right w-14">
                      {cat.changePercent !== 0 && (
                        <p className={`text-xs font-semibold ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                          {isPos ? "+" : "−"}{Math.abs(cat.changePercent).toFixed(2)}%
                        </p>
                      )}
                      {cat.spread != null && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-700">
                          {cat.spread}% spread
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </AppShell>
  );
}
