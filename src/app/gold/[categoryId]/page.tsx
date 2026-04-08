"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, TrendingDown, Globe, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

interface GoldDetail {
  categoryId: string;
  nameAr: string;
  nameEn: string;
  unit: string;
  purity: string | null;
  weightGrams: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
  changePercent: number;
  lastUpdate: string | null;
  globalSpotUsd: number | null;
  spread: number | null;
  recentHistory: { buyPrice: number; sellPrice: number; globalSpotUsd: number | null; timestamp: string }[];
}

interface GoldSignal {
  categoryId: string;
  signal: string;
  confidence: string;
  score: number;
  reasons: string[];
  summary: string;
  risks: string[];
  outlook: string;
  buyVsSellSpread: number | null;
  globalCorrelation: string;
  source: string;
}

export default function GoldDetailPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const { data: detail, isLoading } = useQuery<GoldDetail>({
    queryKey: ["gold", categoryId],
    queryFn: () => apiClient.get<GoldDetail>(`/api/gold/${categoryId}`),
    refetchInterval: 60_000,
  });

  const { data: signal, isLoading: signalLoading } = useQuery<GoldSignal>({
    queryKey: ["gold", "signal", categoryId],
    queryFn: () => apiClient.get<GoldSignal>(`/api/gold/${categoryId}/signal`),
    enabled: !!detail,
  });

  const { data: history } = useQuery<{ buyPrice: number; sellPrice: number; timestamp: string }[]>({
    queryKey: ["gold", "history", categoryId],
    queryFn: () => apiClient.get(`/api/gold/${categoryId}/history`),
    enabled: !!detail,
  });

  const name = detail ? (isAr ? detail.nameAr : detail.nameEn) : categoryId;
  const chartData = (history ?? detail?.recentHistory ?? [])
    .map((h) => ({
      date: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      buy: h.buyPrice,
      sell: h.sellPrice,
    }))
    .reverse();

  const signalColor: Record<string, string> = {
    "Hot": "text-emerald-400 bg-emerald-900/40",
    "Warming Up": "text-blue-400 bg-blue-900/40",
    "Neutral": "text-gray-400 bg-gray-800",
    "Cooling Down": "text-orange-400 bg-orange-900/40",
    "Cold": "text-red-400 bg-red-900/40",
  };

  return (
    <AppShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-gray-800 rounded w-64" />
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        ) : detail ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 rounded-xl">
                  <Coins size={28} className="text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{name}</h1>
                  <p className="text-gray-500 text-sm">
                    {detail.purity && `${(parseFloat(detail.purity) * 100).toFixed(1)}% purity`}
                    {detail.weightGrams && ` · ${detail.weightGrams}g`}
                    {` · per ${detail.unit}`}
                  </p>
                </div>
              </div>
              {detail.changePercent !== 0 && (
                <span className={`text-sm font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                  detail.changePercent >= 0 ? "text-emerald-400 bg-emerald-900/30" : "text-red-400 bg-red-900/30"
                }`}>
                  {detail.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {detail.changePercent >= 0 ? "+" : "−"}{Math.abs(detail.changePercent).toFixed(2)}%
                </span>
              )}
            </div>

            {/* Price Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PriceCard label={isAr ? "سعر البيع" : "Sell Price"} value={detail.sellPrice} unit="EGP" accent />
              <PriceCard label={isAr ? "سعر الشراء" : "Buy Price"} value={detail.buyPrice} unit="EGP" />
              <PriceCard label={isAr ? "هامش الربح" : "Spread"} value={detail.spread != null ? `${detail.spread}%` : null} />
              <PriceCard
                label="XAU/USD"
                value={detail.globalSpotUsd != null ? `$${detail.globalSpotUsd.toLocaleString()}` : null}
                icon={<Globe size={14} className="text-blue-400" />}
              />
            </div>

            {/* Price Chart */}
            {chartData.length > 1 && (
              <div className="bg-gray-900 rounded-xl p-4 sm:p-5">
                <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
                  {isAr ? "تاريخ الأسعار" : "Price History"}
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#9ca3af" }}
                    />
                    <Line type="monotone" dataKey="sell" stroke="#f59e0b" strokeWidth={2} dot={false} name={isAr ? "بيع" : "Sell"} />
                    <Line type="monotone" dataKey="buy" stroke="#d97706" strokeWidth={1.5} dot={false} name={isAr ? "شراء" : "Buy"} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Signal */}
            {signalLoading ? (
              <div className="bg-gray-900 rounded-xl p-5 animate-pulse h-40" />
            ) : signal ? (
              <div className="bg-gray-900 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-widest">
                    {isAr ? "تحليل ذكي" : "AI Analysis"}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${signalColor[signal.signal] ?? signalColor["Neutral"]}`}>
                      {signal.signal}
                    </span>
                    <span className="text-gray-600 text-xs">{signal.confidence} confidence</span>
                  </div>
                </div>

                <p className="text-white text-sm leading-relaxed">{signal.summary}</p>

                {signal.reasons.length > 0 && (
                  <div>
                    <h3 className="text-gray-500 text-xs font-semibold mb-2">{isAr ? "الأسباب" : "Key Factors"}</h3>
                    <ul className="space-y-1">
                      {signal.reasons.map((r, i) => (
                        <li key={i} className="text-gray-300 text-xs flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">-</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {signal.globalCorrelation && (
                  <div>
                    <h3 className="text-gray-500 text-xs font-semibold mb-1 flex items-center gap-1">
                      <Globe size={12} /> {isAr ? "علاقة بالسعر العالمي" : "Global Correlation"}
                    </h3>
                    <p className="text-gray-400 text-xs">{signal.globalCorrelation}</p>
                  </div>
                )}

                {signal.outlook && (
                  <div>
                    <h3 className="text-gray-500 text-xs font-semibold mb-1">{isAr ? "التوقعات" : "Outlook"}</h3>
                    <p className="text-gray-300 text-sm">{signal.outlook}</p>
                  </div>
                )}

                {signal.risks.length > 0 && (
                  <div>
                    <h3 className="text-gray-500 text-xs font-semibold mb-1 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-amber-500" /> {isAr ? "المخاطر" : "Risks"}
                    </h3>
                    <ul className="space-y-0.5">
                      {signal.risks.map((r, i) => (
                        <li key={i} className="text-gray-400 text-xs">- {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-gray-700 text-xs text-right">
                  {signal.source === "ai" ? "Powered by AI" : "Trend-based analysis"}
                </p>
              </div>
            ) : null}

            {detail.lastUpdate && (
              <p className="text-gray-700 text-xs text-center">
                Last updated: {new Date(detail.lastUpdate).toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">
            Category not found
          </div>
        )}
      </main>
    </AppShell>
  );
}

function PriceCard({
  label,
  value,
  unit,
  accent,
  icon,
}: {
  label: string;
  value: number | string | null;
  unit?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 sm:p-4">
      <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">{icon}{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${accent ? "text-amber-400" : "text-white"}`}>
        {value != null ? (
          <>
            {typeof value === "number" ? value.toLocaleString() : value}
            {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
          </>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </p>
    </div>
  );
}
