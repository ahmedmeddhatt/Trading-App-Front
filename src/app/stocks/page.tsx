"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import AppShell from "@/components/AppShell";
import SignalBadge from "@/components/SignalBadge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard, SkeletonRow } from "@/components/ui/Skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { useTradingMode } from "@/store/useTradingMode";
import GoldListPage from "@/app/gold/page";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StockItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  marketCap?: number;
  pe?: number;
  recommendation?: string;
}

interface StocksResponse {
  stocks: StockItem[];
  total?: number;
  page?: number;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

const WATCHLIST_KEY = "tradedesk_watchlist";

function loadWatchlist(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveWatchlist(set: Set<string>) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...set]));
}

// ─── (Skeleton moved to @/components/ui/Skeleton) ───

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STOCKS_FILTER_KEY = "tradedesk_stocks_filter";

function saveFilters(q: string, minPE: string, maxPE: string, page: number) {
  try { sessionStorage.setItem(STOCKS_FILTER_KEY, JSON.stringify({ q, minPE, maxPE, page })); } catch {}
}

function loadFilters() {
  try {
    const raw = sessionStorage.getItem(STOCKS_FILTER_KEY);
    return raw ? JSON.parse(raw) as { q: string; minPE: string; maxPE: string; page: number } : null;
  } catch { return null; }
}

function StocksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise from URL first, then sessionStorage fallback
  const [search, setSearch] = useState(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl !== null) return fromUrl;
    return loadFilters()?.q ?? "";
  });
  const [minPE, setMinPE] = useState(() => {
    const fromUrl = searchParams.get("minPE");
    if (fromUrl !== null) return fromUrl;
    return loadFilters()?.minPE ?? "";
  });
  const [maxPE, setMaxPE] = useState(() => {
    const fromUrl = searchParams.get("maxPE");
    if (fromUrl !== null) return fromUrl;
    return loadFilters()?.maxPE ?? "";
  });
  const [page, setPage] = useState(() => {
    const fromUrl = searchParams.get("page");
    if (fromUrl !== null) return parseInt(fromUrl, 10);
    return loadFilters()?.page ?? 1;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Load watchlist from localStorage
  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  // Sync filters to URL + sessionStorage
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (minPE) params.set("minPE", minPE);
    if (maxPE) params.set("maxPE", maxPE);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `/stocks?${qs}` : "/stocks", { scroll: false });
    saveFilters(debouncedSearch, minPE, maxPE, page);
  }, [debouncedSearch, minPE, maxPE, page, router]);

  // Build query string for API
  const apiQuery = new URLSearchParams();
  if (debouncedSearch) apiQuery.set("search", debouncedSearch);
  if (minPE) apiQuery.set("minPE", minPE);
  if (maxPE) apiQuery.set("maxPE", maxPE);
  apiQuery.set("page", String(page));
  apiQuery.set("limit", String(PAGE_SIZE));

  const { data, isLoading, isError, refetch } = useQuery<StocksResponse>({
    queryKey: ["stocks", "list", apiQuery.toString()],
    queryFn: async () => {
      const raw = await apiClient.get<unknown>(`/api/stocks?${apiQuery.toString()}`);
      if (Array.isArray(raw)) return { stocks: raw as StockItem[], total: (raw as StockItem[]).length };
      if (raw && typeof raw === "object") {
        const obj = raw as Record<string, unknown>;
        // { stocks: [...] }
        if (Array.isArray(obj.stocks)) return { stocks: obj.stocks as StockItem[], total: (obj.total as number) ?? (obj.stocks as StockItem[]).length };
        // { data: [...] } — backend double-wraps
        if (Array.isArray(obj.data)) return { stocks: obj.data as StockItem[], total: (obj.total as number) ?? (obj.data as StockItem[]).length };
      }
      return { stocks: [], total: 0 };
    },
    retry: 1,
  });

  const stocks = data?.stocks ?? [];
  const total = data?.total ?? stocks.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = watchlistOnly
    ? stocks.filter((s) => watchlist.has(s.symbol))
    : [...stocks];
  const displayed = filtered.sort((a, b) => {
    const aIsAlpha = /^[a-zA-Z]/.test(a.symbol);
    const bIsAlpha = /^[a-zA-Z]/.test(b.symbol);
    if (aIsAlpha && !bIsAlpha) return -1;
    if (!aIsAlpha && bIsAlpha) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  // No SSE on the list page — 25 concurrent SSE connections saturate the browser
  // connection pool and block navigation. Static prices from the API are sufficient here.
  const prices: Record<string, import("@/hooks/usePriceStream").PriceData> = {};

  const toggleWatchlist = useCallback(
    (symbol: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setWatchlist((prev) => {
        const next = new Set(prev);
        if (next.has(symbol)) next.delete(symbol);
        else next.add(symbol);
        saveWatchlist(next);
        return next;
      });
    },
    []
  );

  const { t } = useLanguage();

  const clearFilters = () => {
    setSearch("");
    setMinPE("");
    setMaxPE("");
    setPage(1);
  };
  const hasFilters = !!(search || minPE || maxPE);

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder={t("stocks.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setWatchlistOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border active:scale-95 transition-all duration-150 ${
              watchlistOnly
                ? "bg-amber-600 border-amber-600 text-white hover:bg-amber-500"
                : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
            }`}
          >
            <Star size={14} />
            {t("stocks.watchlist")}
            {watchlist.size > 0 && (
              <span className="text-xs text-gray-400">({watchlist.size})</span>
            )}
          </button>

          {/* View toggle — cards/table */}
          <div className="flex items-center border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-colors ${viewMode === "table" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}
              aria-label="Table view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-2 transition-colors ${viewMode === "cards" ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}
              aria-label="Card view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

        </div>

        {/* Filter panel placeholder — P/E filters removed (no P/E data from source) */}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
            {watchlistOnly ? t("stocks.watchlist") : t("stocks.allStocks")}
          </h2>
          <span className="text-gray-600 text-xs">
            {t("stocks.showing")} {displayed.length} {t("stocks.of")} {watchlistOnly ? watchlist.size : total} {t("stocks.stocks2")}
          </span>
        </div>

        {/* Loading */}
        {isLoading && viewMode === "cards" && (
          <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-2 py-12">
            <span className="text-amber-400 text-sm font-medium">{t("stocks.failed")}</span>
            <button onClick={() => refetch()} className="text-xs text-blue-400 hover:text-blue-300 underline">
              {t("common.retry")}
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && displayed.length === 0 && (
          <EmptyState
            icon={watchlistOnly ? Star : Search}
            title={watchlistOnly ? t("stocks.watchlistEmpty") : t("stocks.noStocks")}
            description={watchlistOnly ? "Star stocks to add them to your watchlist" : undefined}
          />
        )}

        {/* Card View */}
        {viewMode === "cards" && !isLoading && !isError && displayed.length > 0 && (
          <div className="grid grid-cols-2 tablet:grid-cols-3 lg:grid-cols-4 gap-3">
            {displayed.map((stock, idx) => {
              const live = prices[stock.symbol];
              const price = live?.price ?? stock.price;
              const changePct = live?.changePercent ?? stock.changePercent ?? null;
              const isPos = (changePct ?? 0) >= 0;
              const inWatchlist = watchlist.has(stock.symbol);

              return (
                <Link key={stock.symbol} href={`/stocks/${stock.symbol}`}>
                  <div
                    className="td-hover-card bg-gray-900 rounded-xl p-3 sm:p-4 space-y-1.5 animate-card-enter-stagger"
                    style={{ "--delay": idx } as React.CSSProperties}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{stock.symbol}</span>
                      <button
                        onClick={(e) => toggleWatchlist(stock.symbol, e)}
                        className={`transition-transform hover:scale-125 ${inWatchlist ? "text-amber-400" : "text-gray-600"}`}
                      >
                        <Star size={13} fill={inWatchlist ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {price != null
                        ? new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(price)
                        : "—"}
                    </p>
                    {changePct != null && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                        {isPos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isPos ? "+" : "−"}{Math.abs(changePct).toFixed(2)}%
                      </div>
                    )}
                    {stock.name && <p className="text-gray-500 text-xs truncate">{stock.name}</p>}
                    <SignalBadge signal={stock.recommendation} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left px-4 py-3 w-8" />
                    <th className="text-left px-4 py-3">{t("common.symbol")}</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">{t("common.name")}</th>
                    <th className="text-right px-4 py-3">{t("common.price")}</th>
                    <th className="text-right px-4 py-3">{t("common.change")}</th>
                    <th className="text-center px-4 py-3 hidden lg:table-cell">{t("common.signal")}</th>
                    <th className="text-right px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading &&
                    Array.from({ length: 8 }).map((_, i) => (
                      <SkeletonRow key={i} cols={7} />
                    ))}

                  {!isLoading && !isError && displayed.map((stock) => {
                    const live = prices[stock.symbol];
                    const price = live?.price ?? stock.price;
                    const changePct = live?.changePercent ?? stock.changePercent ?? null;
                    const isPos = (changePct ?? 0) >= 0;
                    const inWatchlist = watchlist.has(stock.symbol);

                    return (
                      <tr
                        key={stock.symbol}
                        className="td-row border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => router.push(`/stocks/${stock.symbol}`)}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => toggleWatchlist(stock.symbol, e)}
                            className={`hover:scale-125 active:scale-90 transition-transform duration-150 ${
                              inWatchlist ? "text-amber-400" : "text-gray-600 hover:text-amber-400"
                            }`}
                            title={inWatchlist ? t("stocks.removeWatchlist") : t("stocks.addWatchlist")}
                          >
                            <Star size={14} fill={inWatchlist ? "currentColor" : "none"} />
                          </button>
                        </td>
                        <td className="px-4 py-3 font-bold text-white">{stock.symbol}</td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell truncate max-w-48">{stock.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {price != null
                            ? new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(price)
                            : "—"}
                          {live && <span className="block text-xs text-emerald-500 font-normal">{t("stocks.live")}</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${changePct == null ? "text-gray-500" : isPos ? "text-emerald-400" : "text-red-400"}`}>
                          {changePct != null ? (
                            <span className="flex items-center justify-end gap-1">
                              {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {isPos ? "+" : "−"}{Math.abs(changePct).toFixed(2)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <SignalBadge signal={stock.recommendation} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/stocks/${stock.symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 hover:text-white active:scale-95 transition-all duration-150"
                          >
                            {t("stocks.view")}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && !isError && !watchlistOnly && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <span className="text-gray-600 text-xs">
                  {t("stocks.page")} {page} {t("stocks.of")} {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                    {t("stocks.prev")}
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("stocks.next")}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card view pagination */}
        {viewMode === "cards" && !isLoading && !isError && !watchlistOnly && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-xs">
              {t("stocks.page")} {page} {t("stocks.of")} {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                {t("stocks.prev")}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 hover:text-white active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("stocks.next")}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}

export default function StocksPage() {
  const { mode } = useTradingMode();
  if (mode === "GOLD") return <GoldListPage />;
  return (
    <Suspense>
      <StocksPageInner />
    </Suspense>
  );
}
