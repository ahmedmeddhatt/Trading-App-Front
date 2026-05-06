import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useLanguage } from "@/context/LanguageContext";

export interface WeeklyPick {
  rank: number;
  company: string;
  symbol: string;
  sector: string;
  currentPrice: number;
  status: string;
  support: { s1: number; s2: number };
  resistance: { r1: number; r2: number };
  trend: string;
  pattern: string | null;
  indicators: {
    rsi: number;
    rsiStatus: string;
    macd: string;
    volume: string;
    ma20: number;
    ma50: number;
  };
  entry: number;
  targets: { t1: number; t2: number };
  stopLoss: number;
  riskReward: string;
  timeframe: string;
  confidence: number;
  catalysts: string;
  risks: string;
  // Daily multi-provider mode: each pick is stamped with the AI that produced it.
  // Optional for back-compat with old weekly payloads that only had wrapper-level attribution.
  aiProvider?: string;
  aiModel?: string;
}

export type ProviderResult =
  | { status: "ok"; provider: string; model: string; summary: string; pickCount: number }
  | { status: "failed"; provider: string; model?: string; error: string };

export interface WeeklyPicksData {
  generatedAt: string;
  expiresAt: string;
  aiProvider?: string;
  aiModel?: string;
  marketCondition: string;
  picks: WeeklyPick[];
  top3Summary: string;
  allocationAdvice: string;
  // Per-provider breakdown (daily mode). Absent on legacy weekly payloads.
  providers?: ProviderResult[];
}

export function useWeeklyPicks() {
  const { lang } = useLanguage();
  return useQuery<WeeklyPicksData>({
    queryKey: ["stocks", "weekly-picks", lang],
    queryFn: () => apiClient.get<WeeklyPicksData>(`/api/stocks/weekly-picks?lang=${lang}`),
    // Daily payload — 30 min stale time is plenty (no need to hold an hour).
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}
