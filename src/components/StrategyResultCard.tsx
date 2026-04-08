"use client";

import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield, ArrowDown, ArrowUp } from "lucide-react";

export interface StrategyAnalysisResult {
  symbol: string;
  strategyId: string;
  signal: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
  confidence: "High" | "Medium" | "Low";
  currentPrice: number;
  stopLoss: number;
  supports: [number, number, number];
  resistances: [number, number, number];
  projection: {
    months3: { low: number; mid: number; high: number };
    months6: { low: number; mid: number; high: number };
  };
  recommendation: string;
  reasons: string[];
  risks: string[];
  source: "ai" | "technical-fallback";
  aiProvider?: string;
}

const SIGNAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Strong Buy":  { bg: "bg-emerald-900/40", text: "text-emerald-300", border: "border-emerald-700" },
  Buy:           { bg: "bg-green-900/40", text: "text-green-300", border: "border-green-700" },
  Neutral:       { bg: "bg-gray-800/40", text: "text-gray-300", border: "border-gray-600" },
  Sell:          { bg: "bg-amber-900/40", text: "text-amber-400", border: "border-amber-700" },
  "Strong Sell": { bg: "bg-red-900/40", text: "text-red-400", border: "border-red-700" },
};

const SIGNAL_COLORS_LIGHT: Record<string, { bg: string; text: string; border: string }> = {
  "Strong Buy":  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Buy:           { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  Neutral:       { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  Sell:          { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Strong Sell": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function PriceLevel({
  label,
  price,
  currentPrice,
  type,
  isDark,
}: {
  label: string;
  price: number;
  currentPrice: number;
  type: "support" | "resistance" | "stop-loss" | "current";
  isDark: boolean;
}) {
  const pct = ((price - currentPrice) / currentPrice * 100).toFixed(1);
  const pctStr = Number(pct) > 0 ? `+${pct}%` : `${pct}%`;

  const colorMap = {
    support: isDark ? "text-blue-400" : "text-blue-600",
    resistance: isDark ? "text-purple-400" : "text-purple-600",
    "stop-loss": isDark ? "text-red-400" : "text-red-600",
    current: isDark ? "text-white" : "text-slate-900",
  };

  const iconMap = {
    support: <Shield size={12} />,
    resistance: <Target size={12} />,
    "stop-loss": <AlertTriangle size={12} />,
    current: <ArrowUp size={12} />,
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${colorMap[type]}`}>
        {iconMap[type]}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colorMap[type]}`}>
          {price.toFixed(2)} EGP
        </span>
        {type !== "current" && (
          <span className={`text-[10px] ${Number(pct) > 0 ? (isDark ? "text-green-400" : "text-green-600") : (isDark ? "text-red-400" : "text-red-600")}`}>
            {pctStr}
          </span>
        )}
      </div>
    </div>
  );
}

function ProjectionBar({
  label,
  data,
  currentPrice,
  isDark,
}: {
  label: string;
  data: { low: number; mid: number; high: number };
  currentPrice: number;
  isDark: boolean;
}) {
  const lowPct = ((data.low - currentPrice) / currentPrice * 100).toFixed(1);
  const midPct = ((data.mid - currentPrice) / currentPrice * 100).toFixed(1);
  const highPct = ((data.high - currentPrice) / currentPrice * 100).toFixed(1);

  const barBg = isDark ? "bg-gray-800" : "bg-slate-100";
  const labelCls = isDark ? "text-gray-400" : "text-slate-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${labelCls}`}>{label}</span>
      </div>
      <div className={`rounded-lg p-2.5 ${barBg}`}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="text-center">
            <div className={`font-medium ${isDark ? "text-red-400" : "text-red-600"}`}>
              <ArrowDown size={10} className="inline" /> Bear
            </div>
            <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{data.low.toFixed(2)}</div>
            <div className={isDark ? "text-red-400" : "text-red-600"}>{lowPct}%</div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
              Base
            </div>
            <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{data.mid.toFixed(2)}</div>
            <div className={Number(midPct) >= 0 ? (isDark ? "text-green-400" : "text-green-600") : (isDark ? "text-red-400" : "text-red-600")}>{Number(midPct) > 0 ? `+${midPct}` : midPct}%</div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
              <ArrowUp size={10} className="inline" /> Bull
            </div>
            <div className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{data.high.toFixed(2)}</div>
            <div className={isDark ? "text-green-400" : "text-green-600"}>+{highPct}%</div>
          </div>
        </div>
        {/* Visual bar */}
        <div className="mt-2 relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-60" />
      </div>
    </div>
  );
}

