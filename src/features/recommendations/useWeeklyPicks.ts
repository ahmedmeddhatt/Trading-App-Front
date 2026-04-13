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
}

export interface WeeklyPicksData {
  generatedAt: string;
  expiresAt: string;
  marketCondition: string;
  picks: WeeklyPick[];
  top3Summary: string;
  allocationAdvice: string;
}

export function useWeeklyPicks() {
  const { lang } = useLanguage();
  return useQuery<WeeklyPicksData>({
    queryKey: ["stocks", "weekly-picks", lang],
    queryFn: () => apiClient.get<WeeklyPicksData>(`/api/stocks/weekly-picks?lang=${lang}`),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
}
