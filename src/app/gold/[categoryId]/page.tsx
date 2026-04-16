"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, TrendingDown, Globe, AlertTriangle, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AppShell from "@/components/AppShell";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";
import { usePortfolio } from "@/features/portfolio/hooks/usePortfolio";
import TradeForm from "@/features/trade/components/TradeForm";

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
  const { lang, t } = useLanguage();
  const isAr = lang === "ar";

  const { data: detail, isLoading, isFetching, refetch } = useQuery<GoldDetail>({
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

  const { data: goldPortfolio } = useQuery<{ positions: { symbol: string; quantity: number }[] }>({
    queryKey: ["portfolio", "GOLD"],
    queryFn: () => apiClient.get(`/api/portfolio?assetType=GOLD`),
  });
  const goldPosition = goldPortfolio?.positions.find((p) => p.symbol === categoryId);
  const ownedQty = goldPosition ? parseFloat(String(goldPosition.quantity)) : 0;
  const unitLabel = isAr ? "جرام" : "grams";

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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-gray-800 rounded w-64" />
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        ) : detail ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500/15 border border-amber-500/25 rounded-2xl flex items-center justify-center">
                  <Coins size={26} className="text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold text-white">{name}</h1>
                    {detail.changePercent !== 0 && (
                      <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-md ${
                        detail.changePercent >= 0 ? "text-emerald-400 bg-emerald-500/15" : "text-red-400 bg-red-500/15"
                      }`}>
                        {detail.changePercent >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {detail.changePercent >= 0 ? "+" : "−"}{Math.abs(detail.changePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {detail.purity && `${(parseFloat(detail.purity) * 100).toFixed(1)}% purity`}
                    {detail.weightGrams && ` · ${detail.weightGrams}g`}
                    {` · per ${detail.unit}`}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  try { await fetch("/api/gold/refresh", { method: "POST" }); } catch {}
                  refetch();
                }}
                disabled={isFetching}
                className="w-9 h-9 flex items-center justify-center text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-colors disabled:opacity-50"
                title="Refresh prices"
              >
                <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Price Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PriceCard label={isAr ? "سعر البيع" : "Sell Price"} value={detail.sellPrice} unit="EGP" accent="amber" />
              <PriceCard label={isAr ? "سعر الشراء" : "Buy Price"} value={detail.buyPrice} unit="EGP" accent="white" />
              <PriceCard label={isAr ? "هامش الربح" : "Spread"} value={detail.spread != null ? `${detail.spread}%` : null} />
              <PriceCard
                label="XAU/USD"
                value={detail.globalSpotUsd != null ? `$${detail.globalSpotUsd.toLocaleString()}` : null}
                icon={<Globe size={13} className="text-blue-400" />}
                accent="blue"
              />
            </div>

            {/* Price Chart */}
            {chartData.length > 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-gray-300 text-sm font-semibold">
                    {isAr ? "تاريخ الأسعار" : "Price History"}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 bg-amber-400 inline-block rounded" />
                      {isAr ? "بيع" : "Sell"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-0.5 bg-amber-600 inline-block rounded" style={{ borderTop: "2px dashed #d97706", background: "none" }} />
                      {isAr ? "شراء" : "Buy"}
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4b5563" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#4b5563" }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#9ca3af" }}
                      itemStyle={{ color: "#e5e7eb" }}
                    />
                    <Line type="monotone" dataKey="sell" stroke="#f59e0b" strokeWidth={2.5} dot={false} name={isAr ? "بيع" : "Sell"} />
                    <Line type="monotone" dataKey="buy" stroke="#d97706" strokeWidth={1.5} dot={false} name={isAr ? "شراء" : "Buy"} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Signal */}
            {signalLoading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-40" />
            ) : signal ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
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
          </div>

          {/* Right column: Trade form */}
          <div className="lg:col-span-1">
            <TradeForm
              symbol={categoryId}
              currentPrice={detail.sellPrice ?? null}
              ownedQuantity={ownedQty}
              assetType="GOLD"
              unit={unitLabel}
            />
          </div>
          </div>
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
  accent?: "amber" | "white" | "blue";
  icon?: React.ReactNode;
}) {
  const valueColor =
    accent === "amber" ? "text-amber-400" :
    accent === "blue" ? "text-blue-400" :
    "text-white";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 sm:p-4 hover:border-gray-700 transition-colors">
      <p className="text-gray-500 text-xs mb-2 flex items-center gap-1 font-medium">{icon}{label}</p>
      <p className={`text-lg sm:text-xl font-bold ${valueColor} leading-tight`}>
        {value != null ? (
          <>
            {typeof value === "number" ? value.toLocaleString() : value}
            {unit && <span className="text-xs text-gray-500 ml-1 font-normal">{unit}</span>}
          </>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </p>
    </div>
  );
}
