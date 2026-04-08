"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Search, Coins, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";
import AppShell from "@/components/AppShell";

interface GoldCategoryItem {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  buyPrice: number | null;
  sellPrice: number | null;
  changePercent: number;
  lastUpdate: string | null;
  source: string | null;
  globalSpotUsd: number | null;
}

interface MyGoldItem {
  categoryId: string;
  totalQuantity: string;
  averagePrice: string;
  totalInvested: string;
  currentSellPrice: number | null;
  currentBuyPrice: number | null;
  changePercent: number;
}

interface GoldDashboardData {
  categories: GoldCategoryItem[];
  topMovers: GoldCategoryItem[];
  popular: GoldCategoryItem[];
  myGold: MyGoldItem[];
}

function useGoldDashboard() {
  return useQuery<GoldDashboardData>({
    queryKey: ["gold", "dashboard"],
    queryFn: () => apiClient.get<GoldDashboardData>("/api/gold/dashboard"),
    retry: 1,
    refetchInterval: 60_000,
  });
}

export default function GoldDashboard() {
  const [search, setSearch] = useState("");
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const { data, isLoading, isError } = useGoldDashboard();

  const getName = (item: GoldCategoryItem) => isAr ? item.nameAr : item.nameEn;

  return (
    <AppShell>
      {/* Gold price source indicator */}
      {data?.categories?.[0]?.source && (
        <div className="bg-amber-900/20 border-b border-amber-800/30 px-4 py-1.5 text-center">
          <span className="text-amber-400 text-xs">
            <Coins size={12} className="inline mr-1" />
            Gold prices via {data.categories[0].source}
            {data.categories[0].lastUpdate && (
              <> · Updated {new Date(data.categories[0].lastUpdate).toLocaleTimeString()}</>
            )}
            {data.categories[0].globalSpotUsd && (
              <> · XAU/USD ${data.categories[0].globalSpotUsd.toLocaleString()}</>
            )}
          </span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {isError ? (
          <div className="flex flex-col items-center gap-2 py-10 bg-gray-900/60 border border-amber-900/40 rounded-xl">
            <span className="text-amber-400 text-sm font-medium">Failed to load gold prices</span>
            <span className="text-gray-600 text-xs">Check your connection and try again</span>
          </div>
        ) : (
          <>
            {/* Popular Categories (21K, 24K, Gold Pound) */}
            <GoldSection
              title={isAr ? "الأكثر تداولاً" : "Most Popular"}
              items={data?.popular ?? []}
              loading={isLoading}
              getName={getName}
            />

            {/* All Gold Categories */}
            <GoldSection
              title={isAr ? "جميع الأعيرة" : "All Categories"}
              items={data?.categories ?? []}
              loading={isLoading}
              getName={getName}
            />

            {/* Top Movers */}
            {(data?.topMovers?.length ?? 0) > 0 && (
              <GoldSection
                title={isAr ? "الأكثر تحركاً" : "Top Movers"}
                items={data?.topMovers ?? []}
                loading={isLoading}
                getName={getName}
              />
            )}
          </>
        )}

        {/* My Gold Holdings */}
        {data?.myGold && data.myGold.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">
                {isAr ? "ذهبي" : "My Gold"}
              </h2>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={isAr ? "بحث..." : "Filter..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500 w-28 sm:w-40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.myGold
                .filter((g) => g.categoryId.toLowerCase().includes(search.toLowerCase()))
                .map((mg) => {
                  const qty = parseFloat(mg.totalQuantity);
                  const avgPrice = parseFloat(mg.averagePrice);
                  const currentPrice = mg.currentSellPrice ?? avgPrice;
                  const pnl = (currentPrice - avgPrice) * qty;
                  const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
                  const isPos = pnl >= 0;
                  const catInfo = data.categories.find((c) => c.categoryId === mg.categoryId);
                  return (
                    <Link key={mg.categoryId} href={`/gold/${mg.categoryId}`}>
                      <div className="td-hover-card bg-gray-900 rounded-xl p-3 sm:p-4 space-y-1.5 border border-gray-800 hover:border-amber-800/50 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-300 text-sm sm:text-base">
                            {catInfo ? getName(catInfo) : mg.categoryId}
                          </span>
                          <span className={`text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {isPos ? "+" : "−"}{Math.abs(pnlPct).toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold text-white">{currentPrice.toLocaleString()} EGP</p>
                        <p className="text-gray-500 text-xs truncate">
                          {qty}g · {isAr ? "متوسط" : "Avg"} {avgPrice.toLocaleString()} EGP
                        </p>
                        <p className={`text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {isPos ? "+" : "−"}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP
                        </p>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {!isLoading && !isError && (!data?.myGold || data.myGold.length === 0) && (
          <div className="text-center py-12 text-gray-600 text-sm">
            {isAr ? "لا تملك ذهب بعد." : "No gold positions yet."}{" "}
            <Link href="/gold/GOLD_21K" className="text-amber-400 hover:text-amber-300">
              {isAr ? "تصفح أسعار الذهب" : "Browse gold prices"}
            </Link>
          </div>
        )}
      </main>
    </AppShell>
  );
}

function GoldSection({
  title,
  items,
  loading,
  getName,
}: {
  title: string;
  items: GoldCategoryItem[];
  loading: boolean;
  getName: (item: GoldCategoryItem) => string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-4 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const isPos = item.changePercent >= 0;
          const spread = item.buyPrice && item.sellPrice
            ? ((item.buyPrice - item.sellPrice) / item.sellPrice * 100).toFixed(1)
            : null;

          return (
            <Link key={item.categoryId} href={`/gold/${item.categoryId}`}>
              <div className="td-hover-card bg-gray-900 rounded-xl p-4 space-y-2 border border-gray-800 hover:border-amber-800/50 transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-500" />
                    <span className="font-bold text-amber-300 text-base sm:text-sm">{getName(item)}</span>
                  </div>
                  {item.changePercent !== 0 && (
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                      {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {isPos ? "+" : "−"}{Math.abs(item.changePercent).toFixed(2)}%
                    </span>
                  )}
                </div>

                {item.sellPrice != null && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sell</span>
                      <span className="text-white font-semibold text-base sm:text-sm">
                        {item.sellPrice.toLocaleString()} EGP
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Buy</span>
                      <span className="text-gray-300 text-sm">
                        {item.buyPrice?.toLocaleString()} EGP
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xs text-gray-600">
                  <span>/{item.unit}</span>
                  {spread && <span>Spread: {spread}%</span>}
                </div>

                {item.lastUpdate && (
                  <p className="text-gray-700 text-xs">{new Date(item.lastUpdate).toLocaleTimeString()}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
