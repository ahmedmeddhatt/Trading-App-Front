"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Search, RefreshCw } from "lucide-react";
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

/* ─── SVG Illustrations ───────────────────────────────────────────────────── */

function GoldBarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="goldBar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="goldBarTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="goldBarSide" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* Front face */}
      <path d="M8 42 L20 26 L44 26 L56 42 L8 42Z" fill="url(#goldBar)" />
      {/* Top face */}
      <path d="M20 26 L28 18 L52 18 L44 26 Z" fill="url(#goldBarTop)" />
      {/* Right face */}
      <path d="M44 26 L52 18 L56 28 L56 42 Z" fill="url(#goldBarSide)" />
      {/* Shine line */}
      <path d="M22 30 L40 30" stroke="#fde68a" strokeWidth="1" opacity="0.6" />
      <path d="M14 38 L50 38" stroke="#92400e" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}

function GoldCoinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="coinFace" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="30%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="coinEdge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      {/* Coin edge (3D) */}
      <ellipse cx="32" cy="36" rx="22" ry="6" fill="url(#coinEdge)" />
      {/* Coin face */}
      <ellipse cx="32" cy="32" rx="22" ry="22" fill="url(#coinFace)" />
      {/* Inner circle */}
      <ellipse cx="32" cy="32" rx="16" ry="16" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5" />
      {/* Pound sign */}
      <text x="32" y="38" textAnchor="middle" fill="#92400e" fontSize="18" fontWeight="bold" opacity="0.6">£</text>
      {/* Shine */}
      <ellipse cx="24" cy="24" rx="4" ry="6" fill="#fef3c7" opacity="0.4" transform="rotate(-30 24 24)" />
    </svg>
  );
}

function GoldStackIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="stackBar1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="stackBar2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="stackBar3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Bottom bar */}
      <path d="M6 50 L16 40 L48 40 L58 50 Z" fill="url(#stackBar1)" />
      <path d="M16 40 L22 34 L54 34 L48 40 Z" fill="#fde68a" opacity="0.7" />
      <path d="M48 40 L54 34 L58 38 L58 50 Z" fill="#b45309" />
      {/* Middle bar */}
      <path d="M10 42 L20 32 L44 32 L54 42 Z" fill="url(#stackBar2)" />
      <path d="M20 32 L26 26 L50 26 L44 32 Z" fill="#fef3c7" opacity="0.7" />
      <path d="M44 32 L50 26 L54 30 L54 42 Z" fill="#d97706" />
      {/* Top bar */}
      <path d="M14 34 L24 24 L40 24 L50 34 Z" fill="url(#stackBar3)" />
      <path d="M24 24 L30 18 L46 18 L40 24 Z" fill="#fef9c3" opacity="0.8" />
      <path d="M40 24 L46 18 L50 22 L50 34 Z" fill="#f59e0b" />
    </svg>
  );
}

function GoldRingIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="ringOuter" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      {/* Outer ring */}
      <ellipse cx="32" cy="34" rx="22" ry="18" fill="none" stroke="url(#ringOuter)" strokeWidth="6" />
      {/* Inner highlight */}
      <ellipse cx="32" cy="34" rx="22" ry="18" fill="none" stroke="#fde68a" strokeWidth="1" opacity="0.4" />
      {/* Gem */}
      <circle cx="32" cy="16" r="5" fill="#fbbf24" />
      <circle cx="32" cy="16" r="3" fill="#fef3c7" opacity="0.6" />
      {/* Shine */}
      <path d="M18 26 Q 22 22, 26 24" stroke="#fef3c7" strokeWidth="1.5" fill="none" opacity="0.5" />
    </svg>
  );
}

