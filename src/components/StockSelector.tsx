"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Search, Plus } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";

interface StockSelectorProps {
  selected: string[];
  onChange: (symbols: string[]) => void;
  isDark: boolean;
}

interface StockSearchResult {
  symbol: string;
  name: string;
}

export default function StockSelector({ selected, onChange, isDark }: StockSelectorProps) {
  const { data: portfolio } = usePortfolio();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-add portfolio stocks on first load
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && portfolio?.positions?.length) {
      const portfolioSymbols = portfolio.positions.map((p) => p.symbol);
      if (selected.length === 0) {
        onChange(portfolioSymbols);
      }
      setInitialized(true);
    }
  }, [portfolio, initialized, selected.length, onChange]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get<{ stocks: StockSearchResult[] }>(
        `/api/stocks?search=${encodeURIComponent(query)}&limit=8`
      );
      setResults(res.stocks.filter((s) => !selected.includes(s.symbol)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const addSymbol = (symbol: string) => {
    if (!selected.includes(symbol)) {
      onChange([...selected, symbol]);
    }
    setSearch("");
    setResults([]);
    setShowDropdown(false);
  };

  const removeSymbol = (symbol: string) => {
    onChange(selected.filter((s) => s !== symbol));
  };

  const chipBg = isDark ? "bg-blue-900/40 text-blue-300 border-blue-800" : "bg-blue-50 text-blue-700 border-blue-200";
  const inputBg = isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-slate-300 text-slate-800 placeholder-slate-400";
  const dropdownBg = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200";
  const hoverBg = isDark ? "hover:bg-gray-700" : "hover:bg-slate-50";

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((symbol) => (
            <span
              key={symbol}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${chipBg}`}
            >
              {symbol}
              <button
                onClick={() => removeSymbol(symbol)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${inputBg}`}>
          <Search size={14} className="opacity-50 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search stocks to add..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && (search.length > 0) && (
          <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border shadow-xl max-h-48 overflow-y-auto ${dropdownBg}`}>
            {loading ? (
              <div className={`px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Searching...
              </div>
            ) : results.length > 0 ? (
              results.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => addSymbol(stock.symbol)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${hoverBg} transition-colors`}
                >
                  <Plus size={12} className="opacity-50 shrink-0" />
                  <span className="font-medium">{stock.symbol}</span>
                  <span className={`text-xs truncate ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    {stock.name}
                  </span>
                </button>
              ))
            ) : (
              <div className={`px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                No stocks found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
