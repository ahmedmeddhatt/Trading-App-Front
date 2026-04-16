"use client";

import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
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

  // Use the first category's data for the global daily change & last update
  const firstCat = categories?.[0];
  const dailyChange = firstCat?.changePercent ?? 0;
  const dailyIsPos = dailyChange >= 0;
  const lastUpdate = firstCat?.lastUpdate;

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Coins className="text-amber-500" size={24} />
              {isAr ? "أسعار الذهب اليوم" : "Gold Prices Today"}
              {dailyChange !== 0 && (
                <span className={`text-sm font-medium flex items-center gap-0.5 ${dailyIsPos ? "text-emerald-400" : "text-red-400"}`}>
                  {dailyIsPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {dailyIsPos ? "+" : "−"}{Math.abs(dailyChange).toFixed(2)}%
                </span>
              )}
            </h1>
            <button
              onClick={async () => {
                try { await fetch("/api/gold/refresh", { method: "POST" }); } catch {}
                refetch();
              }}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
              {isFetching ? (isAr ? "جاري التحديث..." : "Refreshing...") : (isAr ? "تحديث الأسعار" : "Refresh Prices")}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-500 text-sm">
              {isAr ? "أسعار الذهب في مصر بجميع الأعيرة" : "Egyptian gold prices across all karats"}
            </p>
            {lastUpdate && (
              <span className="text-gray-500 text-sm">
                · {isAr ? "آخر تحديث" : "Last updated"}{" "}
                {new Date(lastUpdate).toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-xl p-5 h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(categories ?? []).map((cat) => {
              const name = isAr ? cat.nameAr : cat.nameEn;

              return (
                <Link key={cat.categoryId} href={`/gold/${cat.categoryId}`}>
                  <div className="bg-gray-900 rounded-xl p-5 space-y-3 border border-gray-800 hover:border-amber-700/50 transition-all hover:shadow-lg hover:shadow-amber-900/10">
                    <div className="flex items-center gap-2">
                      <Coins size={18} className="text-amber-500" />
                      <div>
                        <h3 className="font-bold text-amber-300 text-lg">{name}</h3>
                        <p className="text-gray-600 text-xs">
                          {cat.purity && `Purity: ${(parseFloat(cat.purity) * 100).toFixed(1)}%`}
                          {cat.weightGrams && ` · ${cat.weightGrams}g`}
                        </p>
                      </div>
                    </div>

                    {cat.sellPrice != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-500 text-sm">{isAr ? "شراء" : "Buy"}</span>
                          <span className="text-white font-bold text-xl">{cat.buyPrice?.toLocaleString()} EGP</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-gray-500 text-sm">{isAr ? "بيع" : "Sell"}</span>
                          <span className="text-gray-300 text-base">{cat.sellPrice.toLocaleString()} EGP</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-gray-600 pt-1 border-t border-gray-800">
                      <span>/{cat.unit}</span>
                      {cat.spread != null && <span>{isAr ? "هامش" : "Spread"}: {cat.spread}%</span>}
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