export default function StrategyResultCard({
  result,
  isDark,
}: {
  result: StrategyAnalysisResult;
  isDark: boolean;
}) {
  const colors = isDark ? SIGNAL_COLORS : SIGNAL_COLORS_LIGHT;
  const signalStyle = colors[result.signal] ?? colors.Neutral;
  const cardBg = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-slate-200";
  const labelCls = isDark ? "text-gray-400" : "text-slate-500";
  const textCls = isDark ? "text-gray-300" : "text-slate-700";
  const divider = isDark ? "border-gray-800" : "border-slate-100";

  return (
    <div className={`rounded-xl border ${cardBg} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
            {result.symbol}
          </span>
          <span className={`text-xs ${labelCls}`}>
            {result.currentPrice.toFixed(2)} EGP
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${signalStyle.bg} ${signalStyle.text} ${signalStyle.border}`}>
            {result.signal}
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            result.confidence === "High"
              ? isDark ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-700"
              : result.confidence === "Medium"
              ? isDark ? "bg-yellow-900/30 text-yellow-400" : "bg-yellow-50 text-yellow-700"
              : isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"
          }`}>
            {result.confidence}
          </span>
          {result.aiProvider ? (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
              {result.aiProvider}
            </span>
          ) : result.source === "technical-fallback" ? (
            <span className={`px-1.5 py-0.5 rounded text-[9px] ${isDark ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-500"}`}>
              Fallback
            </span>
          ) : null}
        </div>
      </div>

      <div className={`border-t ${divider}`} />

      {/* Price Levels */}
      <div className="p-4 space-y-0.5">
        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${labelCls}`}>
          Key Price Levels
        </p>
        <PriceLevel label="Resistance 3" price={result.resistances[2]} currentPrice={result.currentPrice} type="resistance" isDark={isDark} />
        <PriceLevel label="Resistance 2" price={result.resistances[1]} currentPrice={result.currentPrice} type="resistance" isDark={isDark} />
        <PriceLevel label="Resistance 1" price={result.resistances[0]} currentPrice={result.currentPrice} type="resistance" isDark={isDark} />
        <div className={`border-t border-dashed my-1 ${divider}`} />
        <PriceLevel label="Current Price" price={result.currentPrice} currentPrice={result.currentPrice} type="current" isDark={isDark} />
        <div className={`border-t border-dashed my-1 ${divider}`} />
        <PriceLevel label="Support 1" price={result.supports[0]} currentPrice={result.currentPrice} type="support" isDark={isDark} />
        <PriceLevel label="Support 2" price={result.supports[1]} currentPrice={result.currentPrice} type="support" isDark={isDark} />
        <PriceLevel label="Support 3" price={result.supports[2]} currentPrice={result.currentPrice} type="support" isDark={isDark} />
        <div className={`border-t border-dashed my-1 ${divider}`} />
        <PriceLevel label="Stop Loss" price={result.stopLoss} currentPrice={result.currentPrice} type="stop-loss" isDark={isDark} />
      </div>

      <div className={`border-t ${divider}`} />

      {/* Projections */}
      <div className="p-4 space-y-3">
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${labelCls}`}>
          Price Projection
        </p>
        <ProjectionBar label="3 Months" data={result.projection.months3} currentPrice={result.currentPrice} isDark={isDark} />
        <ProjectionBar label="6 Months" data={result.projection.months6} currentPrice={result.currentPrice} isDark={isDark} />
      </div>

      <div className={`border-t ${divider}`} />

      {/* Recommendation */}
      <div className="p-4">
        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${labelCls}`}>
          Recommendation
        </p>
        <p className={`text-sm leading-relaxed ${textCls}`}>
          {result.recommendation}
        </p>
      </div>

      {/* Reasons */}
      {result.reasons.length > 0 && (
        <>
          <div className={`border-t ${divider}`} />
          <div className="p-4">
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${labelCls}`}>
              Key Reasons
            </p>
            <ul className="space-y-1">
              {result.reasons.map((reason, i) => (
                <li key={i} className={`flex gap-2 text-xs ${textCls}`}>
                  <TrendingUp size={12} className="shrink-0 mt-0.5 text-blue-500" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Risks */}
      {result.risks.length > 0 && (
        <>
          <div className={`border-t ${divider}`} />
          <div className="p-4">
            <p className={`text-[10px] font-semibold uppercase tracking-wide mb-2 ${labelCls}`}>
              Risks
            </p>
            <ul className="space-y-1">
              {result.risks.map((risk, i) => (
                <li key={i} className={`flex gap-2 text-xs ${textCls}`}>
                  <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
