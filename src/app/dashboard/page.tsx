"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Search, LineChart, ShieldAlert, Lightbulb, ArrowUpRight, ArrowDownRight, BarChart2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";
import { usePriceStream, type PriceData } from "@/hooks/usePriceStream";
import PriceFreshnessBanner from "@/components/PriceFreshnessBanner";
import MarketStatusBar from "@/components/MarketStatusBar";
import AppShell from "@/components/AppShell";
import GoldDashboard from "@/components/GoldDashboard";
import WeeklyPicksSection from "@/features/recommendations/WeeklyPicksSection";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { useTradingMode } from "@/store/useTradingMode";

/* ─── SVG Stock Illustrations ────────────────────────────────────────────── */

function StockChartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="chartLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <path d="M10 14 H54" stroke="#334155" strokeWidth="0.5" />
      <path d="M10 26 H54" stroke="#334155" strokeWidth="0.5" />
      <path d="M10 38 H54" stroke="#334155" strokeWidth="0.5" />
      <path d="M10 50 H54" stroke="#334155" strokeWidth="0.5" />
      {/* Area fill */}
      <path d="M10 42 L18 36 L26 40 L34 24 L42 28 L50 16 L54 18 V50 H10 Z" fill="url(#chartFill)" />
      {/* Chart line */}
      <path d="M10 42 L18 36 L26 40 L34 24 L42 28 L50 16 L54 18" stroke="url(#chartLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      <circle cx="34" cy="24" r="2.5" fill="#60a5fa" />
      <circle cx="50" cy="16" r="2.5" fill="#93c5fd" />
      <circle cx="50" cy="16" r="5" fill="#3b82f6" opacity="0.2" />
    </svg>
  );
}

function StockBullIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="bullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Up arrow body */}
      <path d="M32 8 L44 24 H38 V48 H26 V24 H20 Z" fill="url(#bullGrad)" />
      {/* Glow */}
      <path d="M32 8 L44 24 H38 V48 H26 V24 H20 Z" fill="#34d399" opacity="0.15" />
      {/* Bars at bottom */}
      <rect x="16" y="52" width="8" height="4" rx="1" fill="#10b981" opacity="0.4" />
      <rect x="28" y="52" width="8" height="4" rx="1" fill="#10b981" opacity="0.6" />
      <rect x="40" y="52" width="8" height="4" rx="1" fill="#10b981" opacity="0.8" />
    </svg>
  );
}

function StockBearIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="bearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Down arrow body */}
      <path d="M32 56 L44 40 H38 V16 H26 V40 H20 Z" fill="url(#bearGrad)" />
      {/* Bars at top */}
      <rect x="16" y="8" width="8" height="4" rx="1" fill="#ef4444" opacity="0.8" />
      <rect x="28" y="8" width="8" height="4" rx="1" fill="#ef4444" opacity="0.6" />
      <rect x="40" y="8" width="8" height="4" rx="1" fill="#ef4444" opacity="0.4" />
    </svg>
  );
}

function StockCandleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="candleGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="candleRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="candleBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Candle 1 - green */}
      <line x1="14" y1="10" x2="14" y2="54" stroke="#059669" strokeWidth="1.5" />
      <rect x="9" y="20" width="10" height="22" rx="1.5" fill="url(#candleGreen)" />
      {/* Candle 2 - red */}
      <line x1="28" y1="14" x2="28" y2="50" stroke="#dc2626" strokeWidth="1.5" />
      <rect x="23" y="18" width="10" height="20" rx="1.5" fill="url(#candleRed)" />
      {/* Candle 3 - blue (current) */}
      <line x1="42" y1="8" x2="42" y2="46" stroke="#3b82f6" strokeWidth="1.5" />
      <rect x="37" y="14" width="10" height="24" rx="1.5" fill="url(#candleBlue)" />
      {/* Candle 4 - green */}
      <line x1="56" y1="12" x2="56" y2="48" stroke="#059669" strokeWidth="1.5" />
      <rect x="51" y="16" width="10" height="18" rx="1.5" fill="url(#candleGreen)" />
      {/* Glow on blue candle */}
      <rect x="37" y="14" width="10" height="24" rx="1.5" fill="#60a5fa" opacity="0.15" />
    </svg>
  );
}

function StockPieIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <defs>
        <linearGradient id="pieBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="piePurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="pieCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {/* Pie segments */}
      <path d="M32 8 A24 24 0 0 1 56 32 L32 32 Z" fill="url(#pieBlue)" />
      <path d="M56 32 A24 24 0 0 1 20 52.8 L32 32 Z" fill="url(#piePurple)" />
      <path d="M20 52.8 A24 24 0 0 1 8 32 L32 32 Z" fill="url(#pieCyan)" />
      <path d="M8 32 A24 24 0 0 1 32 8 L32 32 Z" fill="#1e40af" />
      {/* Center circle */}
      <circle cx="32" cy="32" r="10" fill="#0f172a" />
      <circle cx="32" cy="32" r="8" fill="none" stroke="#334155" strokeWidth="0.5" />
      {/* Shine */}
      <path d="M32 8 A24 24 0 0 1 48 14" stroke="#93c5fd" strokeWidth="1" fill="none" opacity="0.4" />
    </svg>
  );
}

function getStockSectionIllustration(sectionType: "hottest" | "recommended" | "lowest" | "myStocks"): React.ReactNode {
  switch (sectionType) {
    case "hottest": return <StockBullIcon className="w-5 h-5" />;
    case "recommended": return <StockCandleIcon className="w-5 h-5" />;
    case "lowest": return <StockBearIcon className="w-5 h-5" />;
    case "myStocks": return <StockPieIcon className="w-5 h-5" />;
  }
}

interface DashboardStock {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  lastUpdate?: string;

  marketCap?: number;
  pe?: number;
}

interface MyStockItem {
  symbol: string;
  totalQuantity: string | number;
  averagePrice: string | number;
  totalInvested: string | number;
  price?: number;
}

interface DashboardData {
  hottest: DashboardStock[];
  recommended: DashboardStock[];
  lowest: DashboardStock[];
  myStocks?: MyStockItem[];
}

interface RecentTransaction {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  total?: number;
  createdAt: string;
}

function useDashboardStocks() {
  return useQuery<DashboardData>({
    queryKey: ["stocks", "dashboard"],
    queryFn: () => apiClient.get<DashboardData>("/api/stocks/dashboard"),
    retry: 1,
  });
}

function useRecentTransactions() {
  return useQuery<{ transactions: RecentTransaction[] }>({
    queryKey: ["portfolio", "transactions", "recent"],
    queryFn: () => apiClient.get<{ transactions: RecentTransaction[] }>("/api/portfolio/transactions?limit=3&sort=desc"),
    retry: 1,
  });
}

export default function DashboardOverview() {
  const { mode } = useTradingMode();
  if (mode === "GOLD") return <GoldDashboard />;
  return <StocksDashboard />;
}

