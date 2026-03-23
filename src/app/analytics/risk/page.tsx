"use client";

import { useQuery } from "@tanstack/react-query";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, AlertTriangle, Shield, TrendingDown } from "lucide-react";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { formatEGP, formatPct } from "@/lib/tradeCalcs";
import { useLanguage } from "@/context/LanguageContext";

// Raw shape as returned by the backend (all numeric fields may be strings)
interface RiskData {
  concentrationRisk: {
    hhi: string | number;
    diversificationScore: string | number;
    top3Percent?: string | number;
  };
  positionRisk: {
    symbol: string;
    marketValue: string | number;
    portfolioPercent?: string | number;
    portfolioPct?: string | number;
    capitalAtRisk?: string | number;
    unrealizedPnL?: string | number;
  }[];
  drawdown: {
    maxDrawdownPct: string | number;
    maxDrawdownAbs?: string | number;
    maxDrawdownValue?: string | number;
    drawdownPeriod?: { peak: string; trough: string } | null;
    timeline?: { date: string; value: number; drawdown: number }[];
  };
  sectorRisk: {
    sector: string;
    percent?: string | number;
    weight?: string | number;
    hhi_contribution?: string | number;
    hhiContribution?: string | number;
  }[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function riskLevel(hhi: number): { labelKey: "risk.lowRisk" | "risk.moderateRisk" | "risk.highRisk"; color: string } {
  if (hhi < 1000) return { labelKey: "risk.lowRisk", color: "text-emerald-400" };
  if (hhi < 2500) return { labelKey: "risk.moderateRisk", color: "text-amber-400" };
  return { labelKey: "risk.highRisk", color: "text-red-400" };
}

export default function RiskPage() {
  const { t, dir } = useLanguage();
  const { data, isLoading } = useQuery({
    queryKey: ["risk-analytics"],
    queryFn: () => apiClient.get<RiskData>("/api/analytics/risk"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-gray-500" size={32} />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto px-4 py-8 text-center text-gray-500">{t("risk.noData")}</div>
      </AppShell>
    );
  }

  const { concentrationRisk: _cr, positionRisk: _pr, drawdown } = data;

  // Normalize all numeric fields — backend returns strings and uses different field names
  const concentrationRisk = {
    hhi: parseFloat(String(_cr.hhi)),
    diversificationScore: parseFloat(String(_cr.diversificationScore)),
    top3Weight: parseFloat(String(_cr.top3Percent ?? 0)),
  };
  const positionRisk = _pr.map((p) => {
    const pct = parseFloat(String(p.portfolioPercent ?? p.portfolioPct ?? 0));
    return {
      symbol: p.symbol,
      marketValue: parseFloat(String(p.marketValue)),
      portfolioPct: pct,
      isConcentrated: pct > 25,
    };
  });
  const sectorRisk = (data.sectorRisk ?? []).map((s) => ({
    sector: s.sector,
    weight: parseFloat(String(s.percent ?? s.weight ?? 0)),
    hhiContribution: parseFloat(String(s.hhi_contribution ?? s.hhiContribution ?? 0)),
  }));

  const drawdownPct = parseFloat(String(data.drawdown.maxDrawdownPct));
  const drawdownAbs = parseFloat(String(data.drawdown.maxDrawdownAbs ?? data.drawdown.maxDrawdownValue ?? 0));
  const drawdownTimeline = data.drawdown.timeline ?? [];

  const { labelKey: riskLblKey, color: riskColor } = riskLevel(concentrationRisk.hhi);

  // Pie data: top positions + others
  const top5 = [...positionRisk].sort((a, b) => b.portfolioPct - a.portfolioPct).slice(0, 5);
  const othersWeight = positionRisk.reduce((s, p) => s + p.portfolioPct, 0) - top5.reduce((s, p) => s + p.portfolioPct, 0);
  const pieData = [
    ...top5.map((p) => ({ name: p.symbol, value: parseFloat(p.portfolioPct.toFixed(2)) })),
    ...(othersWeight > 0.5 ? [{ name: "Others", value: parseFloat(othersWeight.toFixed(2)) }] : []),
  ];

  const minVal = Math.min(...drawdownTimeline.map((d) => d.value), 0);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{t("risk.title")}</h1>
          <p className="text-gray-500 text-sm">{t("risk.sub")}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <p className="text-gray-400 text-sm">{t("risk.hhi")}</p>
            </div>
            <p className="text-3xl font-bold text-white">{concentrationRisk.hhi.toFixed(0)}</p>
            <p className={`text-sm mt-1 font-medium ${riskColor}`}>{t(riskLblKey)}</p>
            <p className="text-xs text-gray-600 mt-1">{t("risk.hhiScale")}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-blue-400" />
              <p className="text-gray-400 text-sm">{t("risk.diversification")}</p>
            </div>
            <p className="text-3xl font-bold text-white">{concentrationRisk.diversificationScore.toFixed(1)}</p>
            <div className="mt-2 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${concentrationRisk.diversificationScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{t("risk.divScale")}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-400" />
              <p className="text-gray-400 text-sm">{t("risk.maxDrawdown")}</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{isNaN(drawdownPct) ? "0.00%" : `${drawdownPct.toFixed(2)}%`}</p>
            <p className="text-sm text-gray-500 mt-1">{formatEGP(drawdownAbs)} {t("risk.peakToTrough")}</p>
            {data.drawdown.drawdownPeriod && (
              <p className="text-xs text-gray-600 mt-1">
                {new Date(data.drawdown.drawdownPeriod.peak).toLocaleDateString()} → {new Date(data.drawdown.drawdownPeriod.trough).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Concentration Pie + Position Risk Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">{t("risk.concentration")}</h2>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value.toFixed(1)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      stroke={i < top5.length && top5[i].isConcentrated ? "#fbbf24" : "transparent"}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(2)}%`, t("risk.weight")]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            </div>
            {top5.some((p) => p.isConcentrated) && (
              <p className="text-xs text-amber-400 text-center mt-1 flex items-center justify-center gap-1">
                <AlertTriangle size={12} /> {t("risk.concentratedWarning")}
              </p>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400">{t("risk.positionTable")}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="px-4 py-2 text-left">{t("common.symbol")}</th>
                  <th className="px-4 py-2 text-left">{t("common.marketValue")}</th>
                  <th className="px-4 py-2 text-left">{t("risk.portfolioPct")}</th>
                  <th className="px-4 py-2 text-left">{t("risk.riskHeader")}</th>
                </tr>
              </thead>
              <tbody>
                {positionRisk.sort((a, b) => b.portfolioPct - a.portfolioPct).map((p) => (
                  <tr key={p.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 font-mono font-bold">{p.symbol}</td>
                    <td className="px-4 py-2">{formatEGP(p.marketValue)}</td>
                    <td className="px-4 py-2">{p.portfolioPct.toFixed(1)}%</td>
                    <td className="px-4 py-2">
                      {p.isConcentrated ? (
                        <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded font-medium">{t("risk.highRisk")}</span>
                      ) : (
                        <span className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded font-medium">{t("risk.okRisk")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drawdown Chart */}
        {drawdownTimeline.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-400 mb-4">{t("risk.drawdownChart")}</h2>
            <div dir="ltr">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={drawdownTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickFormatter={(v, i) => (i % Math.ceil(drawdownTimeline.length / 6) === 0 ? new Date(v).toLocaleDateString() : "")} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={[minVal * 0.99, "auto"]} orientation={dir === "rtl" ? "right" : "left"} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(v: unknown, name: unknown) => {
                    const n = v as number;
                    return [name === "drawdown" ? `${n.toFixed(2)}%` : formatEGP(n), name === "drawdown" ? t("risk.drawdown") : t("dashboard.portfolioVal")];
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f620" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef444420" strokeWidth={1.5} dot={false} yAxisId="right" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sector Risk */}
        {sectorRisk.length > 0 && (
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400">{t("risk.sectorRisk")}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="px-4 py-2 text-left">{t("common.sector")}</th>
                  <th className="px-4 py-2 text-left">{t("risk.weight")}</th>
                  <th className="px-4 py-2 text-left">{t("risk.hhiContribution")}</th>
                  <th className="px-4 py-2 text-left">{t("risk.exposureBar")}</th>
                </tr>
              </thead>
              <tbody>
                {sectorRisk.sort((a, b) => b.weight - a.weight).map((s) => (
                  <tr key={s.sector} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-white">{s.sector}</td>
                    <td className="px-4 py-2">{s.weight.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-gray-400">{s.hhiContribution.toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <div className="bg-gray-800 rounded-full h-1.5 w-32">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, s.weight)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
