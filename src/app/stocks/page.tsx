"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  LogOut,
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StockItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  sector?: string;
  marketCap?: number;
  pe?: number;
  signal?: string;
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

// ─── Signal Badge ─────────────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<string, string> = {
  "Strong Buy": "bg-emerald-900 text-emerald-300",
  "Buy": "bg-green-900 text-green-300",
  "Neutral": "bg-gray-800 text-gray-400",
  "Sell": "bg-red-900 text-red-400",
  "Strong Sell": "bg-red-950 text-red-500",
};

function SignalBadge({ signal }: { signal?: string }) {
  if (!signal) return <span className="text-gray-700">—</span>;
  const cls = SIGNAL_STYLES[signal] ?? "bg-gray-800 text-gray-400";
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cls}`}>
      {signal}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-800 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-800 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

function StocksPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [sector, setSector] = useState(searchParams.get("sector") ?? "");
  const [minPE, setMinPE] = useState(searchParams.get("minPE") ?? "");
  const [maxPE, setMaxPE] = useState(searchParams.get("maxPE") ?? "");
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));
  const [showFilters, setShowFilters] = useState(false);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [watchlistOnly, setWatchlistOnly] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset page on new search
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Load watchlist from localStorage
  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (sector) params.set("sector", sector);
    if (minPE) params.set("minPE", minPE);
    if (maxPE) params.set("maxPE", maxPE);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(qs ? `/stocks?${qs}` : "/stocks", { scroll: false });
  }, [debouncedSearch, sector, minPE, maxPE, page, router]);

  // Build query string for API
  const apiQuery = new URLSearchParams();
  if (debouncedSearch) apiQuery.set("search", debouncedSearch);
  if (sector) apiQuery.set("sector", sector);
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
  const displayed = watchlistOnly
    ? stocks.filter((s) => watchlist.has(s.symbol))
    : stocks;

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

  const handleLogout = async () => {
    await apiClient.post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
  };

  const clearFilters = () => {
    setSearch("");
    setSector("");
    setMinPE("");
    setMaxPE("");
    setPage(1);
  };
  const hasFilters = !!(search || sector || minPE || maxPE);

  // Unique sectors from data
  const sectors = [...new Set(stocks.map((s) => s.sector).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="text-blue-400" size={20} />
          <span className="font-bold text-lg tracking-tight">TradeDesk</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/portfolio"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Portfolio
          </Link>
          <Link href="/stocks" className="text-white font-medium">
            Stocks
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              placeholder="Search symbol or name…"
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
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              showFilters
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasFilters && (
              <span className="bg-blue-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">
                !
              </span>
            )}
          </button>

          <button
            onClick={() => setWatchlistOnly((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors border ${
              watchlistOnly
                ? "bg-amber-600 border-amber-600 text-white"
                : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            <Star size={14} />
            Watchlist
            {watchlist.size > 0 && (
              <span className="text-xs text-gray-400">({watchlist.size})</span>
            )}
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-300 underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-gray-500 text-xs block mb-1">Sector</label>
              <select
                value={sector}
                onChange={(e) => { setSector(e.target.value); setPage(1); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              >
                <option value="">All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s as string}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Min P/E</label>
              <input
                type="number"
                placeholder="0"
                value={minPE}
                onChange={(e) => { setMinPE(e.target.value); setPage(1); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1">Max P/E</label>
              <input
                type="number"
                placeholder="100"
                value={maxPE}
                onChange={(e) => { setMaxPE(e.target.value); setPage(1); }}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Reset filters
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
              {watchlistOnly ? "Watchlist" : "All Stocks"}
            </h2>
            <span className="text-gray-600 text-xs">
              Showing {displayed.length} of {watchlistOnly ? watchlist.size : total} stocks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-3 w-8" />
                  <th className="text-left px-4 py-3">Symbol</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Name</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-right px-4 py-3">Change %</th>
                  <th className="text-right px-4 py-3 hidden lg:table-cell">Sector</th>
                  <th className="text-right px-4 py-3 hidden lg:table-cell">P/E</th>
                  <th className="text-center px-4 py-3 hidden lg:table-cell">Signal</th>
                  <th className="text-right px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}

                {isError && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-12 text-red-400 text-sm"
                    >
                      Failed to load stocks.{" "}
                      <button onClick={() => refetch()} className="underline hover:text-red-300">
                        Retry
                      </button>
                    </td>
                  </tr>
                )}

                {!isLoading && !isError && displayed.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-12 text-gray-600 text-sm"
                    >
                      {watchlistOnly
                        ? "Your watchlist is empty. Star stocks to add them."
                        : "No stocks found."}
                    </td>
                  </tr>
                )}

                {displayed.map((stock) => {
                  const live = prices[stock.symbol];
                  const price = live?.price ?? stock.price;
                  const changePct =
                    live?.changePercent ?? stock.changePercent ?? null;
                  const isPos = (changePct ?? 0) >= 0;
                  const inWatchlist = watchlist.has(stock.symbol);

                  return (
                    <tr
                      key={stock.symbol}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/stocks/${stock.symbol}`)}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => toggleWatchlist(stock.symbol, e)}
                          className={`transition-colors ${
                            inWatchlist
                              ? "text-amber-400"
                              : "text-gray-700 hover:text-gray-400"
                          }`}
                          title={
                            inWatchlist
                              ? "Remove from watchlist"
                              : "Add to watchlist"
                          }
                        >
                          <Star
                            size={14}
                            fill={inWatchlist ? "currentColor" : "none"}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 font-bold text-white">
                        {stock.symbol}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden md:table-cell truncate max-w-48">
                        {stock.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {price != null
                          ? new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 2 }).format(price)
                          : "—"}
                        {live && (
                          <span className="block text-xs text-emerald-500 font-normal">
                            live
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          changePct == null
                            ? "text-gray-500"
                            : isPos
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {changePct != null ? (
                          <span className="flex items-center justify-end gap-1">
                            {isPos ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {isPos ? "+" : ""}
                            {changePct.toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">
                        {stock.sector ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">
                        {stock.pe != null ? stock.pe.toFixed(1) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <SignalBadge signal={stock.signal} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/stocks/${stock.symbol}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 hover:text-white transition-colors"
                        >
                          View
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
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StocksPage() {
  return (
    <Suspense>
      <StocksPageInner />
    </Suspense>
  );
}
