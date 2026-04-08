"use client";

import { useState, useCallback } from "react";
import {
  SearchCheck, Calculator, ShieldAlert, TrendingUp, LayoutGrid,
  BarChart2, DollarSign, Trophy, Zap, Globe,
  ChevronDown, ChevronUp, Play, Loader2, Eye, EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import StockSelector from "@/components/StockSelector";
import StrategyResultCard from "@/components/StrategyResultCard";
import type { StrategyAnalysisResult } from "@/components/StrategyResultCard";
import { useStrategyAnalysis } from "@/features/strategies/hooks/useStrategyAnalysis";
import { useTradingMode } from "@/store/useTradingMode";
import GoldStrategies from "@/components/GoldStrategies";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Strategy {
  id: string;
  title: string;
  badge: string;
  icon: LucideIcon;
  tagline: string;
  prompt: string;
  color: {
    badge: string;
    icon: string;
    border: string;
  };
}

// ─── Strategy Data ────────────────────────────────────────────────────────────

const STRATEGIES: Strategy[] = [
  {
    id: "goldman-screener",
    title: "Stock Screener",
    badge: "Goldman Sachs Level",
    icon: SearchCheck,
    tagline: "Top stock picks with full equity research breakdown — P/E, moat, bull/bear targets",
    color: {
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      icon: "text-blue-500",
      border: "border-blue-200 dark:border-blue-800",
    },
    prompt: `Senior equity analyst screening framework: P/E analysis, revenue growth, debt-to-equity, dividend sustainability, competitive moat rating, bull/bear targets, risk rating, entry zones, stop-loss suggestions.`,
  },
  {
    id: "morgan-dcf",
    title: "DCF Valuation Deep Dive",
    badge: "Morgan Stanley Level",
    icon: Calculator,
    tagline: "Full discounted cash flow model — WACC, terminal value, sensitivity tables, and a clear verdict",
    color: {
      badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      icon: "text-indigo-500",
      border: "border-indigo-200 dark:border-indigo-800",
    },
    prompt: `DCF valuation methodology: 5-year revenue projection, operating margins, free cash flow, WACC, terminal value, sensitivity table, undervalued/overvalued verdict.`,
  },
  {
    id: "bridgewater-risk",
    title: "Risk Analysis Framework",
    badge: "Bridgewater Level",
    icon: ShieldAlert,
    tagline: "Ray Dalio-inspired risk assessment — correlation, drawdown, hedging, and rebalancing",
    color: {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      icon: "text-amber-500",
      border: "border-amber-200 dark:border-amber-800",
    },
    prompt: `Bridgewater risk assessment: downside risk, drawdown potential, volatility analysis, tail risk scenarios, hedging strategies, position sizing recommendations.`,
  },
  {
    id: "jpmorgan-earnings",
    title: "Earnings Breakdown",
    badge: "JPMorgan Level",
    icon: TrendingUp,
    tagline: "Earnings research — beat/miss history, key metrics, implied move, and trade recommendation",
    color: {
      badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      icon: "text-green-500",
      border: "border-green-200 dark:border-green-800",
    },
    prompt: `Earnings analysis: earnings trajectory, revenue trends, margin expansion/compression, management guidance, sector earnings cycle, earnings-based targets.`,
  },
  {
    id: "blackrock-portfolio",
    title: "Portfolio Construction",
    badge: "BlackRock Level",
    icon: LayoutGrid,
    tagline: "Portfolio construction perspective — allocation, risk-adjusted returns, and rebalancing",
    color: {
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      icon: "text-purple-500",
      border: "border-purple-200 dark:border-purple-800",
    },
    prompt: `Portfolio construction: risk-adjusted return potential, optimal position sizing, correlation benefits, rebalancing triggers, benchmark comparison.`,
  },
  {
    id: "citadel-technical",
    title: "Technical Analysis System",
    badge: "Citadel Level",
    icon: BarChart2,
    tagline: "Quant-backed technical breakdown — multi-timeframe trend, indicators, patterns, trade plan",
    color: {
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      icon: "text-orange-500",
      border: "border-orange-200 dark:border-orange-800",
    },
    prompt: `Advanced technical analysis: multi-timeframe trends, chart patterns, indicator convergence, volume analysis, momentum, precise entry/exit levels with risk-reward ratios.`,
  },
  {
    id: "harvard-dividend",
    title: "Dividend Income Strategy",
    badge: "Harvard Endowment Level",
    icon: DollarSign,
    tagline: "Dividend income perspective — yield sustainability, payout ratio, growth projections",
    color: {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      icon: "text-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    prompt: `Dividend income analysis: yield sustainability, payout ratio, dividend growth potential, cash flow coverage, earnings stability, income projections.`,
  },
  {
    id: "bain-competitive",
    title: "Competitive Advantage",
    badge: "Bain & Company Level",
    icon: Trophy,
    tagline: "Competitive landscape — moat analysis, market share trends, SWOT, sector positioning",
    color: {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      icon: "text-amber-500",
      border: "border-amber-200 dark:border-amber-800",
    },
    prompt: `Competitive strategy analysis: moat assessment (brand, cost, network, switching costs), market share trends, management quality, innovation pipeline, sector positioning.`,
  },
  {
    id: "renaissance-pattern",
    title: "Pattern Finder",
    badge: "Renaissance Technologies Level",
    icon: Zap,
    tagline: "Data-driven anomaly detection — seasonal patterns, momentum, volume, statistical edges",
    color: {
      badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      icon: "text-violet-500",
      border: "border-violet-200 dark:border-violet-800",
    },
    prompt: `Quantitative pattern analysis: seasonal patterns, momentum anomalies, mean reversion signals, volume patterns, statistical trading signals, pattern-based projections.`,
  },
  {
    id: "mckinsey-macro",
    title: "Macro Impact Assessment",
    badge: "McKinsey Global Institute Level",
    icon: Globe,
    tagline: "Macro briefing — rates, inflation, GDP, currency, sector rotation, portfolio actions",
    color: {
      badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
      icon: "text-cyan-500",
      border: "border-cyan-200 dark:border-cyan-800",
    },
    prompt: `Macroeconomic impact analysis: interest rate sensitivity, inflation impact, GDP correlation, currency exposure, sector rotation positioning, macro-adjusted targets.`,
  },
];

// ─── Strategy Card ────────────────────────────────────────────────────────────

function StrategyCard({
  strategy,
  isOpen,
  onToggle,
  isDark,
  t,
}: {
  strategy: Strategy;
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  t: (key: string) => string;
}) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [results, setResults] = useState<StrategyAnalysisResult[] | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const mutation = useStrategyAnalysis();
  const Icon = strategy.icon;

  const handleRun = useCallback(() => {
    if (selectedSymbols.length === 0) return;
    mutation.mutate(
      { strategyId: strategy.id, symbols: selectedSymbols },
      { onSuccess: (data) => setResults(data) }
    );
  }, [selectedSymbols, strategy.id, mutation]);

  const handleSymbolsChange = useCallback((symbols: string[]) => {
    setSelectedSymbols(symbols);
  }, []);

  const cardBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200";
  const labelCls = isDark ? "text-gray-400" : "text-slate-500";
  const promptBg = isDark ? "bg-gray-950 border-gray-800 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700";

  return (
    <div className={`td-hover-card rounded-xl border ${cardBg} overflow-hidden`}>
      {/* Card header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isDark ? "bg-gray-800" : "bg-slate-100"} shrink-0`}>
            <Icon size={20} className={strategy.color.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${strategy.color.badge}`}>
                {strategy.badge}
              </span>
            </div>
            <h3 className={`font-bold text-base leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {strategy.title}
            </h3>
            <p className={`text-xs mt-1 leading-relaxed ${labelCls}`}>{strategy.tagline}</p>
          </div>
        </div>

        <button
          onClick={onToggle}
          className={`mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-sm font-medium active:scale-95 transition-all duration-150 ${
            isOpen
              ? isDark
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-blue-600 hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/30 text-white"
          }`}
        >
          {isOpen ? (
            <><ChevronUp size={14} />{t("strategies.collapse")}</>
          ) : (
            <><ChevronDown size={14} />{t("strategies.expand")}</>
          )}
        </button>
      </div>

      {/* Expanded panel */}
      {isOpen && (
        <div className={`border-t ${isDark ? "border-gray-800" : "border-slate-200"} p-4 sm:p-5 space-y-4`}>
          {/* Stock Selector */}
          <div>
            <p className={`text-xs font-semibold mb-2 ${labelCls} uppercase tracking-wide`}>
              {t("strategies.selectStocks")}
            </p>
            <StockSelector
              selected={selectedSymbols}
              onChange={handleSymbolsChange}
              isDark={isDark}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={selectedSymbols.length === 0 || mutation.isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold active:scale-95 transition-all duration-150 ${
                selectedSymbols.length === 0
                  ? isDark
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : mutation.isPending
                  ? isDark
                    ? "bg-blue-900/50 text-blue-400 cursor-wait"
                    : "bg-blue-100 text-blue-500 cursor-wait"
                  : "bg-blue-600 hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/30 text-white"
              }`}
            >
              {mutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              ) : (
                <><Play size={14} /> Run Analysis ({selectedSymbols.length} {selectedSymbols.length === 1 ? "stock" : "stocks"})</>
              )}
            </button>

            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className={`px-3 py-2 rounded-lg text-sm active:scale-95 transition-all duration-150 ${
                isDark
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title={showPrompt ? "Hide methodology" : "View methodology"}
            >
              {showPrompt ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Methodology (collapsible) */}
          {showPrompt && (
            <div>
              <p className={`text-xs font-semibold mb-1.5 ${labelCls} uppercase tracking-wide`}>
                Methodology
              </p>
              <pre className={`text-xs leading-relaxed rounded-lg border p-3 whitespace-pre-wrap font-sans ${promptBg}`}>
                {strategy.prompt}
              </pre>
            </div>
          )}

          {/* Error */}
          {mutation.isError && (
            <div className={`rounded-lg p-3 text-sm ${isDark ? "bg-red-900/20 text-red-400 border border-red-800" : "bg-red-50 text-red-700 border border-red-200"}`}>
              Analysis failed: {mutation.error?.message || "Unknown error"}. Please try again.
            </div>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <div className="space-y-3">
              <p className={`text-xs font-semibold ${labelCls} uppercase tracking-wide`}>
                Analysis Results
              </p>
              {results.map((result) => (
                <StrategyResultCard
                  key={result.symbol}
                  result={result}
                  isDark={isDark}
                />
              ))}
            </div>
          )}

          {/* Loading skeletons */}
          {mutation.isPending && (
            <div className="space-y-3">
              {selectedSymbols.map((sym) => (
                <div key={sym} className={`rounded-xl border p-6 animate-pulse ${cardBg}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-6 w-16 rounded ${isDark ? "bg-gray-800" : "bg-slate-200"}`} />
                    <div className={`h-5 w-24 rounded ${isDark ? "bg-gray-800" : "bg-slate-200"}`} />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={`h-4 rounded ${isDark ? "bg-gray-800" : "bg-slate-200"}`} style={{ width: `${70 + Math.random() * 30}%` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StrategiesPage() {
  const { mode } = useTradingMode();
  if (mode === "GOLD") return <GoldStrategies />;
  return <StocksStrategiesPage />;
}

function StocksStrategiesPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            {t("strategies.title")}
          </h1>
          <p className={`mt-1.5 text-sm sm:text-base ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            {t("strategies.sub")}
          </p>
          <p className={`mt-1 text-xs ${isDark ? "text-gray-500" : "text-slate-400"}`}>
            Select a strategy, pick your stocks, and get AI-powered analysis with price levels and projections
          </p>
        </div>

        {/* Strategy grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STRATEGIES.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              isOpen={openId === strategy.id}
              onToggle={() => toggle(strategy.id)}
              isDark={isDark}
              t={t}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