function StocksDashboard() {
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const { data: dashData, isLoading: dashLoading, isError: dashError } = useDashboardStocks();
  const { data: portfolio } = usePortfolio();
  const { data: recentTxData } = useRecentTransactions();

  // Stream only owned symbols — streaming all dashboard stocks (20-30+) saturates
  // the browser HTTP connection pool and blocks navigation clicks.
  const myStocksSymbols = (dashData?.myStocks ?? []).map((s) => s.symbol);
  const portfolioSymbols = (portfolio?.positions ?? []).map((p) => p.symbol);
  const ownedSymbols = [...new Set([...myStocksSymbols, ...portfolioSymbols])];
  const allSymbols = ownedSymbols;

  const { prices, loading: priceLoading } = usePriceStream(ownedSymbols);

  return (
    <AppShell>
      <MarketStatusBar />
      <PriceFreshnessBanner prices={prices} symbols={allSymbols} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {portfolio && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard
              label={t("dashboard.portfolioVal")}
              value={`$${portfolio.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              icon={<StockPieIcon className="w-8 h-8 opacity-40" />}
            />
            <StatCard
              label={t("dashboard.totalPnl")}
              value={`${portfolio.totalPnl >= 0 ? "+" : "−"}$${Math.abs(portfolio.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              positive={portfolio.totalPnl >= 0}
              icon={portfolio.totalPnl >= 0 ? <StockBullIcon className="w-8 h-8 opacity-40" /> : <StockBearIcon className="w-8 h-8 opacity-40" />}
            />
            <StatCard
              label={t("dashboard.pnlPct")}
              value={`${portfolio.totalPnlPercent >= 0 ? "+" : "−"}${Math.abs(portfolio.totalPnlPercent).toFixed(2)}%`}
              positive={portfolio.totalPnlPercent >= 0}
              icon={<StockChartIcon className="w-8 h-8 opacity-40" />}
            />
          </div>
        )}

        {/* Quick Access — mobile only (these pages are hidden from mobile bottom nav) */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <Link href="/analytics">
            <div className="bg-gray-900 rounded-xl p-3 flex flex-col items-center gap-1.5">
              <LineChart size={20} className="text-blue-400" />
              <span className="text-base text-gray-300 font-medium">{t("nav.analytics")}</span>
            </div>
          </Link>
          <Link href="/analytics/risk">
            <div className="bg-gray-900 rounded-xl p-3 flex flex-col items-center gap-1.5">
              <ShieldAlert size={20} className="text-amber-400" />
              <span className="text-base text-gray-300 font-medium">{t("nav.risk")}</span>
            </div>
          </Link>
          <Link href="/strategies">
            <div className="bg-gray-900 rounded-xl p-3 flex flex-col items-center gap-1.5">
              <Lightbulb size={20} className="text-emerald-400" />
              <span className="text-base text-gray-300 font-medium">{t("nav.strategies")}</span>
            </div>
          </Link>
        </div>

        {/* Recent Transactions */}
        {recentTxData?.transactions && recentTxData.transactions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">{t("dashboard.recentTx") ?? "Recent Transactions"}</h2>
              <Link href="/portfolio/transactions" className="text-base sm:text-xs text-blue-400 hover:text-blue-300 font-medium">
                {t("common.viewAll") ?? "View All"}
              </Link>
            </div>
            <div className="bg-gray-900 rounded-xl divide-y divide-gray-800">
              {recentTxData.transactions.slice(0, 3).map((tx) => {
                const isBuy = tx.type === "BUY";
                const total = Number(tx.total ?? tx.price * tx.quantity);
                return (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isBuy ? "bg-emerald-900/40" : "bg-orange-900/40"}`}>
                        {isBuy ? <ArrowDownRight size={14} className="text-emerald-400" /> : <ArrowUpRight size={14} className="text-orange-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/stocks/${tx.symbol}`} className="text-white font-bold text-base sm:text-base hover:text-blue-400 transition-colors">{tx.symbol}</Link>
                          <span className={`text-sm sm:text-xs font-bold px-1.5 py-0.5 rounded ${isBuy ? "bg-emerald-900/50 text-emerald-400" : "bg-orange-900/50 text-orange-400"}`}>
                            {tx.type}
                          </span>
                        </div>
                        <p className="text-gray-500 text-base sm:text-xs">{tx.quantity} shares @ ${Number(tx.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-lg sm:text-sm font-medium">${total.toFixed(2)}</p>
                      <p className="text-gray-600 text-base sm:text-xs">{new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Weekly Recommendations */}
        <WeeklyPicksSection />

        {dashError ? (
          <div className="flex flex-col items-center gap-3 py-14 bg-gradient-to-b from-gray-900 to-gray-950 border border-red-900/30 rounded-2xl">
            <StockBearIcon className="w-16 h-16 opacity-40" />
            <span className="text-red-400 text-sm font-medium">{t("dashboard.failed")}</span>
            <span className="text-gray-600 text-xs">{t("dashboard.checkConn")}</span>
          </div>
        ) : (
          <>
            <Section title={t("dashboard.hottest")} stocks={dashData?.hottest ?? []} loading={dashLoading} prices={prices} sectionType="hottest" />
            <Section title={t("dashboard.recommended")} stocks={dashData?.recommended ?? []} loading={dashLoading} prices={prices} sectionType="recommended" />
            <Section title={t("dashboard.lowest")} stocks={dashData?.lowest ?? []} loading={dashLoading} prices={prices} sectionType="lowest" />
          </>
        )}

        {/* My Stocks — from /stocks/dashboard myStocks (JWT-authenticated) */}
        {dashData?.myStocks && dashData.myStocks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
                <StockPieIcon className="w-5 h-5" />
                {t("dashboard.myStocks")}
              </h2>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={t("dashboard.filter")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gray-800/80 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50 w-28 sm:w-40 border border-gray-700/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 gap-3">
              {dashData.myStocks
                .filter((s) => s.symbol.toLowerCase().includes(search.toLowerCase()))
                .map((ms) => {
                  const qty = parseFloat(String(ms.totalQuantity));
                  const avgPrice = parseFloat(String(ms.averagePrice));
                  const live = prices[ms.symbol];
                  const currentPrice = live?.price ?? ms.price ?? avgPrice;
                  const pnl = (currentPrice - avgPrice) * qty;
                  const pnlPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
                  const isPos = pnl >= 0;
                  return (
                    <Link key={ms.symbol} href={`/stocks/${ms.symbol}`}>
                      <div className="group relative bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/20 rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2 border border-gray-800/50 hover:border-blue-700/30 transition-all duration-300 overflow-hidden">
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        {/* PnL-colored corner glow */}
                        <div className={`absolute -top-8 -right-8 w-20 h-20 rounded-full blur-xl transition-colors duration-500 ${isPos ? "bg-emerald-500/[0.05] group-hover:bg-emerald-500/[0.1]" : "bg-red-500/[0.05] group-hover:bg-red-500/[0.1]"}`} />

                        <div className="relative">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-sm sm:text-base">{ms.symbol}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPos ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
                              {isPos ? "+" : "−"}{Math.abs(pnlPct).toFixed(2)}%
                            </span>
                          </div>
                          <p className="text-lg sm:text-2xl font-bold text-white">${currentPrice.toFixed(2)}</p>
                          <p className="text-gray-500 text-xs truncate">{qty} {t("dashboard.shares")} · {t("dashboard.avg")} ${avgPrice.toFixed(2)}</p>
                          <p className={`text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {isPos ? "+" : "−"}${Math.abs(pnl).toFixed(2)} {t("dashboard.unrealizedLabel")}
                          </p>
                          {live && <p className="text-gray-600 text-xs">{new Date(live.timestamp).toLocaleTimeString()}</p>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {!dashLoading && !dashError && (!dashData?.myStocks || dashData.myStocks.length === 0) && (
          <div className="flex flex-col items-center gap-4 py-16">
            <StockChartIcon className="w-20 h-20 opacity-30" />
            <p className="text-gray-400 text-sm font-medium">{t("dashboard.noPositions")}</p>
            <Link href="/stocks/COMI" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm rounded-xl transition-all duration-200">
              {t("dashboard.browseStocks")}
            </Link>
          </div>
        )}
      </main>

      {priceLoading && allSymbols.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 right-4 bg-gray-800 text-gray-400 text-xs px-3 py-2 rounded-lg animate-pulse">
          {t("dashboard.connecting")}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ label, value, positive, icon }: { label: string; value: string; positive?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="group relative bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/20 rounded-xl p-3 sm:p-4 border border-gray-800/50 hover:border-blue-800/30 transition-all duration-300 overflow-hidden">
      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      {icon && <div className="absolute top-2 right-2 sm:top-3 sm:right-3">{icon}</div>}
      <div className="relative">
        <p className="text-gray-500 text-sm sm:text-xs mb-0.5 sm:mb-1 truncate">{label}</p>
        <p className={`text-xl sm:text-2xl font-bold truncate ${positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  stocks,
  loading,
  prices,
  sectionType = "hottest",
}: {
  title: string;
  stocks: DashboardStock[];
  loading: boolean;
  prices: Record<string, PriceData>;
  sectionType?: "hottest" | "recommended" | "lowest" | "myStocks";
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
          {getStockSectionIllustration(sectionType)}
          {title}
        </h2>
        <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (stocks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest flex items-center gap-2">
        {getStockSectionIllustration(sectionType)}
        {title}
      </h2>
      <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stocks.map((stock, idx) => {
          const live = prices[stock.symbol];
          const price = live?.price ?? stock.price;
          const change = live?.changePercent ?? stock.changePercent ?? null;
          const isPos = (change ?? 0) >= 0;

          return (
            <Link key={stock.symbol} href={`/stocks/${stock.symbol}`}>
              <div className="group relative bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/15 rounded-xl p-4 space-y-1 border border-gray-800/50 hover:border-blue-700/30 transition-all duration-300 overflow-hidden animate-card-enter-stagger" style={{ "--delay": idx } as React.CSSProperties}>
                {/* Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {/* Corner glow */}
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-blue-500/[0.04] rounded-full blur-xl group-hover:bg-blue-500/[0.08] transition-colors duration-500" />

                <div className="relative">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-lg sm:text-sm">{stock.symbol}</span>
                    {change != null && (
                      <span className={`text-base sm:text-xs font-medium flex items-center gap-0.5 ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                        {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isPos ? "+" : "−"}{Math.abs(change).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {price != null && <p className="text-2xl sm:text-lg font-bold">${price.toFixed(2)}</p>}
                  {stock.name && <p className="text-gray-500 text-base sm:text-xs truncate">{stock.name}</p>}
                  {live && <p className="text-gray-700 text-base sm:text-xs">{new Date(live.timestamp).toLocaleTimeString()}</p>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
