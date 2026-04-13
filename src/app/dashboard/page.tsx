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
            />
            <StatCard
              label={t("dashboard.totalPnl")}
              value={`${portfolio.totalPnl >= 0 ? "+" : "−"}$${Math.abs(portfolio.totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
              positive={portfolio.totalPnl >= 0}
            />
            <StatCard
              label={t("dashboard.pnlPct")}
              value={`${portfolio.totalPnlPercent >= 0 ? "+" : "−"}${Math.abs(portfolio.totalPnlPercent).toFixed(2)}%`}
              positive={portfolio.totalPnlPercent >= 0}
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
          <div className="flex flex-col items-center gap-2 py-10 bg-gray-900/60 border border-amber-900/40 rounded-xl">
            <span className="text-amber-400 text-sm font-medium">{t("dashboard.failed")}</span>
            <span className="text-gray-600 text-xs">{t("dashboard.checkConn")}</span>
          </div>
        ) : (
          <>
            <Section title={t("dashboard.hottest")} stocks={dashData?.hottest ?? []} loading={dashLoading} prices={prices} />
            <Section title={t("dashboard.recommended")} stocks={dashData?.recommended ?? []} loading={dashLoading} prices={prices} />
            <Section title={t("dashboard.lowest")} stocks={dashData?.lowest ?? []} loading={dashLoading} prices={prices} />
          </>
        )}

        {/* My Stocks — from /stocks/dashboard myStocks (JWT-authenticated) */}
        {dashData?.myStocks && dashData.myStocks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">{t("dashboard.myStocks")}</h2>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={t("dashboard.filter")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500 w-28 sm:w-40"
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
                      <div className="td-hover-card bg-gray-900 rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm sm:text-base">{ms.symbol}</span>
                          <span className={`text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                            {isPos ? "+" : "−"}{Math.abs(pnlPct).toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold">${currentPrice.toFixed(2)}</p>
                        <p className="text-gray-500 text-xs truncate">{qty} {t("dashboard.shares")} · {t("dashboard.avg")} ${avgPrice.toFixed(2)}</p>
                        <p className={`text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {isPos ? "+" : "−"}${Math.abs(pnl).toFixed(2)} {t("dashboard.unrealizedLabel")}
                        </p>
                        {live && <p className="text-gray-600 text-xs">{new Date(live.timestamp).toLocaleTimeString()}</p>}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {!dashLoading && !dashError && (!dashData?.myStocks || dashData.myStocks.length === 0) && (
          <EmptyState
            icon={BarChart2}
            title={t("dashboard.noPositions")}
            description={t("dashboard.browseStocks")}
            action={
              <Link href="/stocks/COMI" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors btn-ripple">
                {t("dashboard.browseStocks")}
              </Link>
            }
          />
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

function StatCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-4">
      <p className="text-gray-500 text-sm sm:text-xs mb-0.5 sm:mb-1 truncate">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold truncate ${positive === undefined ? "text-white" : positive ? "text-emerald-400" : "text-red-400"}`}>
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  stocks,
  loading,
  prices,
}: {
  title: string;
  stocks: DashboardStock[];
  loading: boolean;
  prices: Record<string, PriceData>;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">{title}</h2>
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
      <h2 className="text-gray-400 text-base sm:text-xs font-semibold uppercase tracking-widest">{title}</h2>
      <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {stocks.map((stock) => {
          const live = prices[stock.symbol];
          const price = live?.price ?? stock.price;
          const change = live?.changePercent ?? stock.changePercent ?? null;
          const isPos = (change ?? 0) >= 0;

          return (
            <Link key={stock.symbol} href={`/stocks/${stock.symbol}`}>
              <div className="td-hover-card bg-gray-900 rounded-xl p-4 space-y-1 animate-card-enter-stagger" style={{ "--delay": stocks.indexOf(stock) } as React.CSSProperties}>
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