/* Pick an illustration based on categoryId */
function getGoldIllustration(categoryId: string): React.ReactNode {
  const id = categoryId.toUpperCase();
  if (id.includes("POUND") || id.includes("COIN") || id.includes("GUINEA"))
    return <GoldCoinIcon className="w-10 h-10 sm:w-12 sm:h-12" />;
  if (id.includes("OUNCE") || id.includes("OZ"))
    return <GoldStackIcon className="w-10 h-10 sm:w-12 sm:h-12" />;
  if (id.includes("18") || id.includes("RING") || id.includes("JEWELRY"))
    return <GoldRingIcon className="w-10 h-10 sm:w-12 sm:h-12" />;
  return <GoldBarIcon className="w-10 h-10 sm:w-12 sm:h-12" />;
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */

export default function GoldDashboard() {
  const [search, setSearch] = useState("");
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const queryClient = useQueryClient();

  // On first mount, fix any GOLD_ positions/transactions incorrectly saved as STOCK
  useEffect(() => {
    fetch("/api/portfolio/fix-asset-types", { method: "POST" })
      .then(() => {
        // Invalidate portfolio queries so they re-fetch with correct assetType data
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      })
      .catch(() => {/* silent — non-critical */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, isError, isFetching, refetch } = useGoldDashboard();
  const getName = (item: GoldCategoryItem) => isAr ? item.nameAr : item.nameEn;

  return (
    <AppShell>
      {/* Gold price header bar */}
      {data?.categories?.[0]?.source && (
        <div className="bg-amber-50 dark:bg-gradient-to-r dark:from-amber-950/60 dark:via-amber-900/30 dark:to-amber-950/60 border-b border-amber-200 dark:border-amber-800/30 px-3 py-1.5 flex items-center justify-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400/90 text-xs font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse shrink-0" />
            {data.categories[0].source}
            {data.categories[0].lastUpdate && (
              <span className="text-amber-600/70 dark:text-amber-500/70 whitespace-nowrap">
                · {new Date(data.categories[0].lastUpdate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </span>
            )}
          </span>
          {data.categories[0].globalSpotUsd && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold whitespace-nowrap">
              <span className="text-amber-600 dark:text-amber-500 font-normal text-[10px]">XAU/USD</span>
              ${data.categories[0].globalSpotUsd.toLocaleString()}
            </span>
          )}
          <button
            onClick={async () => {
              try { await fetch("/api/gold/refresh", { method: "POST" }); } catch {}
              refetch();
            }}
            disabled={isFetching}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 disabled:opacity-50 transition-colors p-1 rounded-md hover:bg-amber-500/10"
            title="Refresh prices"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-8">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-16 bg-gray-50 dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-950 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
            <GoldBarIcon className="w-16 h-16 opacity-40" />
            <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">Failed to load gold prices</span>
            <span className="text-gray-400 dark:text-gray-600 text-xs">Check your connection and try again</span>
          </div>
        ) : (
          <>
            {/* Popular Categories */}
            <GoldShowcase
              title={isAr ? "الأكثر تداولاً" : "Most Popular"}
              items={data?.popular ?? []}
              loading={isLoading}
              getName={getName}
              featured
            />

            {/* All Categories */}
            <GoldGrid
              title={isAr ? "جميع الأعيرة" : "All Categories"}
              items={data?.categories ?? []}
              loading={isLoading}
              getName={getName}
            />

            {/* Top Movers */}
            {(data?.topMovers?.length ?? 0) > 0 && (
              <GoldGrid
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GoldStackIcon className="w-6 h-6" />
                <h2 className="text-amber-700 dark:text-amber-300/80 text-sm font-semibold uppercase tracking-widest">
                  {isAr ? "ذهبي" : "My Gold"}
                </h2>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder={isAr ? "بحث..." : "Filter..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gray-100 dark:bg-gray-800/80 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500/50 w-28 sm:w-40 border border-gray-200 dark:border-gray-700/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.myGold
                .filter((g) => g.categoryId.toLowerCase().includes(search.toLowerCase()))
                .map((mg) => {
                  const qty = parseFloat(mg.totalQuantity);
                  const avgPrice = parseFloat(mg.averagePrice);
                  const currentPrice = mg.currentSellPrice ?? avgPrice;
                  const pnl = (currentPrice - avgPrice) * qty;
                  const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
                  const isPos = pnl >= 0;
                  const totalValue = currentPrice * qty;
                  const catInfo = data.categories.find((c) => c.categoryId === mg.categoryId);
                  return (
                    <Link key={mg.categoryId} href={`/gold/${mg.categoryId}`}>
                      <div className="group relative bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-amber-950/20 rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/20 hover:border-amber-400/60 dark:hover:border-amber-600/40 hover:shadow-lg hover:shadow-amber-100 dark:hover:shadow-amber-900/10 transition-all duration-300 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                        <div className="relative">
                          {/* Header row */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="shrink-0 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                              {getGoldIllustration(mg.categoryId)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-amber-700 dark:text-amber-200 font-bold text-sm leading-tight truncate">
                                  {catInfo ? getName(catInfo) : mg.categoryId}
                                </h3>
                                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${isPos ? "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/40 text-red-500 dark:text-red-400"}`}>
                                  {isPos ? "+" : "−"}{Math.abs(pnlPct).toFixed(2)}%
                                </span>
                              </div>
                              <p className="text-gray-500 dark:text-gray-500 text-xs mt-0.5">{qty}g @ {avgPrice.toLocaleString()} EGP</p>
                            </div>
                          </div>

                          {/* Value row */}
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">Market Value</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                                {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal ml-1">EGP</span>
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                              {isPos ? "+" : "−"}{Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {!isLoading && !isError && (!data?.myGold || data.myGold.length === 0) && (
          <div className="flex flex-col items-center gap-4 py-16">
            <GoldBarIcon className="w-20 h-20 opacity-30" />
            <p className="text-gray-500 text-sm">
              {isAr ? "لا تملك ذهب بعد." : "No gold positions yet."}
            </p>
            <Link href="/gold/GOLD_21K" className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-semibold text-sm rounded-xl transition-all duration-200">
              {isAr ? "تصفح أسعار الذهب" : "Browse Gold Prices"}
            </Link>
          </div>
        )}
      </main>
    </AppShell>
  );
}

/* ─── Featured showcase (popular items — larger cards) ─────────────────── */

function GoldShowcase({
  title,
  items,
  loading,
  getName,
  featured,
}: {
  title: string;
  items: GoldCategoryItem[];
  loading: boolean;
  getName: (item: GoldCategoryItem) => string;
  featured?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-amber-700 dark:text-amber-300/80 text-sm font-semibold uppercase tracking-widest">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-900 rounded-2xl h-44 animate-pulse border border-gray-200 dark:border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-amber-700 dark:text-amber-300/80 text-sm font-semibold uppercase tracking-widest flex items-center gap-2">
        <GoldBarIcon className="w-5 h-5" />
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, idx) => {
          const isPos = item.changePercent >= 0;
          const spread = item.buyPrice && item.sellPrice
            ? ((item.buyPrice - item.sellPrice) / item.sellPrice * 100).toFixed(1)
            : null;

          return (
            <Link key={item.categoryId} href={`/gold/${item.categoryId}`}>
              <div
                className="group relative bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900/95 dark:to-amber-950/30 rounded-2xl p-4 sm:p-5 border border-amber-200/60 dark:border-amber-900/20 hover:border-amber-400 dark:hover:border-amber-600/40 hover:shadow-xl hover:shadow-amber-100/80 dark:hover:shadow-amber-900/20 transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/[0.06] rounded-full blur-2xl group-hover:bg-amber-500/[0.1] transition-colors duration-500" />

                <div className="relative flex items-start gap-4">
                  <div className="shrink-0 p-2.5 bg-amber-50 dark:bg-gradient-to-br dark:from-amber-500/15 dark:to-amber-600/5 rounded-xl group-hover:bg-amber-100 dark:group-hover:from-amber-500/25 dark:group-hover:to-amber-600/10 transition-colors duration-300">
                    {getGoldIllustration(item.categoryId)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-amber-700 dark:text-amber-200 font-bold text-base truncate">{getName(item)}</h3>
                      {item.changePercent !== 0 && (
                        <span className={`text-xs font-bold flex items-center gap-0.5 px-2.5 py-1 rounded-full ${isPos ? "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/40 text-red-500 dark:text-red-400"}`}>
                          {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isPos ? "+" : "−"}{Math.abs(item.changePercent).toFixed(2)}%
                        </span>
                      )}
                    </div>

                    {item.sellPrice != null && (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{item.sellPrice.toLocaleString()}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">EGP</span>
                          <span className="text-xs text-gray-400 dark:text-gray-600">sell</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <span>Buy: <span className="text-gray-600 dark:text-gray-400">{item.buyPrice?.toLocaleString()} EGP</span></span>
                          {spread && <span className="text-amber-600 dark:text-amber-600">Spread {spread}%</span>}
                          <span>/{item.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Standard grid (all categories, top movers) ───────────────────────── */

function GoldGrid({
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
      <div className="space-y-4">
        <h2 className="text-amber-700 dark:text-amber-300/80 text-sm font-semibold uppercase tracking-widest">{title}</h2>
        <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-900 rounded-xl h-36 animate-pulse border border-gray-200 dark:border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-amber-300/80 text-sm font-semibold uppercase tracking-widest">{title}</h2>
      <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const isPos = item.changePercent >= 0;
          const spread = item.buyPrice && item.sellPrice
            ? ((item.buyPrice - item.sellPrice) / item.sellPrice * 100).toFixed(1)
            : null;

          return (
            <Link key={item.categoryId} href={`/gold/${item.categoryId}`}>
              <div className="group relative bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-800/40 hover:shadow-md hover:shadow-amber-50 dark:hover:shadow-none transition-all duration-200 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="shrink-0">
                        {getGoldIllustration(item.categoryId)}
                      </div>
                      <span className="font-bold text-amber-700 dark:text-amber-200 text-sm truncate">{getName(item)}</span>
                    </div>
                    {item.changePercent !== 0 && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                        {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isPos ? "+" : "−"}{Math.abs(item.changePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>

                  {item.sellPrice != null && (
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-bold text-gray-900 dark:text-white">{item.sellPrice.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">EGP</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600">
                        <span>Buy: {item.buyPrice?.toLocaleString()}</span>
                        {spread && <span className="text-amber-600 dark:text-amber-700">{spread}%</span>}
                      </div>
                    </div>
                  )}

                  <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-700">/{item.unit}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
