"use client";

import { useState } from "react";
import {
  SearchCheck, Calculator, ShieldAlert, TrendingUp, LayoutGrid,
  BarChart2, DollarSign, Trophy, Zap, Globe,
  ChevronDown, ChevronUp, Copy, Check, RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Strategy {
  id: string;
  title: string;
  badge: string;
  icon: LucideIcon;
  tagline: string;
  prompt: string;
  placeholderHint: string;
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
    tagline: "Top 10 stock picks with full equity research breakdown — P/E, moat, bull/bear targets",
    color: {
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      icon:  "text-blue-500",
      border: "border-blue-200 dark:border-blue-800",
    },
    placeholderHint: "Example: Moderate risk tolerance, $50,000 to invest, 3–5 year horizon, interested in technology and healthcare sectors",
    prompt: `You are a senior equity analyst at Goldman Sachs with 20 years of experience screening stocks for high-net-worth clients.

I need a complete stock screening framework for my investment goals.

Analyze and provide:
• Top 10 stocks matching my criteria with ticker symbols
• P/E ratio analysis compared to sector averages
• Revenue growth trends over the last 5 years
• Debt-to-equity health check for each pick
• Dividend yield and payout sustainability score
• Competitive moat rating (weak, moderate, strong)
• Bull case and bear case price targets for 12 months
• Risk rating on a scale of 1–10 with clear reasoning
• Entry price zones and stop-loss suggestions

Format as a professional equity research screening report with a summary table.

My investment profile:`,
  },
  {
    id: "morgan-dcf",
    title: "DCF Valuation Deep Dive",
    badge: "Morgan Stanley Level",
    icon: Calculator,
    tagline: "Full discounted cash flow model — WACC, terminal value, sensitivity tables, and a clear verdict",
    color: {
      badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      icon:  "text-indigo-500",
      border: "border-indigo-200 dark:border-indigo-800",
    },
    placeholderHint: "Example: AAPL — Apple Inc.",
    prompt: `You are a VP-level investment banker at Morgan Stanley who builds valuation models for Fortune 500 M&A deals.

I need a full discounted cash flow analysis for a specific stock.

Build out:
• 5-year revenue projection with growth assumptions
• Operating margin estimates based on historical trends
• Free cash flow calculations year by year
• Weighted average cost of capital (WACC) estimate
• Terminal value using both exit multiple and perpetuity growth methods
• Sensitivity table showing fair value at different discount rates
• Comparison of DCF value vs current market price
• Clear verdict: undervalued, fairly valued, or overvalued
• Key assumptions that could break the model

Format as an investment banking valuation memo with tables and clear math.

The stock I want valued:`,
  },
  {
    id: "bridgewater-risk",
    title: "Risk Analysis Framework",
    badge: "Bridgewater Level",
    icon: ShieldAlert,
    tagline: "Ray Dalio-inspired portfolio risk assessment — correlation, drawdown, hedging, and rebalancing",
    color: {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      icon:  "text-amber-500",
      border: "border-amber-200 dark:border-amber-800",
    },
    placeholderHint: "Example: AAPL 30%, MSFT 25%, NVDA 20%, Cash 25%. Total portfolio value: $80,000",
    prompt: `You are a senior risk analyst at Bridgewater Associates trained by Ray Dalio's principles of radical transparency in investing.

I need a complete risk assessment of my current portfolio.

Evaluate:
• Correlation analysis between my holdings
• Sector concentration risk with percentage breakdown
• Geographic exposure and currency risk factors
• Interest rate sensitivity for each position
• Recession stress test showing estimated drawdown
• Liquidity risk rating for each holding
• Single stock risk and position sizing recommendations
• Tail risk scenarios with probability estimates
• Hedging strategies to reduce my top 3 risks
• Rebalancing suggestions with specific allocation percentages

Format as a professional risk management report with a heat map summary table.

My current portfolio:`,
  },
  {
    id: "jpmorgan-earnings",
    title: "Earnings Breakdown",
    badge: "JPMorgan Level",
    icon: TrendingUp,
    tagline: "Pre-earnings research brief — beat/miss history, key metrics, implied move, and a clear trade recommendation",
    color: {
      badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      icon:  "text-green-500",
      border: "border-green-200 dark:border-green-800",
    },
    placeholderHint: "Example: Microsoft (MSFT), earnings date: January 29",
    prompt: `You are a senior equity research analyst at JPMorgan Chase who writes earnings previews for institutional investors.

I need a complete earnings analysis before a company reports.

Deliver:
• Last 4 quarters earnings vs estimates (beat or miss history)
• Revenue and EPS consensus estimates for the upcoming quarter
• Key metrics Wall Street is watching for this specific company
• Segment-by-segment revenue breakdown and trends
• Management guidance from last earnings call summarized
• Options market implied move for earnings day
• Historical stock price reaction after last 4 earnings reports
• Bull case scenario and price impact estimate
• Bear case scenario and downside risk estimate
• My recommended play: buy before, sell before, or wait

Format as a pre-earnings research brief with a decision summary at the top.

The company reporting earnings:`,
  },
  {
    id: "blackrock-portfolio",
    title: "Portfolio Construction Model",
    badge: "BlackRock Level",
    icon: LayoutGrid,
    tagline: "Custom multi-asset portfolio built from scratch — allocation, ETF picks, DCA plan, and an investment policy statement",
    color: {
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      icon:  "text-purple-500",
      border: "border-purple-200 dark:border-purple-800",
    },
    placeholderHint: "Example: Age 35, income $120k/year, $200k savings, goal: retire at 55, moderate risk, Roth IRA + taxable account",
    prompt: `You are a senior portfolio strategist at BlackRock managing multi-asset portfolios worth $500M+ for institutional clients.

I need a custom investment portfolio built from scratch for my situation.

Create:
• Exact asset allocation with percentages across stocks, bonds, alternatives
• Specific ETF or fund recommendations for each category with ticker symbols
• Core holdings vs satellite positions clearly labeled
• Expected annual return range based on historical data
• Expected maximum drawdown in a bad year
• Rebalancing schedule and trigger rules
• Tax efficiency strategy for my account type
• Dollar cost averaging plan if I invest monthly
• Benchmark to measure my performance against
• One-page investment policy statement I can follow

Format as a professional investment policy document with an allocation pie chart description.

My details:`,
  },
  {
    id: "citadel-technical",
    title: "Technical Analysis System",
    badge: "Citadel Level",
    icon: BarChart2,
    tagline: "Quant-backed technical breakdown — multi-timeframe trend, indicators, patterns, and a precise trade plan",
    color: {
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      icon:  "text-orange-500",
      border: "border-orange-200 dark:border-orange-800",
    },
    placeholderHint: "Example: TSLA — currently holding 50 shares bought at $220",
    prompt: `You are a senior quantitative trader at Citadel who combines technical analysis with statistical models to time entries and exits.

I need a full technical analysis breakdown of a stock.

Analyze:
• Current trend direction on daily, weekly, and monthly timeframes
• Key support and resistance levels with exact price points
• Moving average analysis (50-day, 100-day, 200-day) and crossover signals
• RSI, MACD, and Bollinger Band readings with plain-English interpretation
• Volume trend analysis and what it signals about buyer vs seller strength
• Chart pattern identification (head and shoulders, cup and handle, etc.)
• Fibonacci retracement levels for potential bounce zones
• Ideal entry price, stop-loss level, and profit target
• Risk-to-reward ratio for the current setup
• Confidence rating: strong buy, buy, neutral, sell, strong sell

Format as a technical analysis report card with a clear trade plan summary.

The stock to analyze:`,
  },
  {
    id: "harvard-dividend",
    title: "Dividend Income Strategy",
    badge: "Harvard Endowment Level",
    icon: DollarSign,
    tagline: "15–20 dividend picks with safety scores, DRIP compounding projections, and a ranked income blueprint",
    color: {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      icon:  "text-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    placeholderHint: "Example: $150,000 to invest, target $600/month in income, taxable brokerage account, 22% tax bracket",
    prompt: `You are the chief investment strategist for Harvard's $50B endowment fund specializing in income-generating equity strategies.

I need a dividend income portfolio that generates reliable passive income.

Build:
• 15–20 dividend stock picks with ticker symbols and current yield
• Dividend safety score for each stock (1–10 scale)
• Consecutive years of dividend growth for each pick
• Payout ratio analysis to flag any unsustainable dividends
• Monthly income projection based on my investment amount
• Sector diversification breakdown to avoid concentration
• Dividend growth rate estimate for the next 5 years
• DRIP reinvestment projection showing compounding over 10 years
• Tax implications summary for dividends in my account type
• Ranked list from safest to most aggressive picks

Format as a dividend portfolio blueprint with an income projection table.

My situation:`,
  },
  {
    id: "bain-competitive",
    title: "Competitive Advantage Analysis",
    badge: "Bain & Company Level",
    icon: Trophy,
    tagline: "Full competitive landscape — moat analysis, market share trends, SWOT, and a single best stock pick",
    color: {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      icon:  "text-amber-500",
      border: "border-amber-200 dark:border-amber-800",
    },
    placeholderHint: "Example: Cloud computing / SaaS sector",
    prompt: `You are a senior partner at Bain & Company conducting a competitive strategy analysis for a major investment fund evaluating an industry.

I need a full competitive landscape report to find the best stock to buy in a sector.

Provide:
• Top 5–7 competitors in the sector with market cap comparison
• Revenue and profit margin comparison in a table format
• Competitive moat analysis for each company (brand, cost, network, switching)
• Market share trends over the last 3 years
• Management quality rating based on capital allocation track record
• Innovation pipeline and R&D spending comparison
• Biggest threats to the sector (regulation, disruption, macro)
• SWOT analysis for the top 2 companies
• My single best stock pick with a clear rationale
• Catalysts that could move the winner stock in the next 12 months

Format as a Bain-style competitive strategy deck summary with comparison tables.

The sector I want analyzed:`,
  },
  {
    id: "renaissance-pattern",
    title: "Pattern Finder",
    badge: "Renaissance Technologies Level",
    icon: Zap,
    tagline: "Data-driven anomaly detection — seasonal patterns, insider flows, short squeeze signals, and statistical edges",
    color: {
      badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      icon:  "text-violet-500",
      border: "border-violet-200 dark:border-violet-800",
    },
    placeholderHint: "Example: NVDA — last 3 years",
    prompt: `You are a quantitative researcher at Renaissance Technologies using data-driven methods to find statistical edges in the stock market.

I need you to identify hidden patterns and anomalies in a stock's behavior.

Research:
• Seasonal patterns: best and worst months historically
• Day-of-week performance patterns if any exist
• Correlation with major market events (Fed meetings, CPI reports)
• Insider buying and selling patterns from recent filings
• Institutional ownership trend: are big funds buying or selling?
• Short interest analysis and squeeze potential
• Unusual options activity signals worth watching
• Price behavior around earnings (pre-run, post-gap patterns)
• Sector rotation signals that affect this stock
• Statistical edge summary: what gives this stock a quantifiable advantage

Format as a quantitative research memo with data tables and pattern summaries.

The stock to investigate:`,
  },
  {
    id: "mckinsey-macro",
    title: "Macro Impact Assessment",
    badge: "McKinsey Global Institute Level",
    icon: Globe,
    tagline: "Sovereign-wealth-grade macro briefing — rates, inflation, GDP, dollar, Fed policy, and a clear portfolio action plan",
    color: {
      badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
      icon:  "text-cyan-500",
      border: "border-cyan-200 dark:border-cyan-800",
    },
    placeholderHint: "Example: AAPL 40%, international ETFs 30%, bonds 20%, cash 10%. Biggest concern: stagflation",
    prompt: `You are a senior partner at McKinsey's Global Institute who advises sovereign wealth funds on how macroeconomic trends affect equity markets.

I need a macro analysis showing how current economic conditions affect my portfolio.

Analyze:
• Current interest rate environment and its impact on growth vs value stocks
• Inflation trend analysis and which sectors benefit or suffer
• GDP growth forecast and what it means for corporate earnings
• US dollar strength impact on international vs domestic holdings
• Employment data trends and consumer spending implications
• Federal Reserve policy outlook for the next 6–12 months
• Global risk factors (geopolitics, trade wars, supply chains)
• Sector rotation recommendation based on current economic cycle
• Specific portfolio adjustments I should consider right now
• Timeline: when these macro factors will most likely impact markets

Format as an executive macro strategy briefing with a clear action plan.

My current holdings:`,
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
  const [userInput, setUserInput] = useState("");
  const [copied, setCopied] = useState(false);
  const Icon = strategy.icon;

  const handleCopy = async () => {
    const fullPrompt = userInput.trim()
      ? `${strategy.prompt}\n\n${userInput.trim()}`
      : strategy.prompt;
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = fullPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardBg   = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200";
  const labelCls = isDark ? "text-gray-400" : "text-slate-500";
  const promptBg = isDark ? "bg-gray-950 border-gray-800 text-gray-300" : "bg-slate-50 border-slate-200 text-slate-700";
  const inputBg  = isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-slate-300 text-slate-800 placeholder-slate-400";

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
          {/* Instruction */}
          <p className={`text-xs ${labelCls}`}>{t("strategies.fillIn")}</p>

          {/* Full prompt (read-only) */}
          <div>
            <p className={`text-xs font-semibold mb-1.5 ${labelCls} uppercase tracking-wide`}>
              {t("strategies.promptLabel")}
            </p>
            <pre
              className={`text-xs leading-relaxed rounded-lg border p-3 whitespace-pre-wrap font-sans overflow-y-auto max-h-52 ${promptBg}`}
            >
              {strategy.prompt}
            </pre>
          </div>

          {/* User input */}
          <div>
            <p className={`text-xs font-semibold mb-1.5 ${labelCls} uppercase tracking-wide`}>
              {t("strategies.yourDetails")}
            </p>
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder={strategy.placeholderHint}
              rows={4}
              className={`w-full text-sm rounded-lg border px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-500 transition-shadow ${inputBg}`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold active:scale-95 transition-all duration-150 ${
                copied
                  ? "bg-green-600 hover:bg-green-500 hover:shadow-md hover:shadow-green-500/30 text-white"
                  : "bg-blue-600 hover:bg-blue-500 hover:shadow-md hover:shadow-blue-500/30 text-white"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t("strategies.copied") : t("strategies.copy")}
            </button>
            {userInput && (
              <button
                onClick={() => setUserInput("")}
                className={`px-3 py-2 rounded-lg text-sm active:scale-95 transition-all duration-150 ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                title={t("strategies.reset")}
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StrategiesPage() {
  const { theme }   = useTheme();
  const { t }       = useLanguage();
  const isDark      = theme === "dark";
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

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
        </div>

        {/* Strategy grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STRATEGIES.map(strategy => (
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
